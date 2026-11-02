import assert from 'node:assert/strict';
import test, { afterEach, beforeEach, mock } from 'node:test';
import { TizenAVPlayAdapter } from './TizenAVPlayAdapter';
import type { PlayerAdapterEventHandlers } from '../model/types';

/** A playing AVPlay session whose seekTo calls stay pending until resolved by the test. */
function createSeekingAdapter() {
  const seeks: Array<{ ms: number; ok: () => void; fail: (e: unknown) => void }> = [];
  const timeUpdates: number[] = [];
  const errors: string[] = [];
  let nativeTimeMs = 100_000;
  let listener: { oncurrentplaytime?: (ms: number) => void } = {};
  const avplay = {
    getState: () => 'PLAYING',
    getCurrentTime: () => nativeTimeMs,
    seekTo: (ms: number, ok: () => void, fail: (e: unknown) => void) => { seeks.push({ ms, ok, fail }); },
  };
  const adapter = new TizenAVPlayAdapter();
  const internals = adapter as unknown as {
    avplay: unknown;
    durationSeconds: number;
    lastTimeUpdateAt: number;
    createListener: () => typeof listener;
  };
  internals.avplay = avplay;
  internals.durationSeconds = 3600;
  internals.lastTimeUpdateAt = 1; // playback has started reporting
  const handlers: Pick<PlayerAdapterEventHandlers, 'onTimeUpdate' | 'onError'> = {
    onTimeUpdate: (t) => { timeUpdates.push(t); },
    onError: (e) => { errors.push(e.code); },
  };
  adapter.setEventHandlers(handlers as PlayerAdapterEventHandlers);
  listener = internals.createListener();
  return {
    adapter,
    internals,
    seeks,
    timeUpdates,
    errors,
    setNativeTime: (ms: number) => { nativeTimeMs = ms; },
    tick: (ms: number) => listener.oncurrentplaytime?.(ms),
    /** Lands every pending seek (and any it queues), clearing their safety timers. */
    settleAll: () => { for (let i = 0; i < seeks.length; i++) seeks[i].ok(); },
  };
}

// Seeks during playback are coalesced on a timer (SEEK_COALESCE_MS).
beforeEach(() => mock.timers.enable({ apis: ['setTimeout'] }));
afterEach(() => mock.timers.reset());
const COALESCE = 500;

test('a burst of presses becomes one native seek, to the newest target', () => {
  const { adapter, seeks, timeUpdates } = createSeekingAdapter();
  adapter.seek(110);
  mock.timers.tick(200);
  adapter.seek(120);
  mock.timers.tick(200);
  adapter.seek(130);
  assert.equal(seeks.length, 0, 'no blocking seekTo while presses keep coming');
  assert.deepEqual(timeUpdates, [110, 120, 130], 'the seek bar follows every press');
  mock.timers.tick(COALESCE);
  assert.deepEqual(seeks.map((s) => s.ms), [130_000]);
  seeks[0].ok();
});

test('a deliberate jump (skip intro) seeks at once, even mid-playback', () => {
  const { adapter, seeks } = createSeekingAdapter();
  adapter.seek(95, { immediate: true });
  assert.deepEqual(seeks.map((s) => s.ms), [95_000]);
  seeks[0].ok();
});

test('presses during a running seek wait for it, then only the newest target runs', () => {
  const { adapter, seeks, internals } = createSeekingAdapter();
  internals.lastTimeUpdateAt = 0; // before playback reports: seeks run at once
  adapter.seek(110);
  internals.lastTimeUpdateAt = 1;
  adapter.seek(120);
  adapter.seek(130);
  assert.deepEqual(seeks.map((s) => s.ms), [110_000], 'no seekTo while one is running');

  seeks[0].ok();
  assert.deepEqual(seeks.map((s) => s.ms), [110_000, 130_000], 'the middle target is skipped');
  seeks[1].ok();
  assert.equal(seeks.length, 2);
});

test('relative presses chain from the requested position, not the pre-seek clock', () => {
  const { adapter, settleAll } = createSeekingAdapter();
  adapter.seek(110);
  assert.equal(adapter.getCurrentTime(), 110, 'mid-seek, the native clock (100s) is not used');
  adapter.seek(adapter.getCurrentTime() + 10);
  assert.equal(adapter.getCurrentTime(), 120);
  settleAll();
});

test('a failed seek is not a playback error and does not block later seeks', () => {
  const { adapter, seeks, errors } = createSeekingAdapter();
  adapter.seek(110);
  mock.timers.tick(COALESCE);
  seeks[0].fail(new Error('PLAYER_ERROR_INVALID_OPERATION'));
  assert.deepEqual(errors, [], 'no error → no engine recovery reload');
  adapter.seek(200);
  mock.timers.tick(COALESCE);
  assert.deepEqual(seeks.map((s) => s.ms), [110_000, 200_000]);
  seeks[1].ok();
});

test('a resume seek that fails before playback is retried once playback reports', () => {
  const { adapter, internals, seeks, tick } = createSeekingAdapter();
  internals.lastTimeUpdateAt = 0; // load-time resume: playback hasn't reported yet
  adapter.seek(174.66);
  assert.deepEqual(seeks.map((s) => s.ms), [174_660], 'runs at once, before play()');
  seeks[0].fail(new Error('PLAYER_ERROR_SEEK_FAILED'));
  tick(0); // playback started from 0
  assert.deepEqual(seeks.map((s) => s.ms), [174_660, 174_660], 'retried');
  seeks[1].fail(new Error('PLAYER_ERROR_SEEK_FAILED'));
  tick(500);
  assert.equal(seeks.length, 2, 'only once');
});

test('the seek bar shows the target at once and ignores stale positions mid-seek', () => {
  const { adapter, seeks, timeUpdates, tick } = createSeekingAdapter();
  adapter.seek(110);
  assert.deepEqual(timeUpdates, [110]);
  tick(100_200); // AVPlay still reporting the old position
  assert.deepEqual(timeUpdates, [110]);
  mock.timers.tick(COALESCE);
  seeks[0].ok();
  assert.equal(adapter.getCurrentTime() > 0, true);
});

test('time updates reach the UI at most every 250ms', () => {
  const { timeUpdates, tick } = createSeekingAdapter();
  const realNow = Date.now;
  let now = 1_000_000;
  Date.now = () => now;
  try {
    tick(1000);
    now += 100;
    tick(1100);
    now += 200;
    tick(1300);
    assert.deepEqual(timeUpdates, [1, 1.3]);
  } finally {
    Date.now = realNow;
  }
});

test('re-applying the current speed makes no native call (it blocked ~4s on start)', () => {
  const calls: number[] = [];
  const adapter = new TizenAVPlayAdapter();
  (adapter as unknown as { avplay: unknown }).avplay = { setSpeed: (s: number) => { calls.push(s); } };
  assert.equal(adapter.setPlaybackSpeed(1), true);
  assert.deepEqual(calls, [], 'a fresh session is already at 1x');
  assert.equal(adapter.setPlaybackSpeed(2), true);
  assert.equal(adapter.setPlaybackSpeed(2), true);
  assert.equal(adapter.setPlaybackSpeed(1), true);
  assert.deepEqual(calls, [2, 1]);
});

test('a slow prepare that is still buffering is not abandoned; a silent one is', async () => {
  mock.timers.reset();
  mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const adapter = new TizenAVPlayAdapter();
  const internals = adapter as unknown as {
    prepareAsync: (a: unknown) => Promise<void>;
    createListener: () => { onbufferingprogress?: (p: number) => void };
  };
  const neverReports = { prepareAsync: () => undefined };
  let outcome = 'pending';
  internals.prepareAsync(neverReports).then(() => { outcome = 'resolved'; }, () => { outcome = 'timeout'; });
  const listener = internals.createListener();

  mock.timers.tick(25_000);
  listener.onbufferingprogress?.(40); // network is slow, but data is arriving
  mock.timers.tick(25_000);
  await Promise.resolve();
  assert.equal(outcome, 'pending', '50s in, still buffering: keep waiting');

  mock.timers.tick(6_000); // 31s without any buffering event
  await Promise.resolve();
  assert.equal(outcome, 'timeout');
});

import assert from 'node:assert/strict';
import test from 'node:test';
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
    seeks,
    timeUpdates,
    errors,
    setNativeTime: (ms: number) => { nativeTimeMs = ms; },
    tick: (ms: number) => listener.oncurrentplaytime?.(ms),
    /** Lands every pending seek (and any it queues), clearing their safety timers. */
    settleAll: () => { for (let i = 0; i < seeks.length; i++) seeks[i].ok(); },
  };
}

test('a burst of seeks runs one native seek at a time, then only the newest target', () => {
  const { adapter, seeks } = createSeekingAdapter();
  adapter.seek(110);
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
  seeks[0].fail(new Error('PLAYER_ERROR_INVALID_OPERATION'));
  assert.deepEqual(errors, [], 'no error → no engine recovery reload');
  adapter.seek(200);
  assert.deepEqual(seeks.map((s) => s.ms), [110_000, 200_000]);
  seeks[1].ok();
});

test('the seek bar shows the target at once and ignores stale positions mid-seek', () => {
  const { adapter, seeks, timeUpdates, tick } = createSeekingAdapter();
  adapter.seek(110);
  assert.deepEqual(timeUpdates, [110]);
  tick(100_200); // AVPlay still reporting the old position
  assert.deepEqual(timeUpdates, [110]);
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

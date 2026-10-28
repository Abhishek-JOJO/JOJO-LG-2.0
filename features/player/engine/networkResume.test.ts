import assert from 'node:assert/strict';
import test from 'node:test';
import { PlayerEngine } from './PlayerEngine';
import type { PlayerError, VideoDetails } from '../model/types';

// The engine listens for the browser's online/offline events on window and
// reads navigator.onLine — stand both in for Node.
const network = { onLine: true };
Object.defineProperty(globalThis, 'navigator', { value: network, configurable: true });
Object.assign(globalThis, { window: new EventTarget() });

function goOffline() {
  network.onLine = false;
  window.dispatchEvent(new Event('offline'));
}

function goOnline() {
  network.onLine = true;
  window.dispatchEvent(new Event('online'));
}

/** An adapter session that loses its clock when it dies, like AVPlay after a network error. */
function createFakeAdapter() {
  const adapter = {
    paused: true,
    plays: 0,
    pauses: 0,
    play() { adapter.paused = false; adapter.plays += 1; },
    pause() { adapter.paused = true; adapter.pauses += 1; },
    isPaused: () => adapter.paused,
    getCurrentTime: () => 0,
    destroy: async () => undefined,
  };
  return adapter;
}

async function createEngine() {
  const engine = new PlayerEngine();
  const startTimes: Array<number | undefined> = [];
  const adapters: ReturnType<typeof createFakeAdapter>[] = [];
  const internals = engine as unknown as {
    loadAdapter: () => Promise<void>;
    loadOptions: { startTime?: number };
    adapter: unknown;
    createAdapterEventHandlers: () => { onTimeUpdate(t: number, d: number, b: number): void };
    handleError: (error: PlayerError) => Promise<void>;
  };
  internals.loadAdapter = async () => {
    startTimes.push(internals.loadOptions.startTime);
    const adapter = createFakeAdapter();
    adapters.push(adapter);
    internals.adapter = adapter;
  };
  const videoEl = { pause() {}, removeAttribute() {}, load() {} } as unknown as HTMLVideoElement;
  await engine.initialize(videoEl, { contentId: 'movie-1' } as VideoDetails);
  return { engine, internals, startTimes, adapters };
}

const networkError: PlayerError = {
  code: 'PLAYER_ERROR_CONNECTION_FAILED',
  message: 'connection failed',
  adapter: 'tizen-avplay',
  isRecoverable: true,
  originalError: null,
};

test('a network drop pauses playback and resumes it in place when the connection returns', async () => {
  const { engine, startTimes, adapters } = await createEngine();
  engine.play();
  assert.equal(adapters[0].paused, false);

  goOffline();
  assert.equal(adapters[0].paused, true, 'paused under the offline screen');

  goOnline();
  assert.equal(adapters[0].paused, false, 'resumed on the same session');
  assert.equal(startTimes.length, 1, 'no reload needed');
  await engine.destroy();
});

test('a user pause survives the network coming back', async () => {
  const { engine, adapters } = await createEngine();
  engine.play();
  engine.pause();
  goOffline();
  goOnline();
  assert.equal(adapters[0].paused, true);
  await engine.destroy();
});

test('playback that dies while offline reopens at its last position once back online', async () => {
  const { engine, internals, startTimes, adapters } = await createEngine();
  const errors: unknown[] = [];
  let bufferEnded = false;
  engine.eventBus.on('ERROR', (e) => errors.push(e));
  engine.eventBus.on('BUFFER_END', () => { bufferEnded = true; });

  engine.play();
  internals.createAdapterEventHandlers().onTimeUpdate(754, 3600, 800);
  goOffline();
  await internals.handleError(networkError);
  assert.equal(startTimes.length, 1, 'no reload attempts while there is no network');
  assert.deepEqual(errors, [], 'no error screen');

  goOnline();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(startTimes, [undefined, 754], 'reopened at the position it stopped');
  assert.equal(adapters[1].plays, 1, 'and playing again');
  assert.equal(bufferEnded, true);
  await engine.destroy();
});

test('a destroyed engine ignores network events', async () => {
  const { engine, adapters } = await createEngine();
  engine.play();
  await engine.destroy();
  goOffline();
  goOnline();
  assert.equal(adapters[0].pauses, 0);
});

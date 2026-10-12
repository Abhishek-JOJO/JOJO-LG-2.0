import assert from 'node:assert/strict';
import test from 'node:test';
import { ShakaAdapter } from './ShakaAdapter';
import { TizenAVPlayAdapter } from './TizenAVPlayAdapter';

test('Shaka exposes the complete browser player control set', () => {
  const capabilities = new ShakaAdapter().getCapabilities();

  assert.deepEqual(capabilities.playbackSpeeds, [0.5, 0.75, 1, 1.25, 1.5, 2]);
  assert.equal(capabilities.qualitySelection, 'manual');
  assert.equal(capabilities.volumeControl, 'level');
  assert.equal(capabilities.captionStyling, true);
});

test('Tizen AVPlay exposes only controls it can safely apply', () => {
  const adapter = new TizenAVPlayAdapter();
  const capabilities = adapter.getCapabilities();

  assert.deepEqual(capabilities.playbackSpeeds, [1, 2]);
  assert.equal(capabilities.qualitySelection, 'auto-only');
  assert.equal(capabilities.volumeControl, 'mute-only');
  assert.equal(capabilities.captionStyling, false);
  assert.equal(adapter.setPlaybackSpeed(0.5), false);
});

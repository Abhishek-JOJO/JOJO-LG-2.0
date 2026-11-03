import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchHlsVariants } from './TizenAVPlayAdapter';

const MASTER = [
  '#EXTM3U',
  '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",LANGUAGE="eng",NAME="eng",DEFAULT=YES,URI="audio/eng/audio_eng.m3u8"',
  '#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=884736,BANDWIDTH=983040,CODECS="avc1.4d401e,mp4a.40.2",RESOLUTION=640x360,AUDIO="audio"',
  '640x360_264/stream_640x360_264.m3u8',
  '#EXT-X-I-FRAME-STREAM-INF:BANDWIDTH=220000,RESOLUTION=640x360,URI="640x360_264/iframes_640x360_264.m3u8"',
  '#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=2451456,BANDWIDTH=2723840,CODECS="avc1.644028,mp4a.40.2",RESOLUTION=1280x720,AUDIO="audio"',
  '1280x720_264/stream_1280x720_264.m3u8',
].join('\n');

test('reads one variant per resolution from BANDWIDTH (not AVERAGE-BANDWIDTH), highest first', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => ({ text: async () => MASTER })) as unknown as typeof fetch;
  try {
    assert.deepEqual(await fetchHlsVariants('https://cdn/show/hls/master.m3u8'), [
      { height: 720, bandwidth: 2723840, url: 'https://cdn/show/hls/1280x720_264/stream_1280x720_264.m3u8' },
      { height: 360, bandwidth: 983040, url: 'https://cdn/show/hls/640x360_264/stream_640x360_264.m3u8' },
    ]);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('an unreadable manifest gives no variants (Auto only)', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error('offline'); }) as unknown as typeof fetch;
  try {
    assert.deepEqual(await fetchHlsVariants('https://cdn/master.m3u8'), []);
  } finally {
    globalThis.fetch = realFetch;
  }
});

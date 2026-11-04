/**
 * Generates public/images/hero-shade.png: HeroCarouselCard's two text shades
 * (the left linear gradient and the bottom-left radial vignette) baked into
 * one black + alpha image for Samsung Tizen. Run after changing either
 * gradient in HeroCarouselCard:
 *
 *   npx tsx scripts/gen-hero-shade.ts
 *
 * Why: the TV rasterizes in software, and computing the two gradients per
 * pixel was half the cost of redrawing the hero on every navbar tab switch.
 * Drawn 1:1, the PNG is a plain alpha blit.
 *
 * Geometry is Chromium's for the hero card at the TV's 1920x1080 viewport
 * (1840 x 842.39). An "ellipse at 0% 100%" farthest-corner gradient on a W x H
 * box has radii W*sqrt(2) x H*sqrt(2).
 */
import { writeFileSync } from "node:fs";
import { deflateSync, crc32 } from "node:zlib";

const WIDTH = 1840;
const HEIGHT = 843; // card is 842.39 tall; the extra row is clipped
const CARD_HEIGHT = 842.39;
const LINEAR_WIDTH = 772.8; // xl:w-[42%]
const RADIAL_WIDTH = 1380; // w-[75%]
const RADIAL_HEIGHT = 631.78; // h-[75%]
const RADIUS_X = RADIAL_WIDTH * Math.SQRT2;
const RADIUS_Y = RADIAL_HEIGHT * Math.SQRT2;

/** bg-gradient-to-r from-black/80 via-black/40 to-transparent */
function linearAlpha(x: number): number {
  if (x >= LINEAR_WIDTH) return 0;
  const t = x / LINEAR_WIDTH;
  return t <= 0.5 ? 0.8 - 0.4 * (t / 0.5) : 0.4 - 0.4 * ((t - 0.5) / 0.5);
}

/** radial-gradient(ellipse at 0% 100%, .85 0%, .55 40%, 0 72%) */
function radialAlpha(x: number, y: number): number {
  if (x >= RADIAL_WIDTH || y < CARD_HEIGHT - RADIAL_HEIGHT) return 0;
  const t = Math.hypot(x / RADIUS_X, (CARD_HEIGHT - y) / RADIUS_Y);
  if (t <= 0.4) return 0.85 - 0.3 * (t / 0.4);
  if (t <= 0.72) return 0.55 - 0.55 * ((t - 0.4) / 0.32);
  return 0;
}

// Grayscale + alpha rows, each led by filter byte 0. Black over black composes
// as 1 - (1 - a1)(1 - a2).
const rowBytes = 1 + WIDTH * 2;
const raw = Buffer.alloc(rowBytes * HEIGHT);
for (let j = 0; j < HEIGHT; j++) {
  for (let i = 0; i < WIDTH; i++) {
    const x = i + 0.5;
    const y = j + 0.5;
    const alpha = 1 - (1 - linearAlpha(x)) * (1 - radialAlpha(x, y));
    raw[j * rowBytes + 1 + i * 2 + 1] = Math.round(alpha * 255);
  }
}

function chunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

const header = Buffer.alloc(13);
header.writeUInt32BE(WIDTH, 0);
header.writeUInt32BE(HEIGHT, 4);
header[8] = 8; // bit depth
header[9] = 4; // grayscale + alpha
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", header),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);
writeFileSync("public/images/hero-shade.png", png);
console.log(`public/images/hero-shade.png: ${png.length} bytes`);

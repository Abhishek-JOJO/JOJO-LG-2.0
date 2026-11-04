import assert from "node:assert/strict";
import test from "node:test";

import { getPortraitGridImages } from "./cardImageUrls";
import { mapApiRailItem } from "./contentRail.mapper";

// Image orders follow the Android app's Landscape2 rail config.
const img = (type: string, ratio: number) => ({ ratio_id: ratio, url: `${type}-r${ratio}.webp` });

const asset = {
  asset_id: 7,
  asset_title: "Test",
  title_image: "title.webp",
  poster: [img("poster", 1), img("poster", 3), img("poster", 4)],
  landscape: [img("landscape", 1)],
  portrait: [img("portrait", 2), img("portrait", 4)],
};

test("portrait cards: POSTER 4, 3, 1, LANDSCAPE, then portrait art last", () => {
  const item = mapApiRailItem({ details: asset }, 0, 16);
  assert.deepEqual(item.portraitFallbackImages, [
    "poster-r4.webp",
    "poster-r3.webp",
    "poster-r1.webp",
    "landscape-r1.webp",
    "portrait-r4.webp",
    "portrait-r2.webp",
  ]);
  // Poster art has no title printed on it: the card draws the title logo.
  assert.equal(item.hasPortraitArt, false);
});

test("landscape cards: POSTER 4, POSTER 1, LANDSCAPE, POSTER 3, PORTRAIT 2", () => {
  const item = mapApiRailItem({ details: asset }, 0, 16);
  assert.deepEqual(item.landscapeFallbackImages, [
    "poster-r4.webp",
    "poster-r1.webp",
    "landscape-r1.webp",
    "poster-r3.webp",
    "portrait-r2.webp",
  ]);
});

test("portrait art shown only as a last resort, and then without the logo", () => {
  const item = mapApiRailItem({ details: { ...asset, poster: [], landscape: [] } }, 0, 16);
  assert.equal(item.portraitFallbackImages?.[0], "portrait-r4.webp");
  assert.equal(item.hasPortraitArt, true);
});

test("grids (search, genre): real portrait poster first, then the rail order", () => {
  const item = mapApiRailItem({ details: asset }, 0, 16);
  assert.deepEqual(getPortraitGridImages(item).slice(0, 3), ["portrait-r4.webp", "portrait-r2.webp", "poster-r4.webp"]);
});

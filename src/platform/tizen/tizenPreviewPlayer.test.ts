import assert from "node:assert/strict";
import test from "node:test";
import type { SamsungAVPlayListener, SamsungAVPlayState } from "../types";
import { computeCoverRect, startTizenPreview, stopTizenPreview } from "./tizenPreviewPlayer";

// Minimal DOM + AVPlay stand-ins: just the surface tizenPreviewPlayer touches.
class FakeElement {
  private classes = new Set<string>();
  classList = {
    add: (name: string) => void this.classes.add(name),
    remove: (name: string) => void this.classes.delete(name),
    contains: (name: string) => this.classes.has(name),
  };
  children: FakeElement[] = [];
  style: Record<string, string> = {};
  type = "";
  tabIndex = 0;

  constructor(
    public parentElement: FakeElement | null = null,
    private rect = { left: 0, top: 0, right: 1920, bottom: 1080 },
  ) {}

  prepend(child: FakeElement) {
    child.parentElement = this;
    this.children.unshift(child);
  }

  remove() {
    if (!this.parentElement) return;
    this.parentElement.children = this.parentElement.children.filter((c) => c !== this);
    this.parentElement = null;
  }

  getBoundingClientRect() {
    return { ...this.rect, width: this.rect.right - this.rect.left, height: this.rect.bottom - this.rect.top };
  }
}

function createFakeAVPlay() {
  const calls: string[] = [];
  const rects: number[][] = [];
  const prepares: Array<{ success: () => void; failure: (e: unknown) => void }> = [];
  let state: SamsungAVPlayState = "NONE";
  let listener: SamsungAVPlayListener = {};
  return {
    calls,
    rects,
    get listener() {
      return listener;
    },
    /** Resolves the n-th prepareAsync call (default: the latest). */
    finishPrepare(n = prepares.length - 1) {
      state = "READY";
      prepares[n].success();
    },
    failPrepare(n = prepares.length - 1) {
      prepares[n].failure(new Error("boom"));
    },
    api: {
      open: () => { calls.push("open"); state = "IDLE"; },
      close: () => { calls.push("close"); state = "NONE"; },
      prepare: () => { state = "READY"; },
      prepareAsync: (success: () => void, failure: (e: unknown) => void) => { prepares.push({ success, failure }); },
      play: () => { calls.push("play"); state = "PLAYING"; },
      pause: () => { calls.push("pause"); state = "PAUSED"; },
      stop: () => { calls.push("stop"); state = "IDLE"; },
      getState: () => state,
      getDuration: () => 30000,
      setListener: (l: SamsungAVPlayListener) => { listener = l; },
      setDisplayRect: (...rect: number[]) => { rects.push(rect); },
      setDisplayMethod: () => undefined,
      getTotalTrackInfo: () => tracks,
    },
  };
}

// What the fake stream reports once prepared (default: 16:9).
let tracks: Array<{ index: number; type: string; extra_info: string }> = [];

function setup(
  viewport = { width: 1920, height: 1080 },
  box = { left: 100, top: 50, right: 1060, bottom: 590 },
) {
  const avplay = createFakeAVPlay();
  const html = new FakeElement();
  const page = new FakeElement(html);
  const targetEl = new FakeElement(page, box);
  const backdrop = new FakeElement();
  // The ambient tint: document-positioned, here scrolled 100px up.
  const ambient = new FakeElement(null, { left: 0, top: -100, right: 1920, bottom: 980 });
  const windowListeners = new Map<string, Set<() => void>>();
  tracks = [];
  Object.assign(globalThis, {
    window: {
      webapis: { avplay: avplay.api },
      innerWidth: viewport.width,
      innerHeight: viewport.height,
      addEventListener: (type: string, fn: () => void) => {
        if (!windowListeners.has(type)) windowListeners.set(type, new Set());
        windowListeners.get(type)!.add(fn);
      },
      removeEventListener: (type: string, fn: () => void) => windowListeners.get(type)?.delete(fn),
    },
    document: {
      hidden: false,
      addEventListener: () => undefined,
      createElement: () => new FakeElement(),
      querySelectorAll: (selector: string) => (selector === "[data-tizen-video-backdrop]" ? [backdrop, ambient] : []),
    },
  });
  const fireWindow = (type: string) => windowListeners.get(type)?.forEach((fn) => fn());
  return { avplay, html, page, targetEl, backdrop, ambient, fireWindow, target: targetEl as unknown as HTMLElement };
}

const PASSTHROUGH = "tizen-video-passthrough";

test("page goes see-through only once playback has advanced, and is restored on stop", () => {
  const { avplay, html, page, targetEl, target } = setup();
  let readyCount = 0;
  const preview = startTizenPreview({ url: "https://cdn/p.m3u8", target, onReady: () => { readyCount += 1; } });

  assert.equal(targetEl.children.length, 1, "AVPlay <object> host is attached to the target");
  avplay.finishPrepare();
  assert.ok(avplay.calls.includes("play"));
  assert.equal(page.classList.contains(PASSTHROUGH), false, "nothing changes before frames show");

  avplay.listener.oncurrentplaytime?.(40);
  assert.equal(readyCount, 0, "the first report can precede the first visible frame");
  avplay.listener.oncurrentplaytime?.(300);
  avplay.listener.oncurrentplaytime?.(600);
  assert.equal(readyCount, 1);
  for (const el of [targetEl, page, html]) assert.ok(el.classList.contains(PASSTHROUGH));

  preview.stop();
  for (const el of [targetEl, page, html]) assert.equal(el.classList.contains(PASSTHROUGH), false);
  assert.equal(targetEl.children.length, 0, "<object> host removed");
  stopTizenPreview(); // flush the deferred native close
  assert.deepEqual(avplay.calls.slice(-2), ["stop", "close"]);
});

test("a stop defers the native close past the keypress; reusing AVPlay flushes it first", async () => {
  const { avplay, target } = setup();
  const preview = startTizenPreview({ url: "https://cdn/a.m3u8", target });
  avplay.finishPrepare();
  preview.stop();
  assert.equal(avplay.calls.includes("close"), false, "no blocking native close inside the stop");

  startTizenPreview({ url: "https://cdn/b.m3u8", target });
  const opens = avplay.calls.map((c, i) => [c, i] as const).filter(([c]) => c === "open").map(([, i]) => i);
  const closeIndex = avplay.calls.indexOf("close");
  assert.ok(closeIndex > opens[0] && closeIndex < opens[1], "A is closed before B opens");

  stopTizenPreview();
  const closesBefore = avplay.calls.filter((c) => c === "close").length;
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(avplay.calls.filter((c) => c === "close").length, closesBefore, "the scheduled close never runs twice");
});

test("a deferred close is flushed for the movie player even with no preview active", async () => {
  const { avplay, target } = setup();
  const preview = startTizenPreview({ url: "https://cdn/p.m3u8", target });
  avplay.finishPrepare();
  preview.stop();

  // TizenAVPlayAdapter.load(): stopTizenPreview(), then open its own session.
  stopTizenPreview();
  assert.equal(avplay.calls.at(-1), "close");
  avplay.api.open();
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(avplay.calls.at(-1), "open", "no late close lands on the movie's session");
});

test("a new preview supersedes the previous one, whose late callbacks are ignored", () => {
  const { avplay, target } = setup();
  const stops: string[] = [];
  startTizenPreview({ url: "https://cdn/a.m3u8", target, onStop: (reason) => stops.push(reason) });
  const preview = startTizenPreview({ url: "https://cdn/b.m3u8", target });
  assert.deepEqual(stops, ["superseded"]);

  avplay.finishPrepare(0); // the superseded preview's prepare resolving late
  assert.equal(avplay.calls.includes("play"), false);
  avplay.finishPrepare(1);
  assert.equal(avplay.calls.filter((c) => c === "play").length, 1);
  preview.stop();
});

test("stopTizenPreview hands AVPlay back to the movie player", () => {
  const { avplay, target } = setup();
  let reason = "";
  startTizenPreview({ url: "https://cdn/p.m3u8", target, onStop: (r) => { reason = r; } });
  avplay.finishPrepare();
  stopTizenPreview();
  assert.equal(reason, "superseded");
  assert.equal(avplay.calls.at(-1), "close");

  const callCount = avplay.calls.length;
  stopTizenPreview(); // nothing left to stop
  assert.equal(avplay.calls.length, callCount);
});

test("a failed prepare closes the session and reports an error", () => {
  const { avplay, target } = setup();
  let reason = "";
  startTizenPreview({ url: "https://cdn/p.m3u8", target, onStop: (r) => { reason = r; } });
  avplay.failPrepare();
  assert.equal(reason, "error");
  assert.equal(avplay.calls.includes("play"), false);
  stopTizenPreview();
  assert.equal(avplay.calls.at(-1), "close");
});

test("the home hero's video covers the whole box instead of leaving a black strip", () => {
  // Hero: 1840x842 at (40,114). A 16:9 video covering it is 1840x1035 —
  // full width, overhanging vertically, nudged up to stay on screen.
  const rect = computeCoverRect({ left: 40, top: 114, width: 1840, height: 842 }, 16 / 9, { width: 1920, height: 1080 });
  assert.deepEqual(
    [rect.left, rect.top, Math.round(rect.width), Math.round(rect.height)],
    [40, 45, 1840, 1035],
  );
});

test("an exact 16:9 box (spotlight card) gets exactly its own rect", () => {
  const rect = computeCoverRect({ left: 64, top: 160, width: 871, height: 490 }, 871 / 490, { width: 1920, height: 1080 });
  assert.deepEqual([rect.left, rect.top, Math.round(rect.width), Math.round(rect.height)], [64, 160, 871, 490]);
});

test("the rect follows the stream's real aspect once prepared, in logical 1920x1080 units", () => {
  // 920x421 box at (20,57) on a 960x540 viewport (half the TV's logical size).
  const { avplay, target } = setup({ width: 960, height: 540 }, { left: 20, top: 57, right: 940, bottom: 478 });
  const preview = startTizenPreview({ url: "https://cdn/p.m3u8", target });
  // Before prepare, 16:9: 920x517.5, nudged up to y=22.5 to stay on screen; x2.
  assert.deepEqual(avplay.rects[0], [40, 45, 1840, 1035]);

  // The stream is 2.4:1: covering 421px of height needs 1010px, wider than
  // the screen, so it is capped at 960x400 and centred; x2.
  tracks = [{ index: 0, type: "VIDEO", extra_info: JSON.stringify({ Width: "1920", Height: "800" }) }];
  avplay.finishPrepare();
  assert.deepEqual(avplay.rects.at(-1), [0, 114, 1920, 800]);
  preview.stop();
});

test("the page backdrop and ambient tint open only over the box, and close again on stop", () => {
  const { avplay, backdrop, ambient, target } = setup(undefined, { left: 40, top: 114, right: 1880, bottom: 956 });
  const preview = startTizenPreview({ url: "https://cdn/p.m3u8", target });
  avplay.finishPrepare();
  assert.equal(backdrop.style.clipPath ?? "", "", "opaque until frames show");

  avplay.listener.oncurrentplaytime?.(300);
  assert.equal(
    backdrop.style.clipPath,
    "polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, 40px 114px, 1880px 114px, 1880px 956px, 40px 956px, 40px 114px)",
  );
  // Same box, in the tint layer's own coordinates (its top is 100px above the viewport).
  assert.equal(
    ambient.style.clipPath,
    "polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, 40px 214px, 1880px 214px, 1880px 1056px, 40px 1056px, 40px 214px)",
  );

  preview.stop();
  assert.equal(backdrop.style.clipPath, "");
  assert.equal(ambient.style.clipPath, "");
});

test("scrolling stops the preview — the box has moved out from under the video", () => {
  const { avplay, fireWindow, target } = setup();
  let reason = "";
  startTizenPreview({ url: "https://cdn/p.m3u8", target, onStop: (r) => { reason = r; } });
  avplay.finishPrepare();
  avplay.listener.oncurrentplaytime?.(300);
  fireWindow("scroll");
  assert.equal(reason, "superseded");
  assert.equal(avplay.calls.includes("close"), false, "native close deferred past the keypress");
  stopTizenPreview();
  assert.equal(avplay.calls.at(-1), "close");
});

"use client";

/**
 * ProgressBar
 *
 * OTT-style seek bar with:
 * - Immediate scrub UI (local state while dragging)
 * - Single engine seek on pointer release
 * - VTT thumbnail preview on hover
 * - Remaining duration on the right
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ThumbnailPreview } from './ThumbnailPreview';
import { useSeekBar } from '../hooks/useSeekBar';
import { formatPlayerTime } from '../utils/formatPlayerTime';
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import type { ThumbnailCue } from '../model/types';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  buffered: number;
  thumbnailCues: ThumbnailCue[];
  isThumbnailEnabled: boolean;
  suppressThumbnail?: boolean;
  adCuePoints?: number[];
  isVisible?: boolean;
  onSeek: (seconds: number) => void;
}

export function ProgressBar({
  currentTime,
  duration,
  buffered,
  thumbnailCues,
  isThumbnailEnabled,
  suppressThumbnail = false,
  adCuePoints = [],
  isVisible = true,
  onSeek,
}: ProgressBarProps) {
  const {
    trackRef,
    isScrubbing,
    hoverFraction,
    displayFraction,
    displayTime,
    clearHover,
    previewSeek,
    commitSeek,
    trackProps,
  } = useSeekBar({ duration, currentTime, onSeek });

  // Debounced D-pad seeking: holding/repeating Left/Right used to call onSeek
  // (a real engine.seek(), which fires a buffering event every single time)
  // on every keypress — spamming the engine and flashing the loading spinner
  // once per press. Now each press only moves the fill/thumb/VTT preview
  // optimistically (previewSeek, no engine call) and accumulates a pending
  // target off a ref (not the currentTime prop, which lags behind rapid
  // presses since it only reflects the last *committed* engine position) —
  // the real seek only actually commits once presses stop for 350ms.
  //
  // Confirmed on-device (CDP key-repeat trace): this remote's raw repeat rate
  // is far faster than expected — a single press generated ~98 repeat keydown
  // events in ~2s (~20ms apart). A first attempt at fixing this capped total
  // burst distance to a fixed 60s — which stopped the runaway jump, but also
  // broke genuinely holding the key down to seek further: once a hold hit the
  // cap it simply stopped responding for the rest of that hold, however long
  // it continued. The actual fix is a rate throttle, not a distance cap:
  // MIN_STEP_INTERVAL_MS only *accepts* one step per ~150ms of wall-clock
  // time, silently ignoring any repeat event that arrives faster than that —
  // collapsing the platform's ~20ms-apart repeat storm down to a sane, steady
  // step rate. A quick tap (even if it spawns a few repeats within ~150ms)
  // still only moves one step, and a sustained hold keeps moving for as long
  // as it's actually held — no artificial ceiling, just a sane pace.
  const MIN_STEP_INTERVAL_MS = 150;
  const pendingSeekTimeRef = useRef<number | null>(null);
  const lastAcceptedPressAtRef = useRef(0);
  const seekDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Was showing the VTT preview any time the bar merely had D-pad focus —
  // meaning it popped up just from navigating Up onto the seek bar, before
  // the user had touched Left/Right at all. It should only appear while an
  // actual seek gesture is in progress. isActivelySeeking flips true on the
  // first press of a burst and clears a beat after the last one (slightly
  // longer than the 350ms seek-commit debounce so it doesn't wink out right
  // before the seek lands), independent of whether focus is still on the bar.
  const [isActivelySeeking, setIsActivelySeeking] = useState(false);
  const activeSeekingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // currentTime/duration mirrored into refs so onArrowPress below can read
  // fresh values without needing them in its own dependency list. This
  // turned out to matter a lot more than it looks: an inline onArrowPress
  // (or one that depends on the constantly-ticking currentTime prop) gets a
  // new function identity on every render — including every ordinary
  // ~250ms currentTime tick during normal playback, not just while seeking.
  // norigin's useFocusable re-subscribes to SpatialNavigation on every
  // onArrowPress identity change (its own internal useEffect), which resets
  // that node's cached layout measurement and forces a re-measure — cheap in
  // isolation, but confirmed via live CDP trace to be the actual cause of
  // severe main-thread stalling on this TV's hardware once presses were
  // actually landing (a clean 3s hold only managed ~2-3 accepted steps
  // instead of ~20). Keeping onArrowPress's identity stable via useCallback
  // (reading current values from refs instead of closing over the props
  // directly) means norigin only re-subscribes when it actually needs to.
  const currentTimeRef = useRef(currentTime);
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);
  const durationRef = useRef(duration);
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  const handleArrowPress = useCallback(
    (direction: string) => {
      if (direction !== 'left' && direction !== 'right') return true;
      const duration = durationRef.current;
      if (duration <= 0) return false;

      setIsActivelySeeking(true);
      if (activeSeekingTimerRef.current) clearTimeout(activeSeekingTimerRef.current);
      activeSeekingTimerRef.current = setTimeout(() => {
        setIsActivelySeeking(false);
        activeSeekingTimerRef.current = null;
      }, 500);

      // Throttle: silently ignore repeat events arriving faster than
      // MIN_STEP_INTERVAL_MS since the last *accepted* step. This is the
      // whole fix — no cap on total distance, so a real hold just keeps
      // stepping for as long as it's held.
      const now = performance.now();
      if (now - lastAcceptedPressAtRef.current < MIN_STEP_INTERVAL_MS) {
        return false;
      }
      lastAcceptedPressAtRef.current = now;

      const base = pendingSeekTimeRef.current ?? currentTimeRef.current;
      let target = direction === 'left' ? base - 10 : base + 10;
      target = Math.max(0, Math.min(duration, target));

      pendingSeekTimeRef.current = target;
      previewSeek(target / duration);

      if (seekDebounceRef.current) clearTimeout(seekDebounceRef.current);
      seekDebounceRef.current = setTimeout(() => {
        if (pendingSeekTimeRef.current !== null) {
          commitSeek(pendingSeekTimeRef.current / duration);
        }
        pendingSeekTimeRef.current = null;
        seekDebounceRef.current = null;
      }, 350);

      return false;
    },
    [previewSeek, commitSeek]
  );

  const { ref: focusRef, focused } = useFocusable({
    focusKey: 'player-seekbar',
    focusable: isVisible,
    onArrowPress: handleArrowPress,
  });

  useEffect(() => {
    return () => {
      if (seekDebounceRef.current) clearTimeout(seekDebounceRef.current);
      if (activeSeekingTimerRef.current) clearTimeout(activeSeekingTimerRef.current);
    };
  }, []);

  // Leaving the seek bar mid-seek (e.g. pressing Down right after a press)
  // should also drop the preview immediately rather than waiting out the timer.
  useEffect(() => {
    if (!focused) setIsActivelySeeking(false);
  }, [focused]);

  useEffect(() => {
    if (suppressThumbnail) clearHover();
  }, [suppressThumbnail, clearHover]);

  // hoverFraction (from useSeekBar) only ever gets set by a real pointermove
  // event — a D-pad remote never fires one, so seeking with Left/Right left
  // the thumbnail preview permanently blank on TV even though it works fine
  // with a mouse. While actively seeking (isActivelySeeking — NOT just
  // `focused`, which would show the preview the instant you navigate onto the
  // bar even before pressing anything), fall back to displayFraction — the
  // same optimistic position already driving the played-bar fill and thumb,
  // so the preview tracks each Left/Right press exactly like the fill does.
  const previewFraction = hoverFraction ?? (isActivelySeeking ? displayFraction : null);

  // The fill/thumb above can move on every accepted D-pad step (150ms) fine —
  // that's just a CSS width/left change. The VTT preview cannot: each step
  // that crosses into a new cue swaps in 2-3 fresh thumbnail images (prev/
  // current/next), and decoding those on this TV's hardware is expensive
  // enough that a sustained hold's steady 150ms cadence piles up faster than
  // the device can decode — confirmed live via CDP trace, where a ~3s hold
  // only managed ~3 accepted steps end-to-end instead of ~20, because each
  // one was stuck behind image-decode backlog. Throttling how often the VTT
  // preview itself is allowed to update (independent of the fill/thumb,
  // which keeps tracking every step) keeps image churn at a pace this
  // hardware can actually keep up with. The trailing update still applies
  // the last-known fraction once the throttle window closes, so the preview
  // settles on exactly where the hold ended instead of visibly lagging behind.
  const VTT_PREVIEW_UPDATE_MS = 400;
  const [vttPreviewFraction, setVttPreviewFraction] = useState<number | null>(null);
  const lastVttUpdateAtRef = useRef(0);
  const vttTrailingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (previewFraction === null) {
      if (vttTrailingTimerRef.current) {
        clearTimeout(vttTrailingTimerRef.current);
        vttTrailingTimerRef.current = null;
      }
      setVttPreviewFraction(null);
      return;
    }

    const now = performance.now();
    const elapsed = now - lastVttUpdateAtRef.current;

    if (elapsed >= VTT_PREVIEW_UPDATE_MS) {
      lastVttUpdateAtRef.current = now;
      if (vttTrailingTimerRef.current) {
        clearTimeout(vttTrailingTimerRef.current);
        vttTrailingTimerRef.current = null;
      }
      setVttPreviewFraction(previewFraction);
      return;
    }

    if (vttTrailingTimerRef.current) clearTimeout(vttTrailingTimerRef.current);
    vttTrailingTimerRef.current = setTimeout(() => {
      lastVttUpdateAtRef.current = performance.now();
      setVttPreviewFraction(previewFraction);
      vttTrailingTimerRef.current = null;
    }, VTT_PREVIEW_UPDATE_MS - elapsed);
  }, [previewFraction]);

  useEffect(() => {
    return () => {
      if (vttTrailingTimerRef.current) clearTimeout(vttTrailingTimerRef.current);
    };
  }, []);

  const playedPct = displayFraction * 100;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;
  // displayTime already folds in scrubFraction/pendingFraction/playbackFraction
  // correctly (see useSeekBar) — using it unconditionally keeps the remaining-
  // time label in sync with the fill/thumb during D-pad debounced seeking too,
  // not just mouse-drag scrubbing.
  const remainingSeconds = Math.max(0, duration - displayTime);

  return (
    // relative + the preview rendered here (not inside the narrower flex-1
    // track div below) so it centers against the FULL seekbar row — track
    // plus the time label's width on the right — instead of just the track's
    // own box. Centering against the track-only box left it visibly off from
    // true center, since the time label eats space asymmetrically (only on
    // the right), shifting the track's own midpoint left of the row's.
    <div className="relative w-full flex items-center gap-3">
      {isThumbnailEnabled &&
        !suppressThumbnail &&
        !isScrubbing &&
        vttPreviewFraction !== null &&
        thumbnailCues.length > 0 && (
          <ThumbnailPreview
            cues={thumbnailCues}
            hoverPosition={vttPreviewFraction}
            duration={duration}
          />
        )}

      {/* Focus is communicated by the thumb alone (see below) — no ring/
          background/scale on the whole bar, just a broader TV-style track. */}
      <div
        ref={focusRef}
        className="relative flex-1 group/seek"
        style={{ height: 24 }}
      >
        <div
          ref={trackRef}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={Math.floor(duration)}
          aria-valuenow={Math.floor(isScrubbing ? displayTime : currentTime)}
          aria-label="Seek"
          tabIndex={0}
          className="absolute inset-x-0 cursor-pointer touch-none"
          style={{ top: '50%', transform: 'translateY(-50%)', height: 24 }}
          {...trackProps}
        >
          {/* Broader, TV-scale track — a thin web-style line reads poorly
              from a couch/10-foot viewing distance. */}
          <div
            className={`absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-full overflow-hidden transition-all duration-150 ${focused ? 'h-[12px]' : 'h-[9px] group-hover/seek:h-[12px]'
              }`}
            style={{ background: 'rgba(255,255,255,0.25)' }}
          >
            <div
              className="absolute top-0 left-0 h-full rounded-full"
              style={{
                width: `${bufferedPct}%`,
                background: 'rgba(255,255,255,0.35)',
              }}
            />
            <div
              className="absolute top-0 left-0 h-full rounded-full"
              style={{
                width: `${playedPct}%`,
                background: 'var(--theme_13_samecolour, #ff6b00)',
                transition: isScrubbing ? 'none' : 'width 150ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </div>

          {adCuePoints.map((cuePoint) => {
            const pct = duration > 0 ? (cuePoint / duration) * 100 : 0;
            if (pct <= 0 || pct >= 100) return null;

            // Hide the ad dot if the active playhead/thumb has played or scrubbed past it
            const activeTime = isScrubbing ? displayTime : currentTime;
            if (activeTime >= cuePoint) return null;

            return (
              <div
                key={cuePoint}
                className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 w-[3px] transition-all duration-150 ${focused ? 'h-[12px]' : 'h-2 group-hover/seek:h-[12px]'
                  }`}
                style={{
                  left: `${pct}%`,
                  backgroundColor: '#ffcc00',
                  boxShadow: '0 0 4px rgba(255, 204, 0, 0.8)',
                }}
              />
            );
          })}

          {/* Thumb only appears while the seek bar actually has D-pad focus
              (or is being scrubbed/hovered) — otherwise it's just a thin
              progress line. Pressing Down/Up away from the seek bar takes
              focus elsewhere, so the thumb fades back out instead of sitting
              on the track all the time. */}
          <div
            className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full shadow-md group-hover/seek:opacity-100 group-hover/seek:w-6 group-hover/seek:h-6 pointer-events-none ${isScrubbing ? '' : 'transition-all duration-150'
              } ${focused || isScrubbing ? 'opacity-100 w-6 h-6 shadow-[0_0_12px_rgba(255,107,0,0.6)] ring-2 ring-white/50' : 'opacity-0'}`}
            style={{
              left: `${playedPct}%`,
              background: 'var(--theme_13_samecolour, #ff6b00)',
            }}
          />
        </div>
      </div>

      <span
        className="shrink-0 text-theme_1 tabular-nums select-none"
        style={{ fontSize: 13, letterSpacing: '0.01em', minWidth: 56, textAlign: 'right' }}
      >
        -{formatPlayerTime(remainingSeconds)}
      </span>
    </div>
  );
}

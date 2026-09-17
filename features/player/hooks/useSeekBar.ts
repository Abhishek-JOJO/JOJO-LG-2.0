"use client";

/**
 * useSeekBar
 *
 * OTT scrubbing:
 * - Instant seek on tap/click (pointer down)
 * - Smooth UI while dragging without engine spam
 * - Optimistic thumb position until playback catches up
 */

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseSeekBarOptions {
  duration: number;
  currentTime: number;
  onSeek: (seconds: number) => void;
  keyboardStepSeconds?: number;
}

function clampFraction(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function useSeekBar({
  duration,
  currentTime,
  onSeek,
  keyboardStepSeconds = 5,
}: UseSeekBarOptions) {
  const trackRef = useRef<HTMLDivElement>(null);
  const isScrubbingRef = useRef(false);
  const lastCommittedFractionRef = useRef<number | null>(null);

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubFraction, setScrubFraction] = useState(0);
  const [pendingFraction, setPendingFraction] = useState<number | null>(null);
  const [hoverFraction, setHoverFraction] = useState<number | null>(null);
  const [barRect, setBarRect] = useState<DOMRect | null>(null);

  const getFraction = useCallback((clientX: number): number => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return clampFraction((clientX - rect.left) / rect.width);
  }, []);

  const lastSeekTimestampRef = useRef<number>(0);

  const commitSeek = useCallback(
    (fraction: number) => {
      if (duration <= 0) return;
      const clamped = clampFraction(fraction);
      const now = Date.now();

      // Prevent back-to-back duplicate seek calls within 150ms unless position move is significant
      if (
        lastCommittedFractionRef.current !== null &&
        now - lastSeekTimestampRef.current < 150 &&
        Math.abs(clamped - lastCommittedFractionRef.current) < 0.03
      ) {
        return;
      }

      lastSeekTimestampRef.current = now;
      lastCommittedFractionRef.current = clamped;
      setPendingFraction(clamped);
      onSeek(clamped * duration);
    },
    [duration, onSeek]
  );

  const updateBarRect = useCallback(() => {
    setBarRect(trackRef.current?.getBoundingClientRect() ?? null);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    updateBarRect();
    const observer = new ResizeObserver(() => updateBarRect());
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateBarRect]);

  // Clear optimistic position once playback reaches the committed seek
  // target. This used to compare fractions with a flat 1.5%-of-duration
  // tolerance — fine for a short clip, but on a long video (e.g. a
  // 2.5-hour, ~9200s title) 1.5% is ~138 seconds, so the real (still
  // advancing) playback position was almost always "close enough" to
  // whatever target a D-pad press had just set, clearing the optimistic
  // overlay and snapping the thumb/VTT preview back to live playback
  // before the actual seek had even landed — the "thumbnail not proper
  // move" jitter. Comparing absolute seconds instead keeps this tied to
  // how close playback actually is to the target, regardless of the
  // video's length.
  useEffect(() => {
    if (pendingFraction === null || duration <= 0) return;
    const pendingTime = pendingFraction * duration;
    if (Math.abs(currentTime - pendingTime) < 1) {
      setPendingFraction(null);
      lastCommittedFractionRef.current = null;
    }
  }, [currentTime, duration, pendingFraction]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (duration <= 0) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      isScrubbingRef.current = true;
      setIsScrubbing(true);

      const frac = getFraction(e.clientX);
      setScrubFraction(frac);
      updateBarRect();

      // Immediate seek on click — removes perceived lag
      commitSeek(frac);
    },
    [duration, getFraction, updateBarRect, commitSeek]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const frac = getFraction(e.clientX);
      if (isScrubbingRef.current) {
        setScrubFraction(frac);
        return;
      }
      setHoverFraction(frac);
      updateBarRect();
    },
    [getFraction, updateBarRect]
  );

  const endScrub = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, shouldCommit: boolean) => {
      if (!isScrubbingRef.current) return;

      const frac = getFraction(e.clientX);
      isScrubbingRef.current = false;
      setIsScrubbing(false);
      setScrubFraction(frac);

      if (
        shouldCommit &&
        (lastCommittedFractionRef.current === null ||
          Math.abs(frac - lastCommittedFractionRef.current) > 0.005)
      ) {
        commitSeek(frac);
      }

      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    },
    [getFraction, commitSeek]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => endScrub(e, true),
    [endScrub]
  );

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => endScrub(e, false),
    [endScrub]
  );

  const handlePointerLeave = useCallback(() => {
    if (!isScrubbingRef.current) setHoverFraction(null);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (duration <= 0) return;

      let target = currentTime;
      switch (e.key) {
        case 'ArrowLeft':
          target = currentTime - keyboardStepSeconds;
          break;
        case 'ArrowRight':
          target = currentTime + keyboardStepSeconds;
          break;
        case 'Home':
          target = 0;
          break;
        case 'End':
          target = duration;
          break;
        default:
          return;
      }

      e.preventDefault();
      const clamped = Math.max(0, Math.min(target, duration));
      onSeek(clamped);
      setPendingFraction(clamped / duration);
    },
    [currentTime, duration, keyboardStepSeconds, onSeek]
  );

  const previewSeek = useCallback((fraction: number) => setPendingFraction(clampFraction(fraction)), []);

  const playbackFraction = duration > 0 ? currentTime / duration : 0;

  const displayFraction = isScrubbing
    ? scrubFraction
    : pendingFraction !== null
      ? pendingFraction
      : playbackFraction;

  const displayTime = displayFraction * duration;

  return {
    trackRef,
    isScrubbing,
    hoverFraction,
    displayFraction,
    displayTime,
    barRect,
    clearHover: () => setHoverFraction(null),
    // Optimistic-only position update — moves the fill/thumb/VTT preview
    // immediately without calling onSeek (a real engine seek, which triggers
    // a buffering event every time). Callers debounce the actual commitSeek.
    // Stable identity (useCallback, no deps — setState functions are always
    // stable) so callers that memoize a handler around it (e.g. ProgressBar's
    // onArrowPress) don't get a fresh reference every render just because
    // this one changed.
    previewSeek,
    commitSeek,
    trackProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerLeave: handlePointerLeave,
      onPointerCancel: handlePointerCancel,
      onKeyDown: handleKeyDown,
    },
  };
}

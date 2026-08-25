"use client";

/**
 * PlaybackFeedback
 *
 * OTT-grade visual feedback overlay:
 *  - Play / Pause → centered pill with icon
 *  - Seek Forward  → right-side icon with "+10s" ripple (Netflix style)
 *  - Seek Backward → left-side icon with "−10s" ripple
 *  - Volume up/down / Mute / Unmute → centered
 *
 * Rendered absolutely on top of the video, pointer-events: none.
 * Animates in with a scale+fade, auto-dismisses after 700 ms.
 */

import React, { memo, useEffect, useRef, useState } from 'react';
import { SEEK_OFFSET_SECONDS } from '../constants/player.constants';

export type FeedbackAction =
  | 'play'
  | 'pause'
  | 'seek_forward'
  | 'seek_backward'
  | 'volume_up'
  | 'volume_down'
  | 'mute'
  | 'unmute';

interface PlaybackFeedbackProps {
  action: { type: FeedbackAction; key: number; value?: number } | null;
}

// ── Tiny sub-components ────────────────────────────────────────────────────────

function PlayIcon() {
  return (
    <svg width={40} height={40} viewBox="0 0 24 24" fill="white">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width={40} height={40} viewBox="0 0 24 24" fill="white">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

function VolumeUpIcon() {
  return (
    <svg width={36} height={36} viewBox="0 0 24 24" fill="white">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}

function VolumeDownIcon() {
  return (
    <svg width={36} height={36} viewBox="0 0 24 24" fill="white">
      <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
    </svg>
  );
}

function MuteIcon() {
  return (
    <svg width={36} height={36} viewBox="0 0 24 24" fill="white">
      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
    </svg>
  );
}

function UnmuteIcon() {
  return (
    <svg width={36} height={36} viewBox="0 0 24 24" fill="white">
      <path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77zM3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
    </svg>
  );
}

// Netflix-style double-arrow seek icon (left or right)
function SeekChevrons({ direction }: { direction: 'forward' | 'backward' }) {
  const flip = direction === 'backward' ? 'scaleX(-1)' : undefined;
  return (
    <div style={{ transform: flip, display: 'flex' }}>
      <svg width={44} height={44} viewBox="0 0 24 24" fill="white">
        <path d="M5.59 7.41L10.18 12l-4.59 4.59L7 18l6-6-6-6zM11 6l6 6-6 6 1.41 1.41L19.83 12 12.41 4.59z" />
      </svg>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export const PlaybackFeedback = memo(function PlaybackFeedback({ action }: PlaybackFeedbackProps) {
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<FeedbackAction | null>(null);
  const [currentValue, setCurrentValue] = useState<number | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!action) return;
    // Always reset animation by briefly clearing
    setCurrent(action.type);
    setCurrentValue(action.value);
    setVisible(false);

    // Micro-tick so CSS transition restarts properly
    const raf = requestAnimationFrame(() => {
      setVisible(true);
    });

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 700);

    return () => {
      cancelAnimationFrame(raf);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [action?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!current) return null;

  const isSide = current === 'seek_forward' || current === 'seek_backward';
  const isCenterSmall =
    current === 'volume_up' ||
    current === 'volume_down' ||
    current === 'mute' ||
    current === 'unmute';

  // ── Layout helpers ────────────────────────────────────────────────────────

  if (isSide) {
    const isForward = current === 'seek_forward';
    return (
      <div
        className="absolute inset-0 flex items-center pointer-events-none z-30"
        style={{ justifyContent: isForward ? 'flex-end' : 'flex-start' }}
      >
        <div
          className="flex flex-col items-center gap-1 m-10 transition-all duration-300"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'scale(1)' : 'scale(0.7)',
          }}
        >
          {/* Background blob */}
          <div
            className="w-20 h-20 rounded-full flex flex-col items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          >
            <SeekChevrons direction={isForward ? 'forward' : 'backward'} />
          </div>
          <span className="text-white text-xs font-bold tracking-wide drop-shadow">
            {isForward ? `+${currentValue ?? SEEK_OFFSET_SECONDS}s` : `-${currentValue ?? SEEK_OFFSET_SECONDS}s`}
          </span>
        </div>
      </div>
    );
  }

  // Center pill for play / pause / volume
  const renderIcon = () => {
    switch (current) {
      case 'play':        return <PlayIcon />;
      case 'pause':       return <PauseIcon />;
      case 'volume_up':   return <VolumeUpIcon />;
      case 'volume_down': return <VolumeDownIcon />;
      case 'mute':        return <MuteIcon />;
      case 'unmute':      return <UnmuteIcon />;
      default:            return null;
    }
  };

  const boxSize = isCenterSmall ? 64 : 72;

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
    >
      <div
        className="flex items-center justify-center rounded-full text-white transition-all duration-300"
        style={{
          width: boxSize,
          height: boxSize,
          background: 'rgba(0,0,0,0.60)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.12)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.65)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        {renderIcon()}
      </div>
    </div>
  );
});

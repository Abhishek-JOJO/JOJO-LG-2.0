"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useFocusable, setFocus } from '@noriginmedia/norigin-spatial-navigation';

interface NextEpisodeCardProps {
  title: string;
  thumbnailUrl?: string;
  /** e.g. "S1 EP1" */
  episodeLabel?: string;
  /** e.g. "1h 26m" */
  durationLabel?: string;
  countdownSeconds: number;
  countdownTotalSeconds: number;
  onPlayNow: () => void;
  onCancel: () => void;
  /** Distinguishes the two places this card is rendered (auto-triggered overlay vs. the "next title" marker card) so their focus keys never collide. */
  focusKey?: string;
}

const RING_RADIUS = 24;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function NextEpisodeCard({
  title,
  thumbnailUrl,
  episodeLabel,
  durationLabel,
  countdownSeconds,
  countdownTotalSeconds,
  onPlayNow,
  onCancel,
  focusKey = 'next-episode-card-play-btn',
}: NextEpisodeCardProps) {
  const { ref: playBtnRef, focused } = useFocusable({ focusKey, onEnterPress: onPlayNow });

  // Mounts fresh whenever this card is shown (parent conditionally renders it) —
  // safe to focus on mount, no phantom-focusable risk.
  useEffect(() => {
    const timer = setTimeout(() => setFocus(focusKey), 50);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  const safeTotal = Math.max(1, countdownTotalSeconds);
  const countdownRef = useRef(Math.max(0, countdownSeconds));
  const progressRef = useRef(
    Math.max(0, Math.min(1, (safeTotal - Math.max(0, countdownSeconds)) / safeTotal))
  );
  const [ringOffset, setRingOffset] = useState(
    RING_CIRCUMFERENCE * (1 - progressRef.current)
  );

  countdownRef.current = Math.max(0, countdownSeconds);

  useEffect(() => {
    let raf = 0;

    const animate = () => {
      const target = Math.max(
        0,
        Math.min(1, (safeTotal - countdownRef.current) / safeTotal)
      );
      const current = progressRef.current;
      const diff = target - current;

      // Soft follow: small steps ease gently, larger jumps still feel smooth
      const factor = Math.min(0.45, Math.max(0.08, Math.abs(diff) * 2.5));
      const next = Math.abs(diff) < 0.0005 ? target : current + diff * factor;

      progressRef.current = next;
      setRingOffset(RING_CIRCUMFERENCE * (1 - next));
      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [safeTotal]);

  return (
    <div
      className="relative w-[260px] rounded-2xl bg-black/85 overflow-hidden shadow-[0_18px_45px_rgba(0,0,0,0.8)]"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Thumbnail */}
      <button
        ref={playBtnRef}
        type="button"
        onClick={onPlayNow}
        className={`relative block w-full aspect-[16/9] overflow-hidden bg-[#222] outline-none transition-all ${
          focused ? 'ring-[3px] ring-white ring-inset' : ''
        }`}
        aria-label="Play next episode"
      >
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-[#222]" />
        )}

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />

        {/* Centered play with soft animated orange progress ring */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative flex items-center justify-center w-14 h-14">
            <svg
              className="absolute inset-0 w-full h-full -rotate-90"
              viewBox="0 0 56 56"
              aria-hidden="true"
            >
              <circle
                cx="28"
                cy="28"
                r={RING_RADIUS}
                fill="rgba(0,0,0,0.65)"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="2.5"
              />
              <circle
                cx="28"
                cy="28"
                r={RING_RADIUS}
                fill="none"
                stroke="#F26E21"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={ringOffset}
                style={{ opacity: 0.95 }}
              />
            </svg>
            <svg
              width="20"
              height="20"
              viewBox="0 0 22 22"
              fill="none"
              aria-hidden="true"
              className="relative z-10 ml-0.5"
            >
              <path d="M7 5L17 11L7 17V5Z" fill="white" />
            </svg>
          </div>
        </div>
      </button>

      {/* Text */}
      <div className="px-4 pt-3 pb-4">
        <p className="text-[15px] text-theme_1 font-semibold leading-snug mb-1.5 line-clamp-2">
          {title}
        </p>
        {(episodeLabel || durationLabel) && (
          <p className="text-[13px] text-theme_1/70 flex items-center gap-1">
            {episodeLabel && <span>{episodeLabel}</span>}
            {episodeLabel && durationLabel && <span>•</span>}
            {durationLabel && <span>{durationLabel}</span>}
          </p>
        )}
      </div>
    </div>
  );
}

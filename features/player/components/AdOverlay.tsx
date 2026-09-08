"use client";

import React, { memo } from 'react';
import type { AdState } from '../model/types';
import { PlayerIcon } from './PlayerIcon';

import { isLandingPageUrl } from '../utils/adUtils';

interface AdOverlayProps {
  adState: AdState;
  onSkip: () => void;
  isAdPaused: boolean;
  isAdMuted: boolean;
  onPlayPause: () => void;
  onMuteToggle: () => void;
  onFullscreenToggle: () => void;
  onBack: () => void;
  onGoAdsFree?: () => void;
  isFullscreen: boolean;
  onAdClick: () => void;
}

export const AdOverlay = memo(function AdOverlay({
  adState,
  onSkip,
  isAdPaused,
  isAdMuted,
  onPlayPause,
  onMuteToggle,
  onFullscreenToggle,
  onBack,
  onGoAdsFree,
  isFullscreen,
  onAdClick,
}: AdOverlayProps) {
  if (!adState.isPlaying && !adState.isLoading && !adState.hasError) return null;

  if (adState.isLoading) {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/90">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-white/10 border-t-[#00d09c] rounded-full animate-spin" />
          <span className="text-white/80 text-xs font-medium tracking-wider animate-pulse">LOADING AD...</span>
        </div>
      </div>
    );
  }

  if (adState.hasError) {
    return (
      <div className="absolute bottom-16 left-4 z-40 bg-black/75 border border-white/10 px-3 py-1.5 rounded-full backdrop-blur-md">
        <span className="text-white/60 text-xs font-medium">Ad Unavailable</span>
      </div>
    );
  }

  const displaySeconds = adState.remainingSeconds > 0 ? adState.remainingSeconds : adState.totalSeconds;
  const roundedSeconds = Math.max(0, Math.ceil(displaySeconds));
  const elapsed = adState.totalSeconds - adState.remainingSeconds;
  const progressPercent = adState.totalSeconds > 0 ? (elapsed / adState.totalSeconds) * 100 : 0;

  const canSkip =
    adState.isSkippable &&
    adState.totalSeconds > 0 &&
    adState.skipOffsetSeconds >= 0 &&
    elapsed >= adState.skipOffsetSeconds;

  const skipCountdown =
    adState.isSkippable &&
      adState.skipOffsetSeconds > 0 &&
      !canSkip &&
      adState.totalSeconds > 0
      ? Math.ceil(adState.skipOffsetSeconds - elapsed)
      : 0;

  const brandName = adState.advertiserName || adState.title || 'Sponsored';

  // Custom smart CTA picker
  let ctaText = 'Learn More';
  const lowerTitle = brandName.toLowerCase();
  if (lowerTitle.includes('book') || lowerTitle.includes('ride')) {
    ctaText = 'Book Now';
  } else if (lowerTitle.includes('shop') || lowerTitle.includes('buy')) {
    ctaText = 'Shop Now';
  } else if (lowerTitle.includes('watch') || lowerTitle.includes('play')) {
    ctaText = 'Watch Now';
  }

  return (
    <div 
      className="absolute inset-0 z-40 flex flex-col justify-between p-6 select-none bg-gradient-to-t from-black/80 via-transparent to-black/50 pointer-events-none transition-all duration-300"
    >
      <style>{`
        @keyframes shine-sweep {
          0% { left: -150%; }
          50% { left: 150%; }
          100% { left: 150%; }
        }
        @keyframes pulse-glow {
          0% { box-shadow: 0 0 10px rgba(250, 175, 63, 0.4); }
          50% { box-shadow: 0 0 25px rgba(250, 175, 63, 0.8), 0 0 10px rgba(250, 175, 63, 0.4); }
          100% { box-shadow: 0 0 10px rgba(250, 175, 63, 0.4); }
        }
        .go-ad-free-btn {
          position: relative !important;
          overflow: hidden !important;
          animation: pulse-glow 2s infinite ease-in-out !important;
        }
        .go-ad-free-btn::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -150%;
          width: 50%;
          height: 200%;
          background: linear-gradient(
            to right,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.5) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          transform: rotate(25deg);
          animation: shine-sweep 3.5s infinite ease-in-out;
        }
      `}</style>


      {/* Center Empty Space */}
      <div className="flex-1" />

      {/* ── BOTTOM BAR: Progress + Icons (Two Row Layout) ── */}
      <div className="flex flex-col w-full pb-4 pointer-events-none">
        {/* ── Row 1: Ad Progress Bar ── */}
        <div className="flex items-center gap-2 mb-4 w-full">
          <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden relative">
            <div
              className="absolute left-0 top-0 bottom-0 bg-[#ffcc00] transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(255,204,0,0.5)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* ── Row 2: Control icons ── */}
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-y-2.5 w-full pointer-events-auto">
          {/* ── Left group ── */}
          <div className="flex items-center gap-2.5 sm:gap-4 md:gap-5 shrink-0">
            {/* Play / Pause */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlayPause();
              }}
              className="flex items-center justify-center p-1.5 rounded hover:bg-white/10 transition-colors text-white"
              title={isAdPaused ? 'Play' : 'Pause'}
            >
              <PlayerIcon name={isAdPaused ? 'play' : 'pause'} size={32} />
            </button>

            {/* Volume */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMuteToggle();
              }}
              className="flex items-center justify-center p-1.5 rounded hover:bg-white/10 transition-colors text-white"
              title={isAdMuted ? 'Unmute' : 'Mute'}
            >
              <PlayerIcon name={isAdMuted ? 'mute' : 'unmute'} size={24} />
            </button>

            {/* Ad Position / Timer Badge */}
            <div className="bg-black/60 border border-white/10 backdrop-blur-md rounded px-2.5 py-1.5 text-white/95 font-sans text-xs font-semibold select-none flex items-center gap-1.5 ml-1">
              <span className="bg-[#ffcc00] text-black font-black px-1 rounded-sm text-[9px] uppercase leading-none">
                Ad
              </span>
              {adState.totalAds && adState.totalAds > 1 && (
                <>
                  <span>{adState.adPosition} of {adState.totalAds}</span>
                  <span className="w-1 h-1 bg-white/30 rounded-full" />
                </>
              )}
              <span>{roundedSeconds}s</span>
            </div>

            {/* Learn More CTA */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAdClick();
              }}
              className="bg-[#F26E21] hover:bg-[#d4530d] text-white font-sans font-bold text-xs px-4 py-2 rounded-full flex items-center gap-1.5 shadow-xl transition-all active:scale-95 cursor-pointer select-none hidden sm:flex ml-2"
            >
              <span>{ctaText}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <line x1="7" y1="17" x2="17" y2="7" />
                <polyline points="7 7 17 7 17 17" />
              </svg>
            </button>
          </div>

          {/* ── Spacer ── */}
          <div className="flex-grow hidden sm:block" />

          {/* ── Right group ── */}
          <div className="flex items-center gap-2.5 sm:gap-4 md:gap-5 shrink-0">
            {/* Go Ad-Free */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onGoAdsFree) onGoAdsFree();
                else window.location.replace('/subscription');
              }}
              style={{
                background: 'linear-gradient(44.13deg, rgb(250, 175, 63) 21.63%, rgb(255, 214, 145) 49.52%, rgb(250, 175, 63) 81.68%)',
                color: 'var(--theme_12)',
              }}
              className="hover:brightness-110 font-sans font-black text-[11px] sm:text-xs px-4 py-2.5 rounded-full flex items-center gap-1.5 shadow-[0_0_15px_rgba(250,175,63,0.4)] transition-all active:scale-95 cursor-pointer uppercase tracking-wider select-none border border-yellow-200/50"
              title="Upgrade to watch ad-free"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0" style={{ color: 'var(--theme_12)' }}>
                <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
              </svg>
              <span className="hidden sm:inline">Go Ad-Free</span>
            </button>

            {/* Skip / Countdown */}
            <div className="flex items-center">
              {!canSkip && skipCountdown > 0 && (
                <div className="bg-black/60 border border-white/10 rounded-full text-white/95 text-xs font-semibold px-4.5 py-2.5 select-none backdrop-blur-md shadow-md">
                  Skip Ad in {skipCountdown}s
                </div>
              )}

              {canSkip && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSkip();
                  }}
                  className="bg-white text-black hover:bg-gray-100 rounded-full text-xs font-extrabold px-5 py-2.5 cursor-pointer active:scale-95 transition-all shadow-xl flex items-center gap-1.5"
                >
                  <span>Skip Ad</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-black">
                    <polyline points="13 17 18 12 13 7" />
                    <polyline points="6 17 11 12 6 7" />
                  </svg>
                </button>
              )}
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFullscreenToggle();
              }}
              className="flex items-center justify-center p-1.5 rounded hover:bg-white/10 transition-colors text-white"
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              <PlayerIcon name={isFullscreen ? 'exit-fullscreen' : 'fullscreen'} size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useFocusable, setFocus, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import type { SubtitleTrack } from '../model/types';

const OFF_TRACK: SubtitleTrack = {
  id: -1,
  language: 'off',
  label: 'Off',
  isActive: false,
};

function CheckIcon() {
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" fill="none" className="shrink-0" aria-hidden="true">
      <path d="M1.5 6L5 9.5L12.5 1.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface FocusableTrackBtnProps {
  label: string;
  isActive: boolean;
  focusKey: string;
  isVisible: boolean;
  onClick: () => void;
}

function FocusableTrackBtn({ label, isActive, focusKey, isVisible, onClick }: FocusableTrackBtnProps) {
  const { ref, focused } = useFocusable({
    focusKey,
    focusable: isVisible,
    onEnterPress: onClick,
  });

  return (
    <button
      ref={ref}
      onClick={onClick}
      data-focuskey={focusKey}
      className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-all duration-150 outline-none rounded-lg cursor-pointer ${
        focused
          ? 'bg-white text-black font-bold shadow-lg scale-[1.02]'
          : isActive
          ? 'text-theme_13_samecolour bg-white/10 font-semibold'
          : 'text-white/90 hover:bg-white/10'
      }`}
    >
      <span className="truncate">{label}</span>
      {isActive && (
        <span className={focused ? 'text-black' : 'text-theme_13_samecolour'}>
          <CheckIcon />
        </span>
      )}
    </button>
  );
}

export interface SubtitleSelectorProps {
  tracks: SubtitleTrack[];
  activeTrackId: number;
  onSelect: (trackId: number) => void;
  renderTrigger?: (onClick: () => void) => React.ReactNode;
  onOpenChange?: (isOpen: boolean) => void;
  forceClose?: number;
  isVisible?: boolean;
}

export function SubtitleSelector({
  tracks,
  activeTrackId,
  onSelect,
  renderTrigger,
  onOpenChange,
  forceClose,
  isVisible = true,
}: SubtitleSelectorProps) {
  const [open, setOpen] = useState(false);

  const setOpenWithNotify = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  const isFirstForceCloseRef = useRef(true);
  useEffect(() => {
    if (isFirstForceCloseRef.current) {
      isFirstForceCloseRef.current = false;
      return;
    }
    setOpenWithNotify(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceClose]);

  const { ref: subtitleBoundaryRef, focusKey: subtitlePanelFocusKey } = useFocusable({
    focusKey: 'subtitle-panel',
    isFocusBoundary: true,
    focusable: open,
  });

  const allOptions = useMemo(() => [OFF_TRACK, ...tracks], [tracks]);

  // Stable focus handling when opening/closing
  useEffect(() => {
    if (open) {
      const targetId = activeTrackId !== undefined && activeTrackId !== null ? activeTrackId : allOptions[0]?.id;
      const targetKey = `sub-track-${targetId}`;
      const timer = setTimeout(() => {
        try {
          setFocus(targetKey);
        } catch {}
      }, 50);
      return () => clearTimeout(timer);
    } else {
      if (isVisible) {
        const timer = setTimeout(() => {
          try {
            setFocus('subtitles-trigger-btn');
          } catch {}
        }, 50);
        return () => clearTimeout(timer);
      }
    }
  }, [open, activeTrackId, isVisible]);

  const trigger = renderTrigger ? (
    renderTrigger(() => setOpenWithNotify(!open))
  ) : (
    <button
      onClick={() => setOpenWithNotify(!open)}
      className="text-white text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors"
      aria-label="Subtitles"
      aria-expanded={open}
    >
      CC
    </button>
  );

  return (
    <div className="relative">
      {trigger}

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpenWithNotify(false)} />
          <FocusContext.Provider value={subtitlePanelFocusKey}>
            <div
              ref={subtitleBoundaryRef as any}
              className="absolute bottom-full right-0 mb-3 bg-[#141414]/98 border border-white/15 rounded-xl overflow-hidden min-w-[240px] max-w-[320px] z-50 shadow-2xl backdrop-blur-md player-menu-pop-in p-1.5"
            >
              <div className="px-3 py-2 border-b border-white/10 mb-1">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
                  Subtitles
                </p>
              </div>
              <div className="py-1 max-h-64 overflow-y-auto space-y-1">
                {allOptions.map((track) => (
                  <FocusableTrackBtn
                    key={track.id}
                    focusKey={`sub-track-${track.id}`}
                    label={track.label}
                    isActive={track.id === activeTrackId}
                    isVisible={isVisible && open}
                    onClick={() => {
                      onSelect(track.id);
                      setOpenWithNotify(false);
                    }}
                  />
                ))}
              </div>
            </div>
          </FocusContext.Provider>
        </>
      )}
    </div>
  );
}

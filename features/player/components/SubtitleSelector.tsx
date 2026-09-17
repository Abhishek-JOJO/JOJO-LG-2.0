"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useFocusable, setFocus, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { CAPTION_SIZE_LABELS, CAPTION_SIZE_OPTIONS } from '../constants/player.constants';
import type { CaptionSize, SubtitleTrack } from '../model/types';

const OFF_TRACK: SubtitleTrack = {
  id: -1,
  language: 'off',
  label: 'Off',
  isActive: false,
};

function ChevronRightSmall() {
  return (
    <svg width="6" height="10" viewBox="0 0 6 10" fill="none" aria-hidden="true" className="shrink-0 opacity-60">
      <path d="M1 1L5 5L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronLeftSmall() {
  return (
    <svg width="6" height="10" viewBox="0 0 6 10" fill="none" aria-hidden="true" className="shrink-0 opacity-70">
      <path d="M5 1L1 5L5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
    onEnterPress: onClick
  });

  return (
    <button
      ref={ref}
      onClick={onClick}
      className={`w-full text-left px-4 py-3 text-sm transition-colors ${
        isActive
          ? 'text-theme_13_samecolour bg-white/10 font-semibold'
          : 'text-white hover:bg-white/10'
      } ${focused ? 'bg-white/20 outline-none' : ''}`}
    >
      {label}
    </button>
  );
}

interface FocusableMenuRowProps {
  label: string;
  value: string;
  focusKey: string;
  isVisible: boolean;
  onClick: () => void;
}

function FocusableFontSizeSlider({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const { ref, focused } = useFocusable({
    focusKey: 'sub-app-fontsize',
    onArrowPress: (direction) => {
      if (direction === 'left') {
        onChange(Math.max(min, value - step));
        return false;
      }
      if (direction === 'right') {
        onChange(Math.min(max, value + step));
        return false;
      }
      return true;
    },
  });

  return (
    <div
      ref={ref}
      className={`w-full h-1 rounded-lg transition-all ${focused ? 'ring-2 ring-white ring-offset-2 ring-offset-[#141414] rounded-full' : ''}`}
    >
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        tabIndex={-1}
        className="w-full accent-theme_13_samecolour cursor-pointer bg-white/20 h-1 rounded-lg appearance-none pointer-events-auto"
      />
    </div>
  );
}

function FocusableSwatchBtn({
  focusKey,
  isSelected,
  isTransparent,
  light,
  label,
  style,
  onClick,
}: {
  focusKey: string;
  isSelected: boolean;
  isTransparent?: boolean;
  light: boolean;
  label: string;
  style: React.CSSProperties;
  onClick: () => void;
}) {
  const { ref, focused } = useFocusable({ focusKey, onEnterPress: onClick });
  return (
    <button
      ref={ref}
      onClick={onClick}
      title={label}
      className={`w-7 h-7 rounded-full border transition-all flex items-center justify-center relative outline-none ${
        isTransparent ? 'overflow-hidden' : ''
      } ${
        isSelected ? 'border-theme_13_samecolour scale-110 shadow-lg' : 'border-white/20 hover:scale-105'
      } ${focused ? 'ring-2 ring-white scale-125 shadow-2xl' : ''}`}
      style={style}
    >
      {isTransparent && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-0.5 bg-red-500/80 rotate-45" />
        </div>
      )}
      {isSelected && (
        <span className={light ? 'text-black' : 'text-white'}>
          <CheckIcon />
        </span>
      )}
    </button>
  );
}

function FocusableOpacityBtn({
  focusKey,
  isSelected,
  isDisabled,
  label,
  onClick,
}: {
  focusKey: string;
  isSelected: boolean;
  isDisabled: boolean;
  label: string;
  onClick: () => void;
}) {
  const { ref, focused } = useFocusable({ focusKey, focusable: !isDisabled, onEnterPress: onClick });
  return (
    <button
      ref={ref}
      disabled={isDisabled}
      onClick={onClick}
      className={`py-1 text-xs rounded transition-colors text-center outline-none ${
        isDisabled
          ? 'opacity-30 cursor-not-allowed bg-white/5 text-white/40'
          : isSelected
            ? 'bg-theme_13_samecolour text-black font-semibold'
            : 'bg-white/10 text-white hover:bg-white/20'
      } ${focused ? 'ring-2 ring-white' : ''}`}
    >
      {label}
    </button>
  );
}

function FocusableMenuRow({ label, value, focusKey, isVisible, onClick }: FocusableMenuRowProps) {
  const { ref, focused } = useFocusable({
    focusKey,
    focusable: isVisible,
    onEnterPress: onClick
  });

  return (
    <button
      ref={ref}
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-4 px-4 py-3.5 text-left transition-colors hover:bg-white/10 ${focused ? 'bg-white/20 outline-none' : ''}`}
    >
      <span className="text-sm text-white font-medium">{label}</span>
      <span className="flex items-center gap-2 min-w-0 text-white/60">
        <span className="text-xs truncate">{value}</span>
        <ChevronRightSmall />
      </span>
    </button>
  );
}

const TEXT_COLORS = [
  { value: '#ffffff', label: 'White' },
  { value: '#ffff00', label: 'Yellow' },
  { value: '#00ffff', label: 'Cyan' },
  { value: '#00ff00', label: 'Green' },
  { value: '#ff00ff', label: 'Magenta' },
  { value: '#ff0000', label: 'Red' },
  { value: '#000000', label: 'Black' },
];

const BG_COLORS = [
  { value: '#000000', label: 'Black' },
  { value: '#808080', label: 'Grey' },
  { value: '#ffffff', label: 'White' },
  { value: '#0000ff', label: 'Blue' },
  { value: '#00ff00', label: 'Green' },
  { value: '#ff0000', label: 'Red' },
  { value: 'transparent', label: 'Transparent' },
];

const OPACITIES = [0, 0.25, 0.5, 0.75, 1];

function CheckIcon() {
  return (
    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" className="text-current shrink-0">
      <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const isLightColor = (hex: string) => {
  if (hex === 'transparent') return false;
  const h = hex.replace('#', '');
  if (h.length === 3) {
    const r = parseInt(h.substring(0, 1) + h.substring(0, 1), 16);
    const g = parseInt(h.substring(1, 2) + h.substring(1, 2), 16);
    const b = parseInt(h.substring(2, 3) + h.substring(2, 3), 16);
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return l > 180;
  }
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return l > 180;
};

interface SubtitleSelectorProps {
  tracks: SubtitleTrack[];
  activeTrackId: number;
  captionSize: CaptionSize;
  captionFontSize: number;
  captionTextColor: string;
  captionBgColor: string;
  captionBgOpacity: number;
  onSelect: (trackId: number) => void;
  onCaptionSizeChange: (size: CaptionSize) => void;
  onCaptionFontSizeChange: (size: number) => void;
  onCaptionTextColorChange: (color: string) => void;
  onCaptionBgColorChange?: (color: string) => void;
  onCaptionBgOpacityChange?: (opacity: number) => void;
  renderTrigger?: (onClick: () => void) => React.ReactNode;
  onOpenChange?: (isOpen: boolean) => void;
  /** Bumped by the parent to force this dropdown closed (e.g. on Back/Escape) —
   * `open` is this component's own internal state, not controlled by the
   * parent, so a plain boolean/counter prop change is what triggers it. */
  forceClose?: number;
  isVisible?: boolean;
}

export function SubtitleSelector({
  tracks,
  activeTrackId,
  captionSize,
  captionFontSize,
  captionTextColor,
  captionBgColor,
  captionBgOpacity,
  onSelect,
  onCaptionSizeChange,
  onCaptionFontSizeChange,
  onCaptionTextColorChange,
  onCaptionBgColorChange,
  onCaptionBgOpacityChange,
  renderTrigger,
  onOpenChange,
  forceClose,
  isVisible = true,
}: SubtitleSelectorProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'tracks' | 'appearance'>('tracks');

  const setOpenWithNotify = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
    if (!next) {
      setView('tracks');
    }
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

  // Focus boundary while open — same rationale as SettingsSelector in
  // PlayerControls.tsx: without it, norigin's default search can wander off
  // this popup onto the still-focusable controls it's merely drawn over.
  const { ref: subtitleBoundaryRef, focusKey: subtitlePanelFocusKey } = useFocusable({
    focusKey: 'subtitle-panel',
    isFocusBoundary: true,
    focusable: open,
  });

  const allOptions = [OFF_TRACK, ...tracks];
  const active = allOptions.find((t) => t.id === activeTrackId) ?? OFF_TRACK;

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        if (view === 'tracks') setFocus(`sub-track-${allOptions[0].id}`);
        else if (view === 'appearance') setFocus('sub-app-back');
      }, 50);
    }
  }, [open, view, allOptions]);

  const trigger = renderTrigger ? (
    renderTrigger(() => setOpenWithNotify(!open))
  ) : (
    <button
      onClick={() => setOpenWithNotify(!open)}
      className="text-white text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors"
      aria-label="Subtitles"
      aria-expanded={open}
    >
      CC{active.id !== -1 && <span className="ml-1 text-theme_13_samecolour">·</span>}
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
            className="absolute bottom-full right-0 mb-3 bg-[#141414]/98 border border-white/15 rounded-xl overflow-hidden min-w-[280px] z-50 shadow-2xl backdrop-blur-md player-menu-pop-in">
            {view === 'tracks' && (
              <>
                <div className="px-4 py-3 border-b border-white/10">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
                    Subtitles
                  </p>
                </div>
                <div className="py-1 max-h-56 overflow-y-auto">
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
                <div className="border-t border-white/10 py-1">
                  <FocusableMenuRow
                    label="Caption style"
                    value={`${captionFontSize}px`}
                    focusKey="sub-menu-appearance"
                    isVisible={isVisible && open}
                    onClick={() => setView('appearance')}
                  />
                </div>
              </>
            )}

            {view === 'appearance' && (
              <div className="py-1 max-h-[380px] overflow-y-auto min-w-[280px]">
                <FocusableTrackBtn
                  focusKey="sub-app-back"
                  label="← Subtitles"
                  isActive={false}
                  isVisible={isVisible && open}
                  onClick={() => setView('tracks')}
                />
                
                {/* Font Size Slider */}
                <div className="px-4 py-3 border-b border-white/10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">Text size</span>
                    <span className="text-sm font-medium text-theme_13_samecolour">{captionFontSize}px</span>
                  </div>
                  <FocusableFontSizeSlider
                    value={captionFontSize}
                    min={16}
                    max={40}
                    step={2}
                    onChange={onCaptionFontSizeChange}
                  />
                </div>

                {/* Text Color Grid */}
                <div className="px-4 py-3 border-b border-white/10">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50 mb-2">Text color</p>
                  <div className="flex flex-wrap gap-2">
                    {TEXT_COLORS.map(({ value, label }) => {
                      const isSelected = captionTextColor === value;
                      const light = isLightColor(value);
                      return (
                        <FocusableSwatchBtn
                          key={value}
                          focusKey={`sub-app-textcolor-${value}`}
                          isSelected={isSelected}
                          light={light}
                          label={label}
                          style={{ backgroundColor: value }}
                          onClick={() => onCaptionTextColorChange(value)}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Background Color Grid */}
                <div className="px-4 py-3 border-b border-white/10">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50 mb-2">Background color</p>
                  <div className="flex flex-wrap gap-2">
                    {BG_COLORS.map(({ value, label }) => {
                      const isSelected = captionBgColor === value;
                      const isTransparent = value === 'transparent';
                      const light = isLightColor(value);
                      return (
                        <FocusableSwatchBtn
                          key={value}
                          focusKey={`sub-app-bgcolor-${value}`}
                          isSelected={isSelected}
                          isTransparent={isTransparent}
                          light={light}
                          label={label}
                          style={{
                            background: isTransparent
                              ? 'linear-gradient(45deg, #444 25%, transparent 25%), linear-gradient(-45deg, #444 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #444 75%), linear-gradient(-45deg, transparent 75%, #444 75%)'
                              : value,
                            backgroundSize: isTransparent ? '8px 8px' : 'auto',
                            backgroundPosition: isTransparent ? '0 0, 0 4px, 4px -4px, -4px 0' : 'auto',
                            backgroundColor: isTransparent ? '#222' : 'transparent'
                          }}
                          onClick={() => onCaptionBgColorChange?.(value)}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Background Opacity Grid */}
                <div className="px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50 mb-2">Background opacity</p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {OPACITIES.map((opacity) => {
                      const isSelected = captionBgOpacity === opacity;
                      const isDisabled = captionBgColor === 'transparent';
                      return (
                        <FocusableOpacityBtn
                          key={opacity}
                          focusKey={`sub-app-opacity-${opacity}`}
                          isSelected={isSelected}
                          isDisabled={isDisabled}
                          label={`${Math.round(opacity * 100)}%`}
                          onClick={() => onCaptionBgOpacityChange?.(opacity)}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
          </FocusContext.Provider>
        </>
      )}
    </div>
  );
}

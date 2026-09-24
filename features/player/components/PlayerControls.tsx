"use client";

/**
 * PlayerControls
 *
 * TOP BAR (shown on hover): title only — no on-screen Back button, this is a
 * TV remote app and the physical Back key already handles that.
 *
 * PROGRESS ROW:
 *   [track——●————————————]                                     01:22:12
 *
 * BOTTOM ROW:
 *   [<<]  [▶]  [>>]  [🔊]     Subtitles  Quality  Speed  Episodes  Next Episode
 *
 * Right-side actions are labeled icon+text buttons (icon left, label right,
 * same row) rather than bare icon glyphs, and Quality/Speed/Audio are three
 * separate direct-access buttons instead of one combined "Settings" gear —
 * one press to reach any setting instead of an extra hub-menu step.
 *
 * All icons use /public/player-icons/ PNGs via PlayerIcon component, except
 * Quality/Speed/Audio which have no dedicated asset and are small hand-drawn
 * inline SVGs. Play/Pause/Mute use inline SVGs (no separate asset needed).
 */

import React, { useState, useRef, useEffect } from 'react';
import { ProgressBar } from './ProgressBar';
import { PlayerIcon } from './PlayerIcon';
import { SubtitleSelector } from './SubtitleSelector';
import { PLAYBACK_SPEEDS } from '../constants/player.constants';
import { useFocusable, setFocus, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { analyticsService } from '@/shared/analytics';
import { EVENT_NAMES } from '@/shared/analytics/constants/analytics.constants';
import type {
  QualityOption,
  AudioTrack,
  SubtitleTrack,
  PlaybackSpeed,
  CaptionSize,
  ThumbnailCue,
} from '../model/types';

// ── Icon button wrapper ────────────────────────────────────────────────────────

interface IconBtnProps {
  onClick?: () => void;
  label: string;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  isVisible?: boolean;
  focusKey?: string;
}

function IconBtn({ onClick, label, children, active = false, disabled = false, isVisible = true, focusKey }: IconBtnProps) {
  const { ref, focused } = useFocusable({
    focusKey,
    focusable: isVisible && !disabled,
    onEnterPress: onClick,
    onArrowPress: (direction) => {
      if (direction === 'up') {
        setFocus('player-seekbar');
        return false;
      }
      if (direction === 'down') {
        return false;
      }
      return true;
    }
  });

  return (
    <button
      ref={ref}
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className={`
        flex items-center justify-center gap-2 px-3.5 py-2 rounded-full transition-all duration-150 outline-none
        hover:bg-theme_1/10 active:scale-95
        ${active ? 'opacity-100' : 'opacity-90 hover:opacity-100'}
        ${disabled ? 'pointer-events-none opacity-40' : ''}
        ${focused ? 'ring-[3px] ring-white bg-white/20 scale-[1.1] shadow-2xl z-30 opacity-100' : ''}
      `}
    >
      {children}
    </button>
  );
}

// ── Small hand-drawn icons for buttons with no dedicated asset in
// /public/player-icons/ (same approach as ChevronLeft/RightSmall above) ─────

function QualityIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
      <rect x="3" y="5" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function SpeedIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="13" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 13L16 9M9 4h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function AudioTrackIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
      <path d="M4 14v-4M9 17v-10M14 20v-16M19 14v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

interface SettingsOptionRowProps {
  label: string;
  isActive: boolean;
  focusKey?: string;
  isVisible?: boolean;
  onClick: () => void;
}

function SettingsOptionRow({ label, isActive, focusKey, isVisible = true, onClick }: SettingsOptionRowProps) {
  const { ref, focused } = useFocusable({
    focusKey,
    focusable: isVisible,
    onEnterPress: onClick
  });

  return (
    <button
      ref={ref}
      onClick={onClick}
      className={`w-full text-left px-4 py-3 text-sm transition-colors outline-none ${isActive
        ? 'text-theme_13_samecolour bg-theme_1/10 font-semibold'
        : 'text-theme_1 hover:bg-theme_1/10'
        } ${focused ? 'bg-neutral-800 ring-2 ring-inset ring-white font-bold' : ''}`}
    >
      {label}
    </button>
  );
}

interface SettingsSelectorProps {
  qualities: QualityOption[];
  activeQualityId: number;
  onQualityChange: (id: number) => void;
  audioTracks: AudioTrack[];
  activeAudioTrackId: number;
  onAudioChange: (id: number) => void;
  speed: PlaybackSpeed;
  onSpeedChange: (speed: PlaybackSpeed) => void;
  /** Called whenever the dropdown opens or closes — used to suppress seekbar thumbnail */
  onOpenChange?: (isOpen: boolean) => void;
  /** Bumped by the parent to force this dropdown closed (e.g. on Back/Escape) —
   * `open` is this component's own internal state, not controlled by the
   * parent, so a plain boolean/counter prop change is what triggers it. */
  forceClose?: number;
  isVisible?: boolean;
}

/**
 * Renders as three separate labeled trigger buttons (Quality / Audio / Speed)
 * — not one combined "Settings" gear with a sub-menu hub — each opening the
 * same popup directly at its own option list. Matches the reference OTT
 * design: direct, one-press access per setting instead of a gear icon that
 * hides everything behind an extra navigation step.
 */
function SettingsSelector({
  qualities,
  activeQualityId,
  onQualityChange,
  audioTracks,
  activeAudioTrackId,
  onAudioChange,
  speed,
  onSpeedChange,
  onOpenChange,
  forceClose,
  isVisible = true,
}: SettingsSelectorProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'quality' | 'audio' | 'speed'>('quality');
  const lastTriggerKeyRef = useRef('menu-trigger-quality');

  // Focus boundary while open: without this, norigin's default nearest-
  // neighbor search can wander off this popup onto the still-focusable
  // (merely visually occluded, z-50 popup sits above them) PlayerControls
  // buttons underneath — same fix already applied to EpisodesPanel for the
  // identical overlay-over-controls shape. `focusable: open` keeps this a
  // no-op while closed, since this component never unmounts.
  const { ref: settingsBoundaryRef, focusKey: settingsPanelFocusKey } = useFocusable({
    focusKey: 'settings-panel',
    isFocusBoundary: true,
    focusable: open,
  });

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        if (view === 'quality' && qualities.length > 0) setFocus(`opt-quality-${qualities[0].id}`);
        else if (view === 'audio' && audioTracks.length > 0) setFocus(`opt-audio-${audioTracks[0].id}`);
        else if (view === 'speed') setFocus(`opt-speed-${PLAYBACK_SPEEDS[0]}`);
      }, 50);
    } else {
      setTimeout(() => {
        if (isVisible) setFocus(lastTriggerKeyRef.current);
      }, 50);
    }
  }, [open, view, isVisible, qualities, audioTracks]);

  const setOpenWithNotify = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
    if (next) {
      analyticsService.track(EVENT_NAMES.PLAYER_SETTINGS_OPENED, {});
    }
  };

  const handleClose = () => setOpenWithNotify(false);

  const openView = (v: 'quality' | 'audio' | 'speed', triggerKey: string) => {
    lastTriggerKeyRef.current = triggerKey;
    setView(v);
    setOpenWithNotify(true);
  };

  const isFirstForceCloseRef = useRef(true);
  useEffect(() => {
    if (isFirstForceCloseRef.current) {
      isFirstForceCloseRef.current = false;
      return;
    }
    setOpen(false);
    onOpenChange?.(false);
  }, [forceClose]);

  return (
    <div className="relative flex items-center gap-2.5 sm:gap-4">
      <IconBtn
        focusKey="menu-trigger-quality"
        onClick={() => openView('quality', 'menu-trigger-quality')}
        label="Quality"
        isVisible={isVisible}
        active={open && view === 'quality'}
      >
        <QualityIcon />
        <span className="text-sm sm:text-base font-medium text-theme_1/90 whitespace-nowrap">Quality</span>
      </IconBtn>

      {audioTracks.length > 1 && (
        <IconBtn
          focusKey="menu-trigger-audio"
          onClick={() => openView('audio', 'menu-trigger-audio')}
          label="Audio"
          isVisible={isVisible}
          active={open && view === 'audio'}
        >
          <AudioTrackIcon />
          <span className="text-sm sm:text-base font-medium text-theme_1/90 whitespace-nowrap">Audio</span>
        </IconBtn>
      )}

      <IconBtn
        focusKey="menu-trigger-speed"
        onClick={() => openView('speed', 'menu-trigger-speed')}
        label="Speed"
        isVisible={isVisible}
        active={open && view === 'speed'}
      >
        <SpeedIcon />
        <span className="text-sm sm:text-base font-medium text-theme_1/90 whitespace-nowrap">Speed</span>
      </IconBtn>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={handleClose} />
          <FocusContext.Provider value={settingsPanelFocusKey}>
          <div
            ref={settingsBoundaryRef as any}
            className="absolute bottom-full right-0 mb-3 bg-[#141414]/98 border border-theme_1/15 rounded-xl overflow-hidden min-w-[220px] z-50 shadow-2xl backdrop-blur-md player-menu-pop-in"
          >
            <div className="px-4 py-3 border-b border-theme_1/10">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-theme_1/50">
                {view === 'quality' ? 'Quality' : view === 'audio' ? 'Audio' : 'Speed'}
              </p>
            </div>

            {view === 'quality' && (
              <div className="py-1 max-h-72 overflow-y-auto">
                {(qualities.length > 0 ? qualities : [{ id: -1, label: 'Auto', height: null, bitrate: null, isAuto: true }]).map((q) => (
                  <SettingsOptionRow
                    key={q.id}
                    focusKey={`opt-quality-${q.id}`}
                    label={q.label}
                    isActive={q.id === activeQualityId}
                    isVisible={isVisible && open}
                    onClick={() => {
                      onQualityChange(q.id);
                      analyticsService.track(EVENT_NAMES.PLAYER_QUALITY_CHANGED, {
                        quality_id: q.id,
                        quality_label: q.label,
                        is_auto: q.isAuto ?? false,
                      });
                      handleClose();
                    }}
                  />
                ))}
              </div>
            )}

            {view === 'audio' && (
              <div className="py-1 max-h-72 overflow-y-auto">
                {audioTracks.map((track) => (
                  <SettingsOptionRow
                    key={track.id}
                    focusKey={`opt-audio-${track.id}`}
                    label={track.label}
                    isActive={track.id === activeAudioTrackId}
                    isVisible={isVisible && open}
                    onClick={() => {
                      onAudioChange(track.id);
                      handleClose();
                    }}
                  />
                ))}
              </div>
            )}

            {view === 'speed' && (
              <div className="py-1">
                {PLAYBACK_SPEEDS.map((s) => (
                  <SettingsOptionRow
                    key={s}
                    focusKey={`opt-speed-${s}`}
                    label={s === 1 ? 'Normal' : `${s}x`}
                    isActive={s === speed}
                    isVisible={isVisible && open}
                    onClick={() => {
                      onSpeedChange(s);
                      analyticsService.track(EVENT_NAMES.PLAYER_SPEED_CHANGED, {
                        speed: s,
                        speed_label: s === 1 ? 'Normal' : `${s}x`,
                      });
                      handleClose();
                    }}
                  />
                ))}
              </div>
            )}
          </div>
          </FocusContext.Provider>
        </>
      )}
    </div>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface PlayerControlsProps {
  isVisible: boolean;
  // Content metadata
  title?: string;
  onBack?: () => void;
  onMenuOpenChange?: (isOpen: boolean) => void;
  /** Bumped by the parent (e.g. on Back/Escape) to force-close any open Settings/
   * Subtitle submenu without touching controlsVisible — see OTTPlayer's Back-key
   * handler. A plain boolean/counter "signal" prop since the open/closed state
   * itself intentionally stays local to this component. */
  forceCloseMenus?: number;
  showCertificate?: boolean;

  // Playback state
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  buffered: number;

  // Volume
  volume: number;
  isMuted: boolean;

  // Speed
  speed: PlaybackSpeed;

  // Screen modes
  isFullscreen: boolean;
  isPipActive: boolean;
  isPipSupported: boolean;

  // Tracks
  qualities: QualityOption[];
  activeQualityId: number;
  audioTracks: AudioTrack[];
  activeAudioTrackId: number;
  subtitleTracks: SubtitleTrack[];
  activeSubtitleTrackId: number;
  captionSize: CaptionSize;
  captionFontSize: number;
  captionTextColor: string;
  captionBgColor: string;
  captionBgOpacity: number;

  // Thumbnails
  thumbnailCues: ThumbnailCue[];
  isThumbnailEnabled: boolean;

  // Ad markers
  adCuePoints: number[];

  // Handlers
  onPlayPause: () => void;
  onSeek: (seconds: number) => void;
  onForward: () => void;
  onBackward: () => void;
  onVolumeChange: (v: number) => void;
  onMuteToggle: () => void;
  onSpeedChange: (s: PlaybackSpeed) => void;
  onQualityChange: (id: number) => void;
  onAudioChange: (id: number) => void;
  onSubtitleChange: (id: number) => void;
  onCaptionSizeChange: (size: CaptionSize) => void;
  onCaptionFontSizeChange: (size: number) => void;
  onCaptionTextColorChange: (color: string) => void;
  onCaptionBgColorChange: (color: string) => void;
  onCaptionBgOpacityChange: (opacity: number) => void;
  onFullscreenToggle: () => void;
  onPipToggle: () => void;
  onNextEpisode?: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function PlayerControls({
  isVisible,
  title,
  showCertificate = false,
  currentTime,
  duration,
  buffered,
  speed,
  isPipActive,
  isPipSupported,
  qualities,
  activeQualityId,
  audioTracks,
  activeAudioTrackId,
  subtitleTracks,
  activeSubtitleTrackId,
  captionSize,
  captionFontSize,
  captionTextColor,
  captionBgColor,
  captionBgOpacity,
  thumbnailCues,
  isThumbnailEnabled,
  adCuePoints,
  onPlayPause,
  onSeek,
  onSpeedChange,
  onQualityChange,
  onAudioChange,
  onSubtitleChange,
  onCaptionSizeChange,
  onCaptionFontSizeChange,
  onCaptionTextColorChange,
  onCaptionBgColorChange,
  onCaptionBgOpacityChange,
  onPipToggle,
  onNextEpisode,
  onMenuOpenChange,
  forceCloseMenus,
}: PlayerControlsProps) {
  // Stable focus target for OTTPlayer's setFocus() calls.
  // trackChildren + saveLastFocusedChild means setFocus('player-controls-row')
  // resolves to whichever child was last focused, or the seekbar on first entry.
  const { ref: controlsRowRef } = useFocusable({
    focusKey: 'player-controls-row',
    focusable: false,
    trackChildren: true,
    saveLastFocusedChild: true,
    preferredChildFocusKey: 'player-seekbar',
  });

  const [showSettings, setShowSettings] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(false);

  useEffect(() => {
    onMenuOpenChange?.(showSettings || showSubtitles);
  }, [showSettings, showSubtitles, onMenuOpenChange]);

  // Previously, Back/Escape had no way to close an open Settings/Subtitle
  // submenu — it only ever hid the whole control bar, leaving this open state
  // (and onMenuOpenChange's isOpen=true) stuck forever, so the menu silently
  // popped back open the next time controls reappeared and auto-hide stayed
  // permanently disabled. Skips the initial mount (forceCloseMenus starts
  // undefined) so this doesn't fire a redundant no-op close on first render.
  const isFirstForceCloseRef = useRef(true);
  useEffect(() => {
    if (isFirstForceCloseRef.current) {
      isFirstForceCloseRef.current = false;
      return;
    }
    setShowSettings(false);
    setShowSubtitles(false);
  }, [forceCloseMenus]);

  // Suppress seekbar VTT thumbnail whenever any control overlay is active
  const suppressThumbnail = showSettings || showSubtitles;

  const progressBarElement = (
    <ProgressBar
      currentTime={currentTime}
      duration={duration}
      buffered={buffered}
      thumbnailCues={thumbnailCues}
      isThumbnailEnabled={isThumbnailEnabled}
      suppressThumbnail={suppressThumbnail}
      adCuePoints={adCuePoints}
      isVisible={isVisible}
      onSeek={onSeek}
      onPlayPause={onPlayPause}
    />
  );

  return (
    <div className="absolute inset-0 z-20 flex flex-col">
      {/* ── Top bar: gradient + back + title (placed comfortably within TV safe area) ── */}
      {!showCertificate && (
        <div
          className="flex items-center gap-3 px-8 sm:px-12 lg:px-16 pt-10 sm:pt-12 lg:pt-14 pb-12"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {title && (
            <span className="text-theme_1 font-bold text-2xl sm:text-3xl lg:text-4xl tracking-wide truncate drop-shadow-md">
              {title}
            </span>
          )}
        </div>
      )}

      {/* ── Middle transparent area — passes mouse events through ──────────── */}
      <div className="flex-1 pointer-events-none" />

      {/* ── Bottom bar: progress + icons ────────────────────────────────────── */}
      <div
        className="flex flex-col px-8 sm:px-12 lg:px-16 pb-6 sm:pb-8 pt-12"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.5) 65%, transparent 100%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Progress row (Always top row) ────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-2 w-full">
          <div className="flex-1">
            {progressBarElement}
          </div>
        </div>

        {/* ── Control icons row ─────────────────────────────────────────────
            No left-side Backward/Play-Pause/Forward/Volume group — this is a
            TV remote app: OK on the player background already toggles
            play/pause directly (see OTTPlayer's ott-player-main
            onEnterPress), the seek bar's own Left/Right handles ±10s once
            focused, and volume is the TV remote's own hardware buttons, not
            an app-level control. Matches the reference design, which shows
            none of these either. */}
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-y-2.5 w-full">
          <div
            ref={controlsRowRef as any}
            className="flex items-center gap-2.5 sm:gap-4 md:gap-5 shrink-0"
          >
            {/* Captions / Subtitle selector */}
            {subtitleTracks && subtitleTracks.length > 0 && (
              <div className="relative">
                <SubtitleSelector
                  tracks={subtitleTracks}
                  activeTrackId={activeSubtitleTrackId}
                  captionSize={captionSize}
                  captionFontSize={captionFontSize}
                  captionTextColor={captionTextColor}
                  captionBgColor={captionBgColor}
                  captionBgOpacity={captionBgOpacity}
                  onSelect={(id: number) => {
                    onSubtitleChange(id);
                    const selectedTrack = subtitleTracks?.find((t) => t.id === id);
                    analyticsService.track(EVENT_NAMES.PLAYER_CC_CHANGED, {
                      subtitle_id: id,
                      subtitle_label: selectedTrack?.label ?? '',
                      is_off: id === -1 || id === 0,
                    });
                  }}
                  onCaptionSizeChange={onCaptionSizeChange}
                  onCaptionFontSizeChange={onCaptionFontSizeChange}
                  onCaptionTextColorChange={onCaptionTextColorChange}
                  onCaptionBgOpacityChange={onCaptionBgOpacityChange}
                  onOpenChange={setShowSubtitles}
                  forceClose={forceCloseMenus}
                  isVisible={isVisible}
                  renderTrigger={(onClick) => (
                    <IconBtn focusKey="subtitles-trigger-btn" onClick={onClick} label="Subtitles" isVisible={isVisible}>
                      <PlayerIcon name="captions" size={26} />
                      <span className="text-sm sm:text-base font-medium text-theme_1/90 whitespace-nowrap">Subtitles</span>
                    </IconBtn>
                  )}
                />
              </div>
            )}

            {/* Quality / Audio / Speed — three separate direct-access buttons */}
            <SettingsSelector
              qualities={qualities}
              activeQualityId={activeQualityId}
              onQualityChange={onQualityChange}
              audioTracks={audioTracks}
              activeAudioTrackId={activeAudioTrackId}
              onAudioChange={onAudioChange}
              speed={speed}
              onSpeedChange={onSpeedChange}
              onOpenChange={setShowSettings}
              forceClose={forceCloseMenus}
              isVisible={isVisible}
            />


            {/* Next episode */}
            {onNextEpisode && (
              // Wrapped in a zero-arg call — onClick is natively invoked with a
              // MouseEvent, and handleNextEpisodePlay's optional startAtSeconds
              // param would otherwise silently receive that event object on a
              // real mouse/pointer click instead of staying undefined.
              <IconBtn onClick={() => onNextEpisode()} label="Next episode" isVisible={isVisible}>
                <PlayerIcon name="next-episode" size={26} />
                <span className="text-sm sm:text-base font-medium text-theme_1/90 whitespace-nowrap">Next Episode</span>
              </IconBtn>
            )}

            {/* No on-screen Fullscreen toggle — this is a TV app, the video
                already always fills the whole screen (see OTTPlayer's
                container sizing), there's no windowed state to toggle
                between. */}
          </div>
        </div>
      </div>
    </div>
  );
}

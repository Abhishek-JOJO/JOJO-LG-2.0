"use client";

/**
 * PlayerControls
 *
 * UI matches the screenshot exactly:
 *
 * TOP BAR (shown on hover):
 *   ← Title
 *
 * PROGRESS ROW:
 *   [track——●————————————] "Episodes"  01:22:12
 *
 * BOTTOM ROW:
 *   [<<]  [▶]  [>>]  [🔊]          [CC] [⚙] [👍] [🔁] [⏭] [⛶]
 *
 * All icons use /public/player-icons/ PNGs via PlayerIcon component.
 * Play/Pause/Mute use inline SVGs (no separate asset needed).
 */

import React, { useState, useRef, useEffect } from 'react';
import { ProgressBar } from './ProgressBar';
import { PlayerIcon } from './PlayerIcon';
import { SubtitleSelector } from './SubtitleSelector';
import { PLAYBACK_SPEEDS } from '../constants/player.constants';
import { useFocusable, setFocus } from '@noriginmedia/norigin-spatial-navigation';
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
import { LOGOS } from '@/lib/constants/assets';
import JOJOCommonImage from '@/components/ui/JOJOCommonImage';

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
    onEnterPress: onClick
  });

  return (
    <button
      ref={ref}
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className={`
        flex items-center justify-center p-1.5 rounded transition-all duration-150
        hover:bg-theme_1/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme_1/40
        ${active ? 'opacity-100' : 'opacity-90 hover:opacity-100'}
        ${disabled ? 'pointer-events-none opacity-40' : ''}
        ${focused ? 'ring-2 ring-theme_1/40 bg-theme_1/10 scale-[1.15] shadow-lg z-10' : ''}
      `}
    >
      {children}
    </button>
  );
}

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

interface SettingsMenuRowProps {
  label: string;
  value: string;
  focusKey?: string;
  isVisible?: boolean;
  onClick: () => void;
}

function SettingsMenuRow({ label, value, focusKey, isVisible = true, onClick }: SettingsMenuRowProps) {
  const { ref, focused } = useFocusable({
    focusKey,
    focusable: isVisible,
    onEnterPress: onClick
  });

  return (
    <button
      ref={ref}
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-4 px-4 py-3.5 text-left transition-colors ${focused ? 'bg-theme_1/20 outline-none' : 'hover:bg-theme_1/10'}`}
    >
      <span className="text-sm text-theme_1 font-medium">{label}</span>
      <span className="flex items-center gap-2 min-w-0 text-theme_1/60">
        <span className="text-xs truncate max-w-[130px]">{value}</span>
        <ChevronRightSmall />
      </span>
    </button>
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
      className={`w-full text-left px-4 py-3 text-sm transition-colors ${isActive
        ? 'text-theme_13_samecolour bg-theme_1/10 font-semibold'
        : 'text-theme_1 hover:bg-theme_1/10'
        } ${focused ? 'bg-theme_1/20 outline-none' : ''}`}
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
  renderTrigger: (onClick: () => void) => React.ReactNode;
  /** Called whenever the dropdown opens or closes — used to suppress seekbar thumbnail */
  onOpenChange?: (isOpen: boolean) => void;
  isVisible?: boolean;
}

function SettingsSelector({
  qualities,
  activeQualityId,
  onQualityChange,
  audioTracks,
  activeAudioTrackId,
  onAudioChange,
  speed,
  onSpeedChange,
  renderTrigger,
  onOpenChange,
  isVisible = true,
}: SettingsSelectorProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'main' | 'quality' | 'audio' | 'speed'>('main');

  const activeQuality = qualities.find((q) => q.id === activeQualityId) ?? qualities[0];
  const activeAudio = audioTracks.find((t) => t.id === activeAudioTrackId) ?? audioTracks[0];

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        if (view === 'main') setFocus(qualities.length > 0 ? 'menu-row-quality' : 'menu-row-speed');
        else if (view === 'quality' && qualities.length > 0) setFocus(`opt-quality-${qualities[0].id}`);
        else if (view === 'audio' && audioTracks.length > 0) setFocus(`opt-audio-${audioTracks[0].id}`);
        else if (view === 'speed') setFocus(`opt-speed-${PLAYBACK_SPEEDS[0]}`);
      }, 50);
    } else {
      setTimeout(() => {
        if (isVisible) setFocus('settings-trigger-btn');
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

  const handleClose = () => {
    setOpenWithNotify(false);
    setView('main');
  };

  return (
    <div className="relative">
      {renderTrigger(() => setOpenWithNotify(!open))}

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={handleClose} />
          <div className="absolute bottom-full right-0 mb-3 bg-[#141414]/98 border border-theme_1/15 rounded-xl overflow-hidden min-w-[280px] z-50 shadow-2xl backdrop-blur-md player-menu-pop-in">
            {view === 'main' && (
              <div className="py-1">
                <div className="px-4 py-3 border-b border-theme_1/10">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-theme_1/50">
                    Playback Settings
                  </p>
                </div>

                {qualities.length > 0 && (
                  <SettingsMenuRow
                    focusKey="menu-row-quality"
                    label="Quality"
                    value={activeQuality?.isAuto ? 'Auto' : (activeQuality?.label ?? 'Auto')}
                    isVisible={isVisible && open}
                    onClick={() => setView('quality')}
                  />
                )}

                {audioTracks.length > 1 && (
                  <SettingsMenuRow
                    focusKey="menu-row-audio"
                    label="Audio"
                    value={activeAudio?.label ?? 'Default'}
                    isVisible={isVisible && open}
                    onClick={() => setView('audio')}
                  />
                )}

                <SettingsMenuRow
                  focusKey="menu-row-speed"
                  label="Speed"
                  value={speed === 1 ? 'Normal' : `${speed}x`}
                  isVisible={isVisible && open}
                  onClick={() => setView('speed')}
                />
              </div>
            )}

            {view === 'quality' && (
              <div className="py-1 max-h-72 overflow-y-auto">
                <button
                  onClick={() => setView('main')}
                  className="w-full px-4 py-3 text-left text-sm text-theme_1/70 hover:bg-theme_1/5 border-b border-theme_1/10 flex items-center gap-2"
                >
                  <ChevronLeftSmall />
                  Quality
                </button>
                {qualities.map((q) => (
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
                <button
                  onClick={() => setView('main')}
                  className="w-full px-4 py-3 text-left text-sm text-theme_1/70 hover:bg-theme_1/5 border-b border-theme_1/10 flex items-center gap-2"
                >
                  <ChevronLeftSmall />
                  Audio
                </button>
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
                <button
                  onClick={() => setView('main')}
                  className="w-full px-4 py-3 text-left text-sm text-theme_1/70 hover:bg-theme_1/5 border-b border-theme_1/10 flex items-center gap-2"
                >
                  <ChevronLeftSmall />
                  Speed
                </button>
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
  onEpisodes?: () => void;
  onNextEpisode?: () => void;
  onRate?: () => void;
  isRated?: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function PlayerControls({
  isVisible,
  title,
  onBack,
  showCertificate = false,
  isPlaying,
  currentTime,
  duration,
  buffered,
  volume,
  isMuted,
  speed,
  isFullscreen,
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
  onForward,
  onBackward,
  onVolumeChange,
  onMuteToggle,
  onSpeedChange,
  onQualityChange,
  onAudioChange,
  onSubtitleChange,
  onCaptionSizeChange,
  onCaptionFontSizeChange,
  onCaptionTextColorChange,
  onCaptionBgColorChange,
  onCaptionBgOpacityChange,
  onFullscreenToggle,
  onPipToggle,
  onEpisodes,
  onNextEpisode,
  onRate,
  onMenuOpenChange,
  isRated = false,
}: PlayerControlsProps) {
  const [showVolume, setShowVolume] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(false);

  useEffect(() => {
    onMenuOpenChange?.(showSettings || showSubtitles);
  }, [showSettings, showSubtitles, onMenuOpenChange]);

  const isDraggingVolume = useRef(false);
  const isHoveringVolume = useRef(false);
  const volumeHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearVolumeTimer = () => {
    if (volumeHideTimer.current) {
      clearTimeout(volumeHideTimer.current);
      volumeHideTimer.current = null;
    }
  };

  const handleVolumeMouseEnter = () => {
    isHoveringVolume.current = true;
    clearVolumeTimer();
    setShowVolume(true);
  };

  const handleVolumeMouseLeave = () => {
    isHoveringVolume.current = false;
    clearVolumeTimer();
    if (!isDraggingVolume.current) {
      volumeHideTimer.current = setTimeout(() => {
        if (!isHoveringVolume.current && !isDraggingVolume.current) {
          setShowVolume(false);
        }
      }, 200);
    }
  };

  useEffect(() => {
    const handleRelease = () => {
      if (isDraggingVolume.current) {
        isDraggingVolume.current = false;
        if (!isHoveringVolume.current) {
          setShowVolume(false);
        }
      }
    };
    window.addEventListener('mouseup', handleRelease);
    window.addEventListener('touchend', handleRelease);
    return () => {
      window.removeEventListener('mouseup', handleRelease);
      window.removeEventListener('touchend', handleRelease);
      if (volumeHideTimer.current) {
        clearTimeout(volumeHideTimer.current);
      }
    };
  }, []);

  // Suppress seekbar VTT thumbnail whenever any control overlay is active
  const suppressThumbnail = showVolume || showSettings || showSubtitles;

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
    />
  );

  return (
    <div className="absolute inset-0 z-20 flex flex-col">
      {/* ── Top bar: gradient + back + title ───────────────────────────────── */}
      {!showCertificate && (
        <div
          className="flex items-center gap-3 px-4 pt-4 pb-10"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.80) 0%, transparent 100%)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {onBack && (
            <IconBtn onClick={onBack} label="Back" isVisible={isVisible}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white/90 group-hover:text-white transition-colors"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </IconBtn>
          )}
          {title && (
            <span className="text-theme_1 font-semibold text-base tracking-wide truncate drop-shadow">
              {title}
            </span>
          )}
        </div>
      )}

      {/* ── Middle transparent area — passes mouse events through ──────────── */}
      <div className="flex-1 pointer-events-none" />

      {/* ── Bottom bar: progress + icons ────────────────────────────────────── */}
      <div
        className="flex flex-col px-4 pb-4 pt-12"
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

        {/* ── Control icons row ────────────────────────────────────────────── */}
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-y-2.5 w-full">
          {/* ── Left group ─────────────────────────────────────────────────── */}
          <div className="flex items-center gap-2.5 sm:gap-4 md:gap-5 shrink-0">
            {/* Backward 10s */}
            <IconBtn onClick={onBackward} label="Seek backward 10 seconds" isVisible={isVisible}>
              <JOJOCommonImage
                src={LOGOS.BACKWARD_ICON}
                width={25}
                height={25}
                className="w-5.5 h-5.5 object-contain transition-all duration-150"
              />
            </IconBtn>

            {/* Play / Pause — larger for visual hierarchy, primary action */}
            <IconBtn focusKey="play-pause-btn" onClick={onPlayPause} label={isPlaying ? 'Pause' : 'Play'} isVisible={isVisible}>
              <PlayerIcon name={isPlaying ? 'pause' : 'play'} size={32} />
            </IconBtn>

            {/* Forward 10s */}
            <IconBtn onClick={onForward} label="Seek forward 10 seconds" isVisible={isVisible}>
              <JOJOCommonImage
                src={LOGOS.FORWARD_ICON}
                width={25}
                height={25}
                className="w-5.5 h-5.5 object-contain transition-all duration-150"
              />
            </IconBtn>

            {/* Volume */}
            <div
              className="relative flex items-center"
              onMouseEnter={handleVolumeMouseEnter}
              onMouseLeave={handleVolumeMouseLeave}
            >
              <IconBtn
                onClick={() => {
                  onMuteToggle();
                  analyticsService.track(EVENT_NAMES.PLAYER_MUTE_TOGGLED, {
                    is_muted: !isMuted,
                    source: 'player_controls',
                  });
                }}
                label={isMuted ? 'Unmute' : 'Mute'}
                isVisible={isVisible}
              >
                <PlayerIcon name={isMuted || volume === 0 ? 'mute' : 'unmute'} size={24} />
              </IconBtn>

              {/* Horizontal volume popover slider */}
              {showVolume && (
                <div
                  className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-4 py-3 bg-black/95 border border-theme_1/10 
                  rounded-full flex items-center justify-center shadow-2xl z-50 transition-all duration-200"
                  style={{ width: '130px', height: '25px' }}
                >
                  <div className="relative w-24 h-1 bg-theme_1/20 rounded-full flex items-center justify-center">
                    {/* The active filled portion (left of track to thumb) */}
                    <div
                      className="absolute left-0 h-full bg-theme_1 rounded-full"
                      style={{ width: `${isMuted ? 0 : volume * 100}%` }}
                    />

                    {/* range input horizontal (no rotation needed) */}
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={isMuted ? 0 : volume}
                      onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                      onMouseDown={() => {
                        isDraggingVolume.current = true;
                      }}
                      onTouchStart={() => {
                        isDraggingVolume.current = true;
                      }}
                      style={{
                        WebkitAppearance: 'none',
                        width: '96px',
                        background: 'transparent',
                      }}
                      className="absolute cursor-pointer outline-none focus:outline-none [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-theme_1 [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-theme_1 [&::-moz-range-thumb]:border-0"
                    />
                  </div>
                  {/* Tooltip arrow pointing left */}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[6px] border-r-black/95" />
                </div>
              )}
            </div>
          </div>

          {/* ── Spacer ─────────────────────────────────────────────────────── */}
          <div className="flex-grow hidden sm:block" />

          {/* ── Right group ────────────────────────────────────────────────── */}
          <div className="flex items-center gap-2.5 sm:gap-4 md:gap-5 shrink-0">
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
                  isVisible={isVisible}
                  renderTrigger={(onClick) => (
                    <IconBtn onClick={onClick} label="Subtitles" isVisible={isVisible}>
                      <PlayerIcon name="captions" size={24} />
                    </IconBtn>
                  )}
                />
              </div>
            )}

            {/* Settings — quality + speed + audio combined */}
            <div className="relative">
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
                isVisible={isVisible}
                renderTrigger={(onClick) => (
                  <IconBtn focusKey="settings-trigger-btn" onClick={onClick} label="Settings" isVisible={isVisible}>
                    <PlayerIcon name="settings" size={24} />
                  </IconBtn>
                )}
              />
            </div>

            {/* Episodes */}
            {onEpisodes && (
              <IconBtn onClick={onEpisodes} label="Episodes" isVisible={isVisible}>
                <PlayerIcon name="episodes" size={24} />
              </IconBtn>
            )}

            {/* Next episode */}
            {onNextEpisode && (
              <IconBtn onClick={onNextEpisode} label="Next episode" isVisible={isVisible}>
                <PlayerIcon name="next-episode" size={24} />
              </IconBtn>
            )}

            {/* Fullscreen */}
            <IconBtn onClick={onFullscreenToggle} label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} isVisible={isVisible}>
              <PlayerIcon name={isFullscreen ? 'exit-fullscreen' : 'fullscreen'} size={24} />
            </IconBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

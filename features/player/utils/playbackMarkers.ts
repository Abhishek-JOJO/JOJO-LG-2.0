/**
 * Parse playback API time strings (e.g. "00:03:27", "02:15:06") to seconds.
 */
export function parsePlaybackTimeToSeconds(
  timeStr: string | undefined | null
): number {
  if (!timeStr || timeStr.trim() === '') return 0;
  const parts = timeStr.trim().split(':').map(Number);
  if (parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return h * 3600 + m * 60 + s;
  }
  if (parts.length === 2) {
    const [m, s] = parts;
    return m * 60 + s;
  }
  return Number(timeStr) || 0;
}

function hasValue(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Map playback API skip/next fields into VideoDetails-compatible shapes.
 */
export function mapPlaybackMarkers(playback: {
  skip_intro?: {
    visible_at?: string;
    visible_end?: string;
    duration?: string;
  } | null;
  skip_recap?: {
    visible_at?: string;
    visible_end?: string;
    duration?: string;
  } | null;
  next_title?: {
    visible_at?: string;
    visible_end?: string;
    start_at?: string;
  } | null;
}) {
  const skipIntro =
    hasValue(playback.skip_intro?.visible_at) &&
    hasValue(playback.skip_intro?.duration)
      ? {
          visibleAtSeconds: parsePlaybackTimeToSeconds(playback.skip_intro!.visible_at),
          visibleEndSeconds: hasValue(playback.skip_intro?.visible_end)
            ? parsePlaybackTimeToSeconds(playback.skip_intro!.visible_end)
            : parsePlaybackTimeToSeconds(playback.skip_intro!.duration),
          durationSeconds: parsePlaybackTimeToSeconds(playback.skip_intro!.duration),
        }
      : null;

  const skipRecap =
    hasValue(playback.skip_recap?.visible_at) &&
    hasValue(playback.skip_recap?.duration)
      ? {
          visibleAtSeconds: parsePlaybackTimeToSeconds(playback.skip_recap!.visible_at),
          visibleEndSeconds: hasValue(playback.skip_recap?.visible_end)
            ? parsePlaybackTimeToSeconds(playback.skip_recap!.visible_end)
            : parsePlaybackTimeToSeconds(playback.skip_recap!.duration),
          durationSeconds: parsePlaybackTimeToSeconds(playback.skip_recap!.duration),
        }
      : null;

  const nextTitle =
    hasValue(playback.next_title?.visible_at) &&
    hasValue(playback.next_title?.visible_end)
      ? {
          visibleAtSeconds: parsePlaybackTimeToSeconds(playback.next_title!.visible_at),
          visibleEndSeconds: parsePlaybackTimeToSeconds(playback.next_title!.visible_end),
          startAtSeconds: hasValue(playback.next_title?.start_at)
            ? parsePlaybackTimeToSeconds(playback.next_title!.start_at)
            : 0,
        }
      : null;

  return { skipIntro, skipRecap, nextTitle };
}

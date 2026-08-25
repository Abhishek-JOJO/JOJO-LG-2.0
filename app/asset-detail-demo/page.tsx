"use client";

/**
 * Asset Detail Demo Page — /asset-detail-demo
 *
 * Shows a simple asset detail view with a "Watch Now" button.
 * Clicking "Watch Now" calls the /playback API with { asset_id: 1692, is_subscribe: true },
 * stores the playback response in sessionStorage, and navigates to /watch/demo.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@store/useAuthStore';
import { useBootstrap } from '@lib/bootstrap/BootstrapContext';
import { getPlayback } from '@features/content/api/getPlayback';
import { ROUTES } from '@lib/constants/routes';
import { logger } from '@lib/logger/logger';

// const DEMO_ASSET_ID = 1031;
const DEMO_ASSET_ID = 1692;


export default function AssetDetailDemoPage() {
  const router = useRouter();
  const { isAppReady } = useBootstrap();
  const sessionId = useAuthStore((state) => state.token);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adConfig, setAdConfig] = useState<'google_doubleclick_vmap' | 'legacy_vmap' | 'none'>('google_doubleclick_vmap');

  const handleWatchNow = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getPlayback(
        { assetId: String(DEMO_ASSET_ID), isSubscribe: true },
        sessionId ?? undefined,
      );

      if (!response?.data?.playback_url) {
        throw new Error('No playback URL received');
      }

      // Store playback response in sessionStorage for /watch/demo to read
      sessionStorage.setItem(
        'demo_playback_data',
        JSON.stringify(response.data),
      );

      // Store selected ad config in sessionStorage
      sessionStorage.setItem('demo_ad_config', adConfig);

      logger.info('[AssetDetailDemo] Playback fetched, navigating to player', {
        assetId: DEMO_ASSET_ID,
        playbackUrl: response.data.playback_url,
      });

      router.push(ROUTES.PLAYER_DEMO);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load playback';
      setError(msg);
      logger.error('[AssetDetailDemo] Playback fetch failed', { error: msg });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Loading bootstrap ──────────────────────────────────────────────────────

  if (!isAppReady) {
    return (
      <div style={styles.page}>
        <div style={styles.center}>
          <div style={styles.spinner} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={styles.muted}>Initializing…</p>
        </div>
      </div>
    );
  }

  // ── Main ───────────────────────────────────────────────────────────────────

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Poster / Thumbnail area */}
        <div style={styles.posterArea}>
          <div style={styles.posterGradient} />
          <div style={styles.posterContent}>
            <span style={styles.badge}>DEMO</span>
            <h1 style={styles.title}>Medal — S01 E01</h1>
            <p style={styles.subtitle}>Asset ID: {DEMO_ASSET_ID}</p>
          </div>
        </div>

        {/* Info */}
        <div style={styles.info}>
          <p style={styles.description}>
            Demo playback page. Clicking &quot;Watch Now&quot; will call the{' '}
            <code style={styles.code}>/playback</code> API with{' '}
            <code style={styles.code}>{'{ asset_id: 1692, is_subscribe: true }'}</code>{' '}
            and open the player with the response data.
          </p>

          {/* Metadata chips */}
          <div style={styles.chips}>
            <span style={styles.chip}>HLS Streaming</span>
            <span style={styles.chip}>VTT Thumbnails</span>
            <span style={styles.chip}>Skip Intro</span>
            <span style={styles.chip}>Ads</span>
          </div>

          {/* Ad Configuration Selector */}
          <div style={styles.selectorContainer}>
            <label style={styles.selectorLabel}>Ad Configuration</label>
            <div style={styles.optionsGrid}>
              <button
                onClick={() => setAdConfig('google_doubleclick_vmap')}
                style={{
                  ...styles.optionBtn,
                  ...(adConfig === 'google_doubleclick_vmap' ? styles.optionBtnActive : {}),
                }}
              >
                <div style={styles.optionTitle}>DoubleClick VMAP</div>
                <div style={styles.optionDesc}>Skip Ad VMAP Sample</div>
              </button>
              <button
                onClick={() => setAdConfig('legacy_vmap')}
                style={{
                  ...styles.optionBtn,
                  ...(adConfig === 'legacy_vmap' ? styles.optionBtnActive : {}),
                }}
              >
                <div style={styles.optionTitle}>Legacy VMAP</div>
                <div style={styles.optionDesc}>Original VMAP Breaks</div>
              </button>
              <button
                onClick={() => setAdConfig('none')}
                style={{
                  ...styles.optionBtn,
                  ...(adConfig === 'none' ? styles.optionBtnActive : {}),
                }}
              >
                <div style={styles.optionTitle}>No Ads</div>
                <div style={styles.optionDesc}>Bypass Ad breaks</div>
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div style={styles.errorBox}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Watch Now button */}
          <button
            onClick={handleWatchNow}
            disabled={isLoading}
            style={{
              ...styles.watchBtn,
              opacity: isLoading ? 0.7 : 1,
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? (
              <span style={styles.btnContent}>
                <div style={styles.btnSpinner} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                Loading…
              </span>
            ) : (
              <span style={styles.btnContent}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="theme_1">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Watch Now
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Inline styles (self-contained demo page) ─────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  center: {
    textAlign: 'center' as const,
  },
  spinner: {
    width: 48,
    height: 48,
    border: '3px solid rgba(255,255,255,0.15)',
    borderTopColor: '#ff6b00',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto 16px',
  },
  muted: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    margin: 0,
  },
  card: {
    maxWidth: 520,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
  },
  posterArea: {
    position: 'relative' as const,
    height: 240,
    background: 'linear-gradient(135deg, #ff6b00 0%, #ff8c42 40%, #e55d00 100%)',
    display: 'flex',
    alignItems: 'flex-end',
    padding: 24,
  },
  posterGradient: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
  },
  posterContent: {
    position: 'relative' as const,
    zIndex: 1,
  },
  badge: {
    display: 'inline-block',
    background: 'rgba(255,255,255,0.2)',
    backdropFilter: 'blur(8px)',
    color: 'theme_1',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1.5,
    padding: '4px 10px',
    borderRadius: 4,
    marginBottom: 8,
  },
  title: {
    color: 'theme_1',
    fontSize: 24,
    fontWeight: 700,
    margin: '0 0 4px 0',
    textShadow: '0 2px 8px rgba(0,0,0,0.4)',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    margin: 0,
  },
  info: {
    padding: '24px',
  },
  description: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    lineHeight: 1.6,
    margin: '0 0 16px 0',
  },
  code: {
    background: 'rgba(255,255,255,0.08)',
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: 11,
    color: '#ff8c42',
    fontFamily: "'SF Mono', 'Fira Code', monospace",
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    padding: '4px 12px',
    borderRadius: 20,
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(255,59,48,0.1)',
    border: '1px solid rgba(255,59,48,0.2)',
    color: '#ff6b6b',
    fontSize: 13,
    padding: '10px 14px',
    borderRadius: 8,
    marginBottom: 16,
  },
  watchBtn: {
    width: '100%',
    padding: '14px 24px',
    background: 'linear-gradient(135deg, #ff6b00 0%, #ff8c42 100%)',
    color: 'theme_1',
    border: 'none',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 16px rgba(255,107,0,0.3)',
  },
  btnContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnSpinner: {
    width: 18,
    height: 18,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: 'theme_1',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  selectorContainer: {
    marginBottom: 20,
  },
  selectorLabel: {
    display: 'block',
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  optionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
  },
  optionBtn: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: '8px 4px',
    textAlign: 'center' as const,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    color: 'theme_1',
    fontFamily: 'inherit',
    outline: 'none',
  },
  optionBtnActive: {
    background: 'rgba(255, 107, 0, 0.15)',
    borderColor: '#ff6b00',
    boxShadow: '0 0 12px rgba(255, 107, 0, 0.2)',
  },
  optionTitle: {
    fontSize: 11,
    fontWeight: 600,
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.4)',
  },
};

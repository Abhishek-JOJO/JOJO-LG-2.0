/**
 * VersionUpdateBanner.tsx
 *
 * Shows a fixed notification banner when a newer frontend version is detected.
 * Displays a live countdown and auto-reloads once the countdown reaches zero.
 * The banner cannot be dismissed — the reload is intentional and safe.
 *
 * Styling: glassmorphism dark theme, consistent with the rest of the app.
 * Animation: slides up from the bottom on mount (CSS keyframe).
 */

"use client";

import { useEffect, useState } from "react";
import { useVersionCheck } from "@/hooks/useVersionCheck";

// ─── Internal sub-component ───────────────────────────────────────────────────

function RefreshIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * VersionUpdateBanner
 *
 * Mount this once at the root layout level (inside Providers).
 * It renders nothing until a version mismatch is detected.
 */
export function VersionUpdateBanner() {
  const { updateAvailable, countdown } = useVersionCheck();

  // Avoid SSR/hydration mismatch — render only after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !updateAvailable) return null;

  const handleReloadNow = () => {
    // Manual reload — mark session flag to prevent the hook's loop-guard
    // from suppressing the next automatic poll after the new page loads.
    try {
      sessionStorage.setItem("jojo_version_reloaded", "1");
    } catch {
      // Ignore.
    }
    window.location.reload();
  };

  return (
    <>
      {/* Keyframe injection — scoped to avoid polluting global CSS */}
      <style>{`
        @keyframes jojo-slide-up {
          from { transform: translate(-50%, 100%); opacity: 0; }
          to   { transform: translate(-50%, 0);    opacity: 1; }
        }
        @keyframes jojo-pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.5); }
          70%  { box-shadow: 0 0 0 10px rgba(251, 191, 36, 0); }
          100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); }
        }
        @keyframes jojo-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      {/* Banner */}
      <div
        role="status"
        aria-live="polite"
        aria-label="New version available — page will reload automatically"
        style={{
          position: "fixed",
          bottom: "1.5rem",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          padding: "0.875rem 1.25rem",
          borderRadius: "1rem",
          background: "rgba(15, 15, 20, 0.88)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          border: "1px solid rgba(251, 191, 36, 0.35)",
          boxShadow:
            "0 8px 32px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(251, 191, 36, 0.12)",
          animation: "jojo-slide-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
          maxWidth: "calc(100vw - 2rem)",
          width: "max-content",
          fontFamily: "var(--font-poppins, system-ui, sans-serif)",
        }}
      >
        {/* Pulsing dot */}
        <div
          aria-hidden="true"
          style={{
            flexShrink: 0,
            width: "0.625rem",
            height: "0.625rem",
            borderRadius: "50%",
            background: "#fbbf24",
            animation: "jojo-pulse-ring 1.5s ease-out infinite",
          }}
        />

        {/* Text block */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.125rem" }}>
          <span
            style={{
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: "#ffffff",
              lineHeight: 1.3,
              whiteSpace: "nowrap",
            }}
          >
            🎉 A new version is available
          </span>
          {countdown !== null && (
            <span
              style={{
                fontSize: "0.6875rem",
                color: "rgba(255, 255, 255, 0.55)",
                lineHeight: 1.3,
                whiteSpace: "nowrap",
              }}
            >
              Reloading in{" "}
              <span
                style={{ color: "#fbbf24", fontWeight: 700 }}
                aria-live="polite"
                aria-atomic="true"
              >
                {countdown}s
              </span>
            </span>
          )}
        </div>

        {/* Reload Now button */}
        <button
          id="version-update-reload-btn"
          onClick={handleReloadNow}
          aria-label="Reload page now to apply the update"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            flexShrink: 0,
            padding: "0.4375rem 0.875rem",
            borderRadius: "0.625rem",
            background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
            border: "none",
            cursor: "pointer",
            color: "#0a0a0f",
            fontSize: "0.75rem",
            fontWeight: 700,
            fontFamily: "inherit",
            letterSpacing: "0.02em",
            transition: "opacity 0.15s ease, transform 0.15s ease",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "0.85";
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.03)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "1";
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
          }}
        >
          {/* Spinning icon when countdown is active */}
          <span
            aria-hidden="true"
            style={{
              display: "inline-flex",
              animation: "jojo-spin 1.2s linear infinite",
            }}
          >
            <RefreshIcon />
          </span>
          Reload Now
        </button>
      </div>
    </>
  );
}

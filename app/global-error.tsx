"use client";

/**
 * Global error boundary for the entire app
 * This file is required for static export builds
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        background: "#0a0a0a",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: "1rem",
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "2rem",
      }}
    >
      <h1 style={{ fontSize: "2rem", fontWeight: 700, margin: 0 }}>
        Something went wrong
      </h1>
      <p style={{ color: "#888", margin: 0 }}>
        {error.message || "An unexpected error occurred."}
      </p>
      <div
        onClick={reset}
        style={{
          marginTop: "1rem",
          padding: "0.75rem 2rem",
          borderRadius: "9999px",
          background: "#3b82f6",
          color: "white",
          border: "none",
          fontWeight: 600,
          cursor: "pointer",
          fontSize: "1rem",
        }}
      >
        Try Again
      </div>
    </div>
  );
}

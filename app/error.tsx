"use client";

import { JOJOButton, JOJOCustomButton } from "@/components/ui/JOJOButton";
import { logger } from "@/lib/logger/logger";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Only log on client side
    if (typeof window !== 'undefined') {
      logger.error("[GlobalError] Unhandled error", { error, digest: error.digest });
    }
  }, [error]);

  return (
    <div
      style={{
        background: "var(--theme_12)",
        color: "var(--theme_1)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: "1rem",
      }}
    >
      <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>Something went wrong</h1>
      <p style={{ color: "var(--theme_5)" }}>{error.message || "An unexpected error occurred."}</p>
      <JOJOCustomButton size={JOJOButton.Size.M} state={JOJOButton.State.ACTIVE} onClick={reset}>
        Try Again
      </JOJOCustomButton>
    </div>
  );
}

"use client";

import { JOJOButton, JOJOCustomButton } from "@/components/ui/JOJOButton";
import { PermissionStatus } from "@/enums/ui.enum";

type Props = {
  title: string;
  description: string;
  onAllow: () => void;
  loading?: boolean;
  error?: string | null;
  status?: PermissionState | null;
};

export function PermissionPrompt({ title, description, onAllow, loading = false, error = null, status = null }: Props) {
  if (status === PermissionStatus.DENIED) {
    return (
      <div
        className="permission-denied-gradient"
        style={{
          padding: "24px",
          backdropFilter: "blur(10px)",
          border: "1px solid var(--theme_13_samecolour)",
          borderRadius: "12px",
          maxWidth: "400px",
          boxShadow: "0 8px 32px var(--theme_12_60)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <div
            style={{
              width: "32px", height: "32px", borderRadius: "50%",
              background: "var(--theme_13_18)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px",
            }}
          >
            🚫
          </div>
          <h3 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: "var(--font-semibold)", color: "var(--theme_13_samecolour)" }}>
            Permission Denied
          </h3>
        </div>
        <p style={{ margin: "0 0 16px 0", color: "var(--theme_5)", fontSize: "var(--text-sm)", lineHeight: "var(--leading-relaxed)" }}>
          This feature requires permission to work. Please enable it from your browser settings.
        </p>
        <div
          style={{
            padding: "12px", background: "var(--theme_10_80)", borderRadius: "6px",
            fontSize: "var(--text-xs)", color: "var(--theme_7)", lineHeight: "var(--leading-relaxed)",
          }}
        >
          <strong style={{ color: "var(--theme_5)" }}>How to enable:</strong><br />
          1. Click the lock icon in your browser&apos;s address bar<br />
          2. Find the permission settings<br />
          3. Allow access and refresh the page
        </div>
      </div>
    );
  }

  return (
    <div
      className="permission-prompt-gradient"
      style={{
        padding: "24px",
        backdropFilter: "blur(10px)",
        border: "1px solid var(--theme_9)",
        borderRadius: "12px",
        maxWidth: "400px",
        boxShadow: "0 8px 32px var(--theme_12_60)",
      }}
    >
      <h3 style={{ margin: "0 0 12px 0", fontSize: "var(--text-lg)", fontWeight: "var(--font-semibold)", color: "var(--theme_1)" }}>
        {title}
      </h3>
      <p style={{ margin: "0 0 20px 0", color: "var(--theme_5)", fontSize: "var(--text-sm)", lineHeight: "var(--leading-normal)" }}>
        {description}
      </p>

      {status && status !== "prompt" && (
        <p style={{ margin: "0 0 16px 0", fontSize: "var(--text-sm)", color: status === PermissionStatus.GRANTED ? "var(--color-success)" : "var(--color-warning)" }}>
          Status: {status}
        </p>
      )}

      {error && (
        <p
          style={{
            margin: "0 0 16px 0", padding: "8px 12px",
            background: "var(--theme_13_18)",
            border: "1px solid var(--theme_13_samecolour)",
            borderRadius: "6px",
            color: "var(--theme_13_samecolour)",
            fontSize: "var(--text-xs)", lineHeight: "var(--leading-normal)",
          }}
        >
          {error}
        </p>
      )}

      <JOJOCustomButton
        size={JOJOButton.Size.M}
        state={loading || status === PermissionStatus.GRANTED ? JOJOButton.State.DISABLED : JOJOButton.State.ACTIVE}
        onClick={onAllow}
        disabled={loading || status === PermissionStatus.GRANTED}
        className="w-full h-auto py-3 px-5 rounded-md text-sm font-semibold"
        style={{
          background: status === PermissionStatus.GRANTED ? "var(--color-success)" : "var(--theme_13_samecolour)",
          color: "var(--theme_2_same_colour)",
        }}
      >
        {loading ? "Requesting..." : status === PermissionStatus.GRANTED ? "Permission Granted ✓" : "Allow"}
      </JOJOCustomButton>
    </div>
  );
}

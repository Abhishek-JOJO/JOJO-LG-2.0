"use client";

import { JOJOButton, JOJOCustomButton } from "../ui/JOJOButton";


export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

const iconMap: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  warning: "⚠",
  info: "ℹ",
};

// All colors via CSS variables — no hardcoded hex
const styleMap: Record<ToastType, { bgClass: string; border: string; icon: string }> = {
  success: {
    bgClass: "toast-success-gradient",
    border: "var(--color-success)",
    icon: "var(--color-success)",
  },
  error: {
    bgClass: "toast-error-gradient",
    border: "var(--theme_14_samecolour)",
    icon: "var(--theme_14_samecolour)",
  },
  warning: {
    bgClass: "toast-warning-gradient",
    border: "var(--color-warning)",
    icon: "var(--color-warning)",
  },
  info: {
    bgClass: "toast-info-gradient",
    border: "var(--color-info)",
    icon: "var(--color-info)",
  },
};

export function Toast({ toast, onDismiss }: ToastProps) {
  const styles = styleMap[toast.type];

  return (
    <div
      role="alert"
      className={styles.bgClass}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "16px",
        backdropFilter: "blur(20px)",
        border: `1px solid ${styles.border}`,
        borderRadius: "12px",
        padding: "16px 20px",
        minWidth: "320px",
        maxWidth: "420px",
        boxShadow: "0 8px 32px var(--theme_12_60)",
        animation: "slideIn 0.3s ease-out",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          background: styles.icon,
          color: "var(--theme_12)",
          fontSize: "18px",
          fontWeight: "bold",
          flexShrink: 0,
        }}
      >
        {iconMap[toast.type]}
      </div>

      <p
        style={{
          flex: 1,
          color: "var(--theme_1)",
          fontSize: "var(--text-sm)",
          lineHeight: "var(--leading-normal)",
          fontWeight: "var(--font-medium)",
        }}
      >
        {toast.message}
      </p>

      <JOJOCustomButton
        size={JOJOButton.Size.S}
        state={JOJOButton.State.DEFAULT}
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        style={{
          width: "28px",
          height: "28px",
          padding: 0,
          borderRadius: "50%",
          flexShrink: 0,
        }}
      >
        ✕
      </JOJOCustomButton>

      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}

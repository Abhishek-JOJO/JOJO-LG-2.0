"use client";

import { Toast } from "./Toast";
import { useToastStore } from "@store/useToastStore";

export function ToastContainer() {
  const { toasts, dismiss } = useToastStore();

  if (!toasts.length) return null;

  return (
    <div
      aria-live="polite"
      style={{
        position: "fixed",
        top: "24px",
        right: "24px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => (
        <div key={toast.id} style={{ pointerEvents: "auto" }}>
          <Toast toast={toast} onDismiss={dismiss} />
        </div>
      ))}
    </div>
  );
}

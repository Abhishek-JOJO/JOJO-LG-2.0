"use client";

import { useEffect } from "react";

interface PaymentProcessingOverlayProps {
  visible: boolean;
  errorMessage?: string | null;
  showError?: boolean;
}

export default function PaymentProcessingOverlay({
  visible,
  errorMessage,
  showError = false,
}: PaymentProcessingOverlayProps) {
  // Prevent escape key from closing overlay
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [visible]);

  // Prevent body scroll when overlay is visible
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 bg-black/85 backdrop-blur-md z-[10000] flex items-center justify-center animate-fadeIn"
      role="dialog"
      aria-label="Payment processing"
      aria-busy={!showError}
      onClick={(e) => e.stopPropagation()} // Prevent click-through
    >
      <div className="bg-neutral-950 rounded-3xl p-8 max-w-md w-full mx-4 text-center border border-neutral-900 shadow-2xl flex flex-col items-center">
        {showError ? (
          <>
            {/* Error Icon */}
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2" />
                <path
                  d="M12 8v4M12 16h.01"
                  stroke="#ef4444"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Error Message */}
            <div
              className="text-lg font-bold text-red-500 mb-2"
              role="alert"
              aria-live="polite"
            >
              Payment Verification Failed
            </div>
            <p className="text-neutral-400 text-sm leading-relaxed">
              {errorMessage || "Verification timed out or failed. Please check your account subscription status."}
            </p>
          </>
        ) : (
          <>
            {/* Loading Spinner */}
            <div className="relative flex items-center justify-center mb-6">
              <img
                src="/logos/loader.png"
                alt="Processing"
                className="w-16 h-16 animate-spin object-contain"
              />
            </div>

            {/* Processing Message */}
            <div
              className="text-xl font-bold text-white mb-2"
              role="status"
              aria-live="polite"
            >
              Processing Your Payment
            </div>

            {/* Warning Message */}
            <p className="text-neutral-400 text-sm leading-relaxed mb-1">
              Verifying status with payment provider...
            </p>
            <div className="text-xs text-amber-500 font-semibold bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full mt-3">
              Please do not close this tab or refresh
            </div>
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useFocusable, setFocus, doesFocusableExist } from "@noriginmedia/norigin-spatial-navigation";
import { JOJOModal } from "@/components/ui/JOJOModal";

interface AccountNotFoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  identifier: string;
}

function retrySetFocus(focusKey: string, attempts = 8, intervalMs = 60) {
  let tries = 0;
  const attempt = () => {
    tries += 1;
    if (doesFocusableExist(focusKey)) {
      setFocus(focusKey);
      return;
    }
    if (tries < attempts) {
      setTimeout(attempt, intervalMs);
    }
  };
  setTimeout(attempt, intervalMs);
}

export function AccountNotFoundModal({ isOpen, onClose, identifier }: AccountNotFoundModalProps) {
  const t = useTranslations("loginPage");

  useEffect(() => {
    if (isOpen) {
      // Unfocus any background input immediately so TV virtual keyboard closes
      if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      retrySetFocus("account-not-found-btn");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Format message supporting both {identifier} (next-intl) and %1$s
  let desc = "";
  try {
    desc = t("cant_find_account_desc", { identifier });
  } catch {
    desc = `We can’t find an account with ${identifier}. Try another phone number or email address, or go to the mobile or web app to create an account.`;
  }
  if (desc.includes("%1$s")) {
    desc = desc.replace("%1$s", identifier);
  }

  const title = t("cant_find_account_title") || "Can’t find account";

  return (
    <JOJOModal isOpen={isOpen} onClose={onClose} showCloseButton={false}>
      <div className="space-y-3 text-center px-2">
        <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug">
          {title}
        </h3>

        <p className="text-base sm:text-lg text-white/70 font-normal leading-relaxed max-w-md mx-auto">
          {desc}
        </p>
      </div>

      <AccountNotFoundButton onClose={onClose} />
    </JOJOModal>
  );
}

function AccountNotFoundButton({ onClose }: { onClose: () => void }) {
  const t = useTranslations("loginPage");
  const { ref, focused } = useFocusable({
    focusKey: "account-not-found-btn",
    onEnterPress: () => {
      if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      onClose();
    },
  });

  return (
    <div className="flex w-full items-center justify-center mt-4">
      <button
        ref={ref as any}
        type="button"
        data-focuskey="account-not-found-btn"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          onClose();
        }}
        style={
          focused
            ? {
                backgroundColor: "#ea580c",
                color: "#ffffff",
                transform: "scale(1.04)",
                boxShadow: "0 0 0 3px #ffffff, 0 0 16px rgba(255, 255, 255, 0.5)",
              }
            : undefined
        }
        className={`w-full max-w-[260px] py-3.5 px-8 rounded-full font-bold text-base transition-all duration-200 cursor-pointer outline-none ${
          focused
            ? "z-50"
            : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
        }`}
      >
        {t("cant_find_account_btn") || "Try Again"}
      </button>
    </div>
  );
}

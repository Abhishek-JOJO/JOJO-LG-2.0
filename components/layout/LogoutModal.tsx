"use client";

import React, { useState, useEffect } from "react";
import { JOJOModal } from "@/components/ui/JOJOModal";
import { useLogout } from "@/features/auth/hooks/useLogout";
import { useTranslations } from "next-intl";
import { useFocusable, setFocus } from "@noriginmedia/norigin-spatial-navigation";

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LogoutModal({ isOpen, onClose }: LogoutModalProps) {
  if (!isOpen) return null;

  const { logout } = useLogout();
  const t = useTranslations("profile-dropdown");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    setIsLoggingOut(true);
    logout();
  };

  const { ref: logoutBtnRef, focused: logoutFocused } = useFocusable({
    focusKey: "logout-modal-confirm-btn",
    onEnterPress: () => {
      if (!isLoggingOut) handleLogout();
    },
  });

  const { ref: cancelBtnRef, focused: cancelFocused } = useFocusable({
    focusKey: "logout-modal-cancel-btn",
    onEnterPress: () => {
      if (!isLoggingOut) onClose();
    },
  });

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setFocus("logout-modal-cancel-btn");
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <JOJOModal
      isOpen={isOpen}
      onClose={isLoggingOut ? () => { } : onClose}
    >
      <div className="space-y-3 text-center">
        <h3 className="text-[22px] sm:text-2xl font-bold text-theme_1 tracking-tight leading-snug">
          {t("logout_confirm")}
        </h3>
        <p className="text-[14px] sm:text-[15px] text-theme_6 font-normal leading-relaxed">
          {t("logout_desc")}
        </p>
      </div>

      <div className="flex w-full items-center justify-center gap-4 mt-4">
        {/* Logout Button */}
        <button
          ref={logoutBtnRef as any}
          onClick={handleLogout}
          disabled={isLoggingOut}
          className={`flex-1 py-3 px-6 rounded-full font-bold text-sm sm:text-base transition-all cursor-pointer outline-none ${
            logoutFocused
              ? "bg-red-600 text-white scale-105 shadow-xl ring-4 ring-white z-50"
              : "bg-neutral-800 text-white/80 hover:bg-neutral-700 hover:text-white"
          }`}
        >
          {isLoggingOut ? t("logging_out") || "Logging out..." : t("logout")}
        </button>

        {/* Cancel Button */}
        <button
          ref={cancelBtnRef as any}
          onClick={onClose}
          disabled={isLoggingOut}
          className={`flex-1 py-3 px-6 rounded-full font-bold text-sm sm:text-base transition-all cursor-pointer outline-none ${
            cancelFocused
              ? "bg-white text-black scale-105 shadow-xl ring-4 ring-white z-50"
              : "bg-theme_13_samecolour text-white hover:opacity-90"
          }`}
        >
          {t("cancel")}
        </button>
      </div>
    </JOJOModal>
  );
}

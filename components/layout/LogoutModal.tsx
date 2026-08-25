"use client";

import React, { useState } from "react";
import { JOJOModal } from "@/components/ui/JOJOModal";
import { JOJOButton, JOJOCustomButton } from "@/components/ui/JOJOButton";
import { useLogout } from "@/features/auth/hooks/useLogout";
import { useTranslations } from "next-intl";

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LogoutModal({ isOpen, onClose }: LogoutModalProps) {
  const { logout } = useLogout();
  const t = useTranslations("profile-dropdown");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    setIsLoggingOut(true);
    logout();
  };

  return (
    <JOJOModal
      isOpen={isOpen}
      onClose={isLoggingOut ? () => { } : onClose}
    >
      <div className="space-y-3">
        <h3 className="text-[22px] sm:text-2xl font-bold text-theme_1 tracking-tight leading-snug">
          {t("logout_confirm")}
        </h3>
        <p className="text-[14px] sm:text-[15px] text-theme_6 font-normal leading-relaxed">
          {t("logout_desc")}
        </p>
      </div>

      <div className="flex w-full items-center gap-4 mt-2">
        <JOJOCustomButton
          onClick={handleLogout}
          size={JOJOButton.Size.L}
          state={JOJOButton.State.DEFAULT}
          className="flex-1 font-semibold text-sm sm:text-base"
          bgColor="theme_9"
          textColor="theme_5"
          isLoading={isLoggingOut}
        >
          {t("logout")}
        </JOJOCustomButton>
        <JOJOCustomButton
          onClick={onClose}
          size={JOJOButton.Size.L}
          state={JOJOButton.State.DEFAULT}
          className="flex-1 font-semibold text-sm sm:text-base"
          bgColor="theme_13_samecolour"
          textColor="theme_1"
          disabled={isLoggingOut}
        >
          {t("cancel")}
        </JOJOCustomButton>
      </div>
    </JOJOModal>
  );
}

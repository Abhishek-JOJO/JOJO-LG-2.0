"use client";

import { useLogout } from "../hooks/useLogout";
import { useTranslations } from "next-intl";
import { logger } from "@/lib/logger/logger";
import { LogOut } from "lucide-react";
import { JOJOCustomButton, JOJOButton } from "@/components/ui/JOJOButton";
import { cn } from "@/lib/utils";
import { themeColors } from "@/tailwind.config";

interface LogoutButtonProps {
  className?: string;
}

export function LogoutButton({ className = "" }: LogoutButtonProps) {
  const { logout } = useLogout();
  const t = useTranslations("common");

  const handleLogout = () => {
    logger.info('[LogoutButton] User clicked logout');
    logout();
  };

  return (
    <JOJOCustomButton
      size={JOJOButton.Size.M}
      state={JOJOButton.State.DEFAULT}
      mode={JOJOButton.Mode.ICON_TEXT}
      leftIcon={<LogOut size={18} />}
      onClick={handleLogout}
      className={cn(
        "h-9 min-w-26 px-4 body-xs-medium text-theme_2_same_colour sm:h-11 sm:px-5 sm:body-sm-medium",
        className
      )}
      hoverColor={themeColors.theme_13_samecolour}
      hoverTextColor={themeColors.theme_1}
      aria-label="Logout"
    >
      <span className="inline-flex body-xs-medium">{t("logout")}</span>
    </JOJOCustomButton>
  );
}

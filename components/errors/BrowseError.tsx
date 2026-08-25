"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import WarningIcon from "@/public/svg/WarningIcon";
import { JOJOButton, JOJOCustomButton } from "@/components/ui/JOJOButton";
import { X } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";

/**
 * BrowseError - Rendered when category/rail IDs are modified or invalid on the browse route.
 * Displays as a glassmorphic modal overlay similar to GuestLoginPopup.
 */
export function BrowseError() {
  const t = useTranslations("browseError");
  const router = useRouter();

  const handleDismiss = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(ROUTES.HOME);
    }
  };

  const handleGoHome = () => {
    router.push(ROUTES.HOME);
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-[#050505]/85 backdrop-blur-md transition-all duration-300 animate-fadeIn">
      <div className="relative mx-4 w-full max-w-[390px] rounded-3xl bg-neutral-900 border border-neutral-800/80 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Background decorative glowing blur circles for glassmorphism depth */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-theme_13_samecolour/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-theme_13_samecolour/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <div
          onClick={handleDismiss}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-neutral-800/60 border border-neutral-700/50 text-neutral-400 hover:text-theme_1 hover:bg-neutral-700/80 hover:scale-105 active:scale-95 transition-all cursor-pointer z-10"
          aria-label="Close"
        >
          <X size={16} />
        </div>

        {/* Header Icon & Branding */}
        <div className="flex flex-col items-center text-center mt-2 mb-6 relative z-10">
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-theme_13_samecolour/20 to-theme_13_samecolour/5 flex items-center justify-center mb-4 border border-theme_13_samecolour/20 shadow-inner group">
            <div className="absolute inset-0 rounded-full bg-theme_13_samecolour/10 blur-sm group-hover:blur-md transition-all duration-300" />
            <WarningIcon className="w-8 h-8 text-theme_13_samecolour z-10" />
          </div>
          <h3 className="text-2xl font-extrabold text-theme_1 tracking-tight">
            {t("title")}
          </h3>
        </div>

        {/* Message */}
        <p className="relative z-10 text-neutral-400 text-sm leading-relaxed px-2 text-center mb-8">
          {t("description")}
        </p>

        {/* Action Button */}
        <div className="relative z-10 w-full">
          <JOJOCustomButton
            appearance={JOJOButton.Appearance.GOLD}
            onClick={handleGoHome}
            className="w-full justify-center text-base font-extrabold h-12 shadow-[0_4px_20px_rgba(250,175,63,0.25)] hover:shadow-[0_6px_24px_rgba(250,175,63,0.4)] hover:brightness-105 active:scale-[0.98] transition-all rounded-full cursor-pointer"
          >
            {t("go_home")}
          </JOJOCustomButton>
        </div>

        {/* Secondary Dismiss */}
        <div className="relative z-10 w-full">
          <JOJOCustomButton
            onClick={handleDismiss}
            bgColor="transparent"
            hoverColor="rgba(255,255,255,0.05)"
            activeColor="rgba(255,255,255,0.08)"
            className="w-full mt-3 text-sm text-neutral-500 hover:text-neutral-300 font-semibold transition-all text-center rounded-full cursor-pointer h-11"
          >
            {t("cancel")}
          </JOJOCustomButton>
        </div>
      </div>
    </div>
  );
}




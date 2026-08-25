"use client";

import { useGuestPopupStore } from "@/store/useGuestPopupStore";
import { JOJOButton, JOJOCustomButton } from "@/components/ui/JOJOButton";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

export function GuestLoginPopup() {
  const { isOpen, closeGuestPopup } = useGuestPopupStore();
  const router = useRouter();
  const t = useTranslations("guestLoginPopup");

  if (!isOpen) return null;

  const handleLogin = () => {
    // Close popup
    closeGuestPopup();

    // Reset Asset Detail Modal so it doesn't stay open in the background
    try {
      // Lazy import/require to avoid circular dependencies if any
      const { useAssetDetailStore } = require("@/features/asset/store/useAssetDetailStore");
      useAssetDetailStore.setState({
        activeAssetId: null,
        activeContentType: null,
        activeTitle: null,
        isOpen: false,
        originalPath: null,
        historyCount: 0,
        shouldScrollToBottom: false,
      });
    } catch (err) { }

    // Scroll to top
    window.scrollTo(0, 0);

    router.push(ROUTES.LOGIN);
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-[#050505]/85 backdrop-blur-md transition-all duration-300 animate-fadeIn">
      <div className="relative mx-4 w-full max-w-[390px] rounded-3xl bg-neutral-900 border border-neutral-800/80 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Background decorative glowing blur circles for glassmorphism depth */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-theme_13_samecolour/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-theme_13_samecolour/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <div
          onClick={closeGuestPopup}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-neutral-800/60 border border-neutral-700/50 text-neutral-400 hover:text-theme_1 hover:bg-neutral-700/80 hover:scale-105 active:scale-95 transition-all cursor-pointer z-10"
          aria-label="Close"
        >
          <X size={16} />
        </div>

        {/* Header Icon & Branding */}
        <div className="flex flex-col items-center text-center mt-2 mb-6 relative z-10">
          <h3 className="text-2xl font-extrabold text-theme_1 tracking-tight">
            {t("title")}
          </h3>
        </div>

        {/* Message */}
        <p className="relative z-10 text-neutral-400 text-sm leading-relaxed px-2 text-center mb-8">
          {t("message")}
        </p>

        {/* Action Button */}
        <div className="relative z-10 w-full">
          <JOJOCustomButton
            appearance={JOJOButton.Appearance.GOLD}
            onClick={handleLogin}
            className="w-full justify-center text-base font-extrabold h-12 shadow-[0_4px_20px_rgba(250,175,63,0.25)] hover:shadow-[0_6px_24px_rgba(250,175,63,0.4)] hover:brightness-105 active:scale-[0.98] transition-all rounded-full cursor-pointer"
          >
            {t("signIn")}
          </JOJOCustomButton>
        </div>

        {/* Secondary Dismiss */}
        <div className="relative z-10 w-full">
          <JOJOCustomButton
            onClick={closeGuestPopup}
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
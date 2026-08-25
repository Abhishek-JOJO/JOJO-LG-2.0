"use client";

import LanguageSwitcher from "@/components/language-dropdown/LanguageDropdown";
import JOJOCommonImage, { JOJOImagePreset } from "@/components/ui/JOJOCommonImage";
import { StorageKey } from "@/enums/storage.enum";
import { LogoutButton } from "@/features/auth/ui/LogoutButton";
import { appConfig } from "@/lib/config/app.config";
import { IMAGES, LOGOS } from "@/lib/constants/assets";
import footerData from "@/lib/data/footer.data.json";
import { cn, STORE_IMAGE_MAP } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { PageBackground } from "./PageBackground";

export function DownloadAppPage() {
  const t = useTranslations("downloadAppPage");
  const { showLanguageDropdown, MOBILE_RESPONSIVE_WITH_AUTH } = appConfig?.flags;

  // Check localStorage for a selected profile — only relevant when WITH_AUTH is true.
  // We read it client-side after mount to avoid SSR mismatch.
  const [hasSelectedProfile, setHasSelectedProfile] = useState(false);

  useEffect(() => {
    if (!MOBILE_RESPONSIVE_WITH_AUTH) return;
    try {
      const raw = localStorage.getItem(StorageKey.SELECTED_PROFILE);
      setHasSelectedProfile(!!raw);
    } catch {
      // localStorage blocked (private mode, etc.)
      setHasSelectedProfile(false);
    }
  }, [MOBILE_RESPONSIVE_WITH_AUTH]);

  // Show logout button only when WITH_AUTH is enabled AND a profile is persisted.
  const showLogout = MOBILE_RESPONSIVE_WITH_AUTH && hasSelectedProfile;

  return (
    <div className="relative h-screen h-[100dvh] w-full overflow-hidden flex flex-col justify-center items-center">
      {/* Background Image */}
      <PageBackground />

      {/* Top-right controls: language switcher + logout */}
      <div className="absolute top-4 right-4 z-[20] flex items-center gap-3">
        {showLogout && (
          <LogoutButton />
        )}
        {showLanguageDropdown && <LanguageSwitcher />}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex h-full w-full max-h-[100dvh] items-center justify-center px-4 py-6 overflow-hidden">
        <main className="w-full text-theme_1">
          <section className="flex w-full max-w-sm mx-auto flex-col items-center text-center">
            {/* JOJO Logo */}
            <div className="mb-4 sm:mb-8 h-[55px] sm:h-[70px] w-[110px] sm:w-[140px] flex-shrink-0">
              <JOJOCommonImage
                src={LOGOS.JOJO_LOGO}
                alt="JOJO"
                fill
                preset={JOJOImagePreset.Logo}
                wrapperClassName="h-full w-full cursor-pointer"
              />
            </div>

            <h1 className="display-sm-semibold mb-2 sm:mb-3">
              {t("download-jojo-app")}
            </h1>

            <p className="body-md-regular mb-5 sm:mb-8 text-theme_5">
              {t("for-the-best-mobile-experiance")}
            </p>

            {/* Store buttons — stacked vertically */}
            <div className="flex w-full flex-col items-center gap-3 flex-shrink-0">
              {footerData?.appDownload?.buttons.map((button) => {
                const src = STORE_IMAGE_MAP[button.imageKey];

                if (!src) return null;

                const isGoogle = button.imageKey === "GOOGLE_PLAY";

                return (
                  <a
                    key={button.id}
                    href={button.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={button.label}
                    className={cn(
                      "block h-12 cursor-pointer",
                      isGoogle ? "w-[146px]" : "w-[150px]",
                      "transform-gpu transition-all duration-300 ease-out",
                      "hover:-translate-y-1 hover:scale-[1.03] hover:opacity-90",
                      "active:translate-y-0 active:scale-[0.98]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme_13_samecolour"
                    )}
                  >
                    <JOJOCommonImage
                      src={src}
                      alt={button?.label}
                      fill
                      unoptimized
                      preset={JOJOImagePreset.Logo}
                      wrapperClassName="h-full w-full"
                    />
                  </a>
                );
              })}
            </div>

            {/* Platform logos — Android TV, Fire TV, Jio, etc. */}
            <div className="mt-10 sm:mt-12 w-full max-w-[400px] sm:max-w-[500px] h-[65px] sm:h-[82px] flex-shrink-0">
              <JOJOCommonImage
                src={LOGOS.PLATFORM_ALL}
                alt="Supported Platforms"
                fill
                unoptimized
                preset={JOJOImagePreset.Logo}
                wrapperClassName="h-full w-full"
              />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
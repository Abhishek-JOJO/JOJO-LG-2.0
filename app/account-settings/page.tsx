"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useFocusable, setFocus, doesFocusableExist } from "@noriginmedia/norigin-spatial-navigation";
import { useBootstrap } from "@/lib/bootstrap/BootstrapContext";
import { useAuthStore } from "@/store/useAuthStore";
import { useWatchlistStore } from "@/store/useWatchlistStore";
import { useAssetDetailStore } from "@/features/asset/store/useAssetDetailStore";
import { useLocaleStore } from "@/store/useLocaleStore";
import { LogoutModal } from "@/components/layout/LogoutModal";
import { Locale, LOCALE_LABELS, LoginIdentifierType, SUPPORTED_LOCALES } from "@/enums/ui.enum";
import { ROUTES } from "@/lib/constants/routes";
import { mapApiRailItem } from "@/components/content-rail/utils/contentRail.mapper";
import JOJOCommonImage from "@/components/ui/JOJOCommonImage";
import { analyticsService } from "@/shared/analytics";
import { EVENT_NAMES } from "@/shared/analytics/constants/analytics.constants";
import { cn } from "@/lib/utils";
import { useAmbientTintStore } from "@/store/useAmbientTintStore";
import { DEFAULT_AMBIENT_RGB } from "@/lib/utils/colorExtractor";
import { APP_VERSION } from "@/lib/constants/version";

// This page keeps re-rendering in the background is unlikely here (no hero
// video), but retrySetFocus is used anyway for consistency with the rest of
// the app and safety against the same norigin setFocus/addFocusable race
// documented in AssetDetailView.tsx.
function retrySetFocus(focusKey: string, attempts = 6, intervalMs = 90) {
  let tries = 0;
  const attempt = () => {
    tries += 1;
    if (doesFocusableExist(focusKey)) {
      setFocus(focusKey);
    }
    if (tries < attempts) {
      setTimeout(attempt, intervalMs);
    }
  };
  setTimeout(attempt, intervalMs);
}

function normalizePhoneCode(code: string) {
  const digits = code.replace(/[^0-9]/g, "");
  return digits ? `+${digits}` : "";
}

function formatAccountPhone(phone: string, phoneCode: string) {
  if (!phone) return "";
  if (phone.includes("@")) return phone;

  const normalizedCode = normalizePhoneCode(phoneCode || LoginIdentifierType.PHONE_CODE_NUMBER_DEFAULT);
  if (!normalizedCode) return phone;

  const trimmedPhone = phone.trim();
  if (trimmedPhone.startsWith("+")) return trimmedPhone;

  const phoneDigits = trimmedPhone.replace(/[^0-9]/g, "");
  const codeDigits = normalizedCode.replace(/[^0-9]/g, "");
  if (codeDigits && phoneDigits.startsWith(codeDigits) && phoneDigits.length > codeDigits.length + 7) {
    return `+${phoneDigits}`;
  }

  return `${normalizedCode} ${trimmedPhone}`;
}

export default function AccountSettingsPage() {
  const router = useRouter();
  const t = useTranslations("tSettings");
  const { isAppReady } = useBootstrap();

  const sessionId = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // User account identification (phone or email)
  const rawPhone = (user?.phone || (typeof window !== "undefined" ? localStorage.getItem("user_phone") : "") || "").trim();
  const rawEmail = (user?.email || (typeof window !== "undefined" ? localStorage.getItem("user_email") : "") || "").trim();
  const rawPhoneCode = (
    (user as any)?.phone_code ||
    (user as any)?.phoneCode ||
    (typeof window !== "undefined" ? localStorage.getItem("user_phone_code") : "") ||
    ""
  ).trim();

  // If phone field contains '@', it was saved from an email login
  const resolvedEmail = rawEmail || (rawPhone.includes("@") ? rawPhone : "");
  const resolvedPhone = !rawPhone.includes("@") ? rawPhone : "";
  const formattedPhone = resolvedPhone ? formatAccountPhone(resolvedPhone, rawPhoneCode) : "";

  // Watchlist preview (first page only — this is a compact rail, not the full /watchlist grid)
  const watchlistAssets = useWatchlistStore((s) => s.assets);
  const watchlistLoading = useWatchlistStore((s) => s.isLoading);
  const hasFetchedInitial = useWatchlistStore((s) => s.hasFetchedInitial);
  const fetchWatchlist = useWatchlistStore((s) => s.fetchWatchlist);
  const openAssetDetail = useAssetDetailStore((s) => s.openAssetDetail);

  useEffect(() => {
    if (isAppReady && sessionId && !hasFetchedInitial) {
      fetchWatchlist(1);
    }
  }, [isAppReady, sessionId, hasFetchedInitial, fetchWatchlist]);

  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  // Rows on this page, top to bottom: watchlist row (if items exist) -> language pills -> logout.
  const isGuest = user?.isGuest ?? false;
  const navProfileKey = isGuest ? "navbar-login" : "navbar-profile-trigger";

  const hasWatchlist = watchlistAssets.length > 0;
  const firstLocale = SUPPORTED_LOCALES[0];
  const topRowKey = hasWatchlist ? "account-watchlist-0" : `account-lang-${firstLocale}`;
  const watchlistUpKey = navProfileKey;
  const langUpKey = hasWatchlist ? "account-watchlist-0" : navProfileKey;
  const langDownKey = "account-logout-btn";

  useEffect(() => {
    analyticsService.track(EVENT_NAMES.PAGE_VIEW, { screen_name: "account_settings" });
    // Reset any ambient tint from previous pages (e.g. Natak/Movies/Shows)
    useAmbientTintStore.getState().setAmbientColor(DEFAULT_AMBIENT_RGB);

    // If language was just changed, restore focus directly to that language pill!
    const savedFocusKey = typeof window !== "undefined" ? sessionStorage.getItem("account_settings_focus_key") : null;
    if (savedFocusKey) {
      sessionStorage.removeItem("account_settings_focus_key");
      retrySetFocus(savedFocusKey, 10, 50);
    } else {
      // Land the D-pad somewhere sensible on open.
      retrySetFocus(topRowKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogoutClick = () => {
    analyticsService.track(EVENT_NAMES.HELP_AND_SETTING_OPTION_SELECTED, {
      option_name: "logout",
      screen_name: "account_settings",
    });
    setIsLogoutModalOpen(true);
  };

  return (
    <main className="relative min-h-screen overflow-hidden -mt-15 lg:-mt-25">
      {/* Full-screen fixed background matching watching screen, extending seamlessly behind the navbar */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(circle_at_25%_25%,_#3d1a08_0%,_#140a04_50%,_#050201_100%)]"
      >
        <div className="absolute inset-0 bg-black/35" />
      </div>

      {/* id/data-focuskey read by FocusableNavLink's onArrowPress('down') fallback so
          pressing Down from the navbar on this (hero-less) page lands deterministically
          on the topmost real row instead of relying on norigin's default nearest-neighbor
          search, which has no reliable candidate to find this far below the navbar. */}
      <div
        id="page-focus-entry"
        data-focuskey={topRowKey}
        className="relative z-10 w-full px-6 sm:px-12 lg:px-16 pt-28 sm:pt-36 lg:pt-40 pb-16 flex flex-col gap-10 sm:gap-12"
      >
        {/* Account Details */}
        <div>
          {isGuest ? (
            <div className="flex flex-col gap-1">
              <span className="text-lg sm:text-xl lg:text-2xl font-bold text-theme_5 tracking-wide">
                {t("guest_user")}
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {resolvedPhone && (
                <div className="flex flex-col gap-0.5 sm:gap-1">
                  <span className="text-lg sm:text-xl lg:text-2xl font-bold text-theme_5 tracking-wide">
                    {t("phone_number")}
                  </span>
                  <span className="text-lg sm:text-xl lg:text-2xl font-bold text-theme_1 tracking-wide">
                    {formattedPhone}
                  </span>
                </div>
              )}
              {resolvedEmail && (
                <div className="flex flex-col gap-0.5 sm:gap-1">
                  <span className="text-lg sm:text-xl lg:text-2xl font-bold text-theme_5 tracking-wide">
                    {t("email")}
                  </span>
                  <span className="text-lg sm:text-xl lg:text-2xl font-bold text-theme_1 tracking-wide truncate max-w-[700px]">
                    {resolvedEmail}
                  </span>
                </div>
              )}
              {!resolvedPhone && !resolvedEmail && (
                <div className="flex flex-col gap-0.5 sm:gap-1">
                  <span className="text-lg sm:text-xl lg:text-2xl font-bold text-theme_5 tracking-wide">
                    {t("account")}
                  </span>
                  <span className="text-lg sm:text-xl lg:text-2xl font-bold text-theme_1">
                    {user?.name || "JOJO User"}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Watchlist */}
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-theme_1 mb-4">{t("watchlist_heading")}</h2>
          {watchlistAssets.length > 0 ? (
            <div className="flex gap-4 sm:gap-5 overflow-x-auto pt-1 pb-4 scrollbar-none">
              {watchlistAssets.map((item: any, idx: number) => {
                const id = Number(item.asset_id ?? item.assetId);
                const railItem = mapApiRailItem(item, idx);
                return (
                  <FocusableWatchlistCard
                    key={id}
                    focusKey={`account-watchlist-${idx}`}
                    title={railItem.title}
                    img={railItem.landscapeImage || railItem.image}
                    onSelect={() => openAssetDetail(String(id), "", "")}
                    isFirst={idx === 0}
                    isLast={idx === watchlistAssets.length - 1}
                    upKey={watchlistUpKey}
                    downKey={`account-lang-${firstLocale}`}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-sm sm:text-base text-theme_5">{t("empty_watchlist")}</p>
          )}

        </div>

        {/* Change Language */}
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-theme_1 mb-4">{t("change_language")}</h2>
          <div className="inline-flex items-center bg-white/10 rounded-full p-1.5 sm:p-2 gap-1">
            {SUPPORTED_LOCALES.map((code, idx) => (
              <FocusableLanguagePill
                key={code}
                focusKey={`account-lang-${code}`}
                label={LOCALE_LABELS[code]}
                isActive={locale === code}
                onClick={() => setLocale(code as Locale)}
                isFirst={idx === 0}
                isLast={idx === SUPPORTED_LOCALES.length - 1}
                upKey={langUpKey}
                downKey={langDownKey}
              />
            ))}
          </div>
        </div>

        {/* Logout & App Version */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-white/10 mt-6">
          <FocusableLogoutButton
            focusKey="account-logout-btn"
            label={t("logout")}
            onClick={handleLogoutClick}
            upKey={`account-lang-${firstLocale}`}
          />
          <div className="text-xs font-mono text-white/40">
            v{APP_VERSION}
          </div>
        </div>
      </div>

      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => {
          setIsLogoutModalOpen(false);
          setTimeout(() => {
            retrySetFocus("account-logout-btn", 4, 50);
          }, 60);
        }}
      />
    </main>
  );
}

function FocusableWatchlistCard({ focusKey, title, img, onSelect, isFirst, isLast, upKey, downKey }: any) {
  const handleArrowPress = (direction: string) => {
    if (direction === "up") {
      setFocus(upKey);
      return false;
    }
    if (direction === "down") {
      setFocus(downKey);
      return false;
    }
    if (direction === "left" && isFirst) return false;
    if (direction === "right" && isLast) return false;
    return true;
  };

  const { ref, focused } = useFocusable({
    focusKey,
    onArrowPress: handleArrowPress,
    onEnterPress: onSelect,
    onFocus: () => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: isFirst ? "start" : "center" });
    },
  });

  return (
    <div
      ref={ref as any}
      onClick={onSelect}
      className={cn(
        "relative w-[280px] sm:w-[340px] aspect-video rounded-xl overflow-hidden group cursor-pointer bg-theme_10 transition-all duration-300 shrink-0",
        focused ? "z-30 shadow-2xl" : "hover:scale-105"
      )}
      style={{ zIndex: focused ? 30 : undefined }}
    >
      {img ? (
        <JOJOCommonImage src={img} alt={title} fill className="object-cover" wrapperClassName="w-full h-full" />
      ) : (
        <div className="w-full h-full flex items-center justify-center p-2 text-center text-sm text-neutral-500">{title}</div>
      )}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent transition-opacity duration-300 flex items-end p-3",
        focused ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      )}>
        <span className={cn("text-sm font-semibold truncate w-full", focused ? "text-theme_13_samecolour" : "text-white")}>{title}</span>
      </div>
      {/* Plain border overlay, not a ring — a ring-offset box-shadow here gets
          clipped by the horizontal-scroll container and occluded by
          neighboring cards on this TV's compositor (see AssetDetailView.tsx). */}
      {focused && (
        <div className="absolute inset-0 rounded-xl pointer-events-none z-50" style={{ border: "3px solid #ffffff" }} />
      )}
    </div>
  );
}

function FocusableLanguagePill({ focusKey, label, isActive, onClick, isFirst, isLast, upKey, downKey }: any) {
  const handleArrowPress = (direction: string) => {
    if (direction === "up") {
      setFocus(upKey);
      return false;
    }
    if (direction === "down") {
      setFocus(downKey);
      return false;
    }
    if (direction === "left" && isFirst) return false;
    if (direction === "right" && isLast) return false;
    return true;
  };

  const handleSelect = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("account_settings_focus_key", focusKey);
    }
    onClick?.();
    setFocus(focusKey);
  };

  const { ref, focused } = useFocusable({
    focusKey,
    onArrowPress: handleArrowPress,
    onEnterPress: handleSelect,
  });
  return (
    <button
      ref={ref as any}
      onClick={handleSelect}
      className={cn(
        "px-5 py-2.5 sm:px-7 sm:py-3.5 rounded-full text-sm sm:text-base font-bold transition-all outline-none shrink-0",
        isActive
          ? "bg-theme_13_samecolour text-white shadow-lg"
          : focused
            ? "bg-white/25 text-white"
            : "bg-transparent text-neutral-300 hover:text-theme_1",
        focused ? "ring-4 ring-white scale-105 shadow-2xl" : ""
      )}
    >
      {label}
    </button>
  );
}

function FocusableLogoutButton({ focusKey, label, onClick, upKey }: any) {
  const handleArrowPress = (direction: string) => {
    if (direction === "up") {
      setFocus(upKey);
      return false;
    }
    if (direction === "down") return false;
    return true;
  };

  const { ref, focused } = useFocusable({
    focusKey,
    onArrowPress: handleArrowPress,
    onEnterPress: onClick,
  });
  return (
    <button
      ref={ref as any}
      onClick={onClick}
      className={cn(
        "px-6 py-2.5 sm:px-8 sm:py-3 rounded-full text-sm sm:text-base font-semibold transition-all outline-none",
        focused ? "ring-4 ring-white scale-105 bg-theme_13_samecolour text-white" : "bg-theme_10 text-theme_2_same_colour hover:bg-theme_13_samecolour hover:text-theme_1"
      )}
    >
      {label}
    </button>
  );
}

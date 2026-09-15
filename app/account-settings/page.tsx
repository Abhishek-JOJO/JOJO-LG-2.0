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
import { useLogout } from "@/features/auth/hooks/useLogout";
import { useVerifySubscription } from "@/hooks/useVerifySubscription";
import { StorageKey } from "@/enums/storage.enum";
import { localStorageManager } from "@/lib/localStorage/localStorage.manager";
import { Locale, LOCALE_LABELS, SUPPORTED_LOCALES } from "@/enums/ui.enum";
import { ROUTES } from "@/lib/constants/routes";
import { mapApiRailItem } from "@/components/content-rail/utils/contentRail.mapper";
import JOJOCommonImage from "@/components/ui/JOJOCommonImage";
import { LOGOS } from "@/lib/constants/assets";
import { JOJOImagePreset } from "@/components/ui/JOJOCommonImage";
import { analyticsService } from "@/shared/analytics";
import { EVENT_NAMES } from "@/shared/analytics/constants/analytics.constants";
import { cn } from "@/lib/utils";
import { safeNavigate } from "@/lib/webos/safeNavigate";

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

// Keeps only the first digit and last two digits visible, e.g. "9876543298" -> "9*******98".
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 3) return phone;
  const first = digits.slice(0, 1);
  const last = digits.slice(-2);
  return `${first}${"*".repeat(digits.length - 3)}${last}`;
}

export default function AccountSettingsPage() {
  const router = useRouter();
  const t = useTranslations("tSettings");
  const { isAppReady } = useBootstrap();

  const sessionId = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const { logout } = useLogout();

  const [countryCode, setCountryCode] = useState("IN");
  useEffect(() => {
    const geoCache = localStorageManager.get<any>(StorageKey.GEO_CACHE);
    if (geoCache?.geoData?.country_code) {
      setCountryCode(geoCache.geoData.country_code);
    }
  }, []);
  const { data: subData } = useVerifySubscription(countryCode, sessionId, isAppReady);
  const subscription = subData?.data?.subscription;
  const isExpired = subscription?.dEndDate ? new Date(subscription.dEndDate).getTime() < Date.now() : false;
  const isGold = !!(subscription && !isExpired);

  const phone = user?.phone || "";
  const phoneCode = (user as any)?.phoneCode || (user as any)?.phone_code || "";

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

  // Rows on this page, top to bottom: upgrade button (only if !isGold) -> watchlist
  // row (only if it has items) -> language pills (always) -> logout (always).
  // Every focusable's onArrowPress below is wired directly to these keys instead of
  // relying on norigin's default nearest-neighbor search — that default search can
  // (and on this page, does) land on the always-mounted-but-invisible
  // MODAL_ASSET_DETAIL/MODAL_SEARCH focusables (zero-rect, no DOM node) the moment
  // you press Up from the topmost row, which permanently breaks D-pad focus until
  // reload. Same reasoning as the explicit onArrowPress wiring already used for the
  // navbar and hero carousel elsewhere in this app.
  const hasUpgradeBtn = !isGold;
  const hasWatchlist = watchlistAssets.length > 0;
  const firstLocale = SUPPORTED_LOCALES[0];
  const topRowKey = hasUpgradeBtn ? "account-upgrade-btn" : hasWatchlist ? "account-watchlist-0" : `account-lang-${firstLocale}`;
  const watchlistUpKey = hasUpgradeBtn ? "account-upgrade-btn" : "nav-link-0";
  const langUpKey = hasWatchlist ? "account-watchlist-0" : hasUpgradeBtn ? "account-upgrade-btn" : "nav-link-0";
  const langDownKey = "account-logout-btn";
  const rowAfterUpgradeKey = hasWatchlist ? "account-watchlist-0" : `account-lang-${firstLocale}`;

  useEffect(() => {
    analyticsService.track(EVENT_NAMES.PAGE_VIEW, { screen_name: "account_settings" });
    // Land the D-pad somewhere sensible on open.
    retrySetFocus(topRowKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = () => {
    analyticsService.track(EVENT_NAMES.HELP_AND_SETTING_OPTION_SELECTED, {
      option_name: "logout",
      screen_name: "account_settings",
    });
    logout();
  };

  return (
    <main className="min-h-screen" style={{ background: "var(--theme_12)" }}>
      {/* id/data-focuskey read by FocusableNavLink's onArrowPress('down') fallback so
          pressing Down from the navbar on this (hero-less) page lands deterministically
          on the topmost real row instead of relying on norigin's default nearest-neighbor
          search, which has no reliable candidate to find this far below the navbar. */}
      <div
        id="page-focus-entry"
        data-focuskey={topRowKey}
        className="w-full px-4 sm:px-6 lg:px-14 pt-20 sm:pt-28 lg:pt-32 pb-16 flex flex-col gap-10 sm:gap-12 max-w-[1600px] mx-auto"
      >
        {/* Upgrade banner */}
        {isGold ? (
          <div
            className="relative flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 rounded-2xl border gold-border-gradient shadow-lg w-full"
            style={{ background: "var(--gold-card-bg-gradient)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 relative flex-shrink-0 flex items-center justify-center bg-[#FAAF3F]/10 rounded-xl border border-[#FAAF3F]/20">
                <JOJOCommonImage src={LOGOS.CROWN_LOGO} alt="Crown" width={20} height={20} preset={JOJOImagePreset.Default} />
              </div>
              <div className="text-left">
                <span
                  className="text-sm font-bold tracking-wider uppercase"
                  style={{ background: "var(--gold-text-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                >
                  {t("jojo_gold_premium")}
                </span>
                <p className="text-xs text-theme_5 mt-0.5">{t("premium_welcome_message")}</p>
              </div>
            </div>
            <div className="text-xs font-semibold text-theme_1 px-4 py-1.5 rounded-full border border-theme_1/10 bg-theme_1/5 whitespace-nowrap">
              {t("premium_active")}
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-theme_1">{t("upgrade_heading")}</h1>
              {phone && (
                <p className="text-sm sm:text-base text-theme_5 mt-1.5">
                  {phoneCode ? `${phoneCode} ${maskPhone(phone)}` : maskPhone(phone)}
                </p>
              )}
            </div>
            <FocusableUpgradeButton
              focusKey="account-upgrade-btn"
              label={t("upgrade_to_gold_btn")}
              onClick={() => safeNavigate(router, ROUTES.SUBSCRIPTION)}
              upKey="nav-link-0"
              downKey={rowAfterUpgradeKey}
            />
          </div>
        )}

        {/* Watchlist */}
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-theme_1 mb-4">{t("watchlist_heading")}</h2>
          {watchlistLoading && watchlistAssets.length === 0 ? (
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-[280px] sm:w-[340px] aspect-video rounded-xl bg-theme_10 animate-pulse shrink-0" />
              ))}
            </div>
          ) : watchlistAssets.length > 0 ? (
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

        {/* Logout */}
        <div>
          <FocusableLogoutButton
            focusKey="account-logout-btn"
            label={t("logout")}
            onClick={handleLogout}
            upKey={`account-lang-${firstLocale}`}
          />
        </div>

        {process.env.NEXT_PUBLIC_APP_VERSION && (
          <div className="pt-2 border-t border-[rgba(255,255,255,0.08)]">
            <p className="text-xs text-theme_5">{`JOJO Updated ${process.env.NEXT_PUBLIC_APP_VERSION}`}</p>
          </div>
        )}
      </div>
    </main>
  );
}

function FocusableUpgradeButton({ focusKey, label, onClick, upKey, downKey }: any) {
  const handleArrowPress = (direction: string) => {
    if (direction === "up") {
      setFocus(upKey);
      return false;
    }
    if (direction === "down") {
      setFocus(downKey);
      return false;
    }
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
        "px-6 py-2.5 sm:px-8 sm:py-3 rounded-full text-sm sm:text-base font-bold shrink-0 transition-all outline-none",
        "bg-theme_13_samecolour text-white",
        focused ? "ring-4 ring-white scale-105 shadow-2xl" : "hover:opacity-90"
      )}
    >
      {label}
    </button>
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

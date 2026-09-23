"use client";

import { useProfessionalAssets } from "@/features/content/hooks/useProfessionalAssets";
import JOJOCommonImage, {
  JOJOImagePreset,
  JOJOImagePosition,
  JOJOImageContentMode,
} from "@/components/ui/JOJOCommonImage";
import { Loader } from "@/components/common/Loader";
import { ChevronLeft, Play } from "lucide-react";
import { getAssetTypeSlug, slugify } from "@/features/asset/store/useAssetDetailStore";
import { useRef, useEffect } from "react";
import { useFocusable, setFocus, doesFocusableExist, FocusContext } from "@noriginmedia/norigin-spatial-navigation";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useTranslations } from "next-intl";
import { safeNavigate } from "@/lib/webos/safeNavigate";
import { WEBOS_KEYS } from "@/src/navigation/RemoteManager";

function retrySetFocus(focusKey: string, attempts = 5, intervalMs = 60) {
  if (doesFocusableExist(focusKey)) {
    setFocus(focusKey);
    return;
  }
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

interface CastDetailsPopupProps {
  professionalId: string;
  onClose: () => void;
  openAssetDetail: (id: string, type: string, title: string) => void;
  isStandalone: boolean;
  router: any;
}

const resolveImage = (asset: any): string => {
  const pick = (arr: any[]) => {
    if (!Array.isArray(arr) || !arr.length) return "";
    return (arr.find((x: any) => x.is_default) || arr[0])?.url || "";
  };
  return (
    pick(asset?.landscape) ||
    pick(asset?.portrait) ||
    pick(asset?.poster) ||
    asset?.image ||
    asset?.thumbnail ||
    ""
  );
};

const resolveTitle = (item: any): string => {
  const a = item?.asset || item;
  return a?.asset_title || a?.name_analytics || a?.title || a?.name || "";
};

const resolveId = (item: any): string => {
  const asset = item?.asset || item;
  return String(asset?.id || asset?.asset_id || item?.item_id || item?.id || "");
};

export function CastDetailsPopup({
  professionalId,
  onClose,
  openAssetDetail,
  isStandalone,
  router,
}: CastDetailsPopupProps) {
  const t = useTranslations("hoverCard");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, isError } = useProfessionalAssets(professionalId);

  const professional = data?.professional;
  const assets = data?.assets || [];

  const professionalDisplayName = professional
    ? `${professional.first_name || ""} ${professional.last_name || ""}`.trim() || professional.professional_name
    : "";

  const description = professional?.description || "";
  const knownForText = professional?.known_for || "";

  // Lock body scroll when popup is open
  useBodyScrollLock(true);

  // Escape (browser testing) / webOS remote Back button support.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.keyCode === WEBOS_KEYS.BACK) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [onClose]);

  // Boundary focus for popup so remote navigation cannot leak behind it
  const { ref: popupFocusRef, focusKey: popupFocusKey } = useFocusable({
    focusKey: "cast-details-popup",
    isFocusBoundary: true,
    preferredChildFocusKey: "cast-popup-back-btn",
  });

  // Focus the TV Back button on open
  useEffect(() => {
    retrySetFocus("cast-popup-back-btn");
  }, []);

  const handleAssetClick = (item: any) => {
    const id = resolveId(item);
    const title = resolveTitle(item);
    const assetType = item?.asset_type || item?.assetTypeCode || "movies";

    onClose(); // Close professional popup first

    if (isStandalone) {
      const typeSlug = getAssetTypeSlug(assetType);
      const titleSlug = slugify(title);
      const targetUrl = titleSlug ? `/${typeSlug}/${titleSlug}/${id}` : `/${typeSlug}/${id}`;
      safeNavigate(router, targetUrl);
    } else {
      openAssetDetail(id, assetType, title);
    }
  };

  // Safe helper to format professions without ever leaking missing keys like 'hoverCard.host'
  const formatProfession = (prof: string) => {
    if (!prof) return "";
    const trimmed = prof.trim();
    const key = trimmed.toLowerCase();
    try {
      if (typeof (t as any)?.has === "function" && (t as any).has(key)) {
        return t(key);
      }
    } catch {}
    return trimmed
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  return (
    <FocusContext.Provider value={popupFocusKey}>
      <div
        ref={popupFocusRef as any}
        className="fixed inset-0 z-[100000] w-screen h-screen bg-[#070708] text-white flex flex-col overflow-hidden select-none"
      >
        {/* Subtle cinematic gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 15% 10%, rgba(242, 110, 33, 0.12), transparent 70%), linear-gradient(to bottom, #111116 0%, #070708 30%, #040405 100%)",
          }}
        />

        {/* TV Top Header Bar */}
        <div className="relative shrink-0 z-30 flex items-center justify-between px-8 sm:px-12 lg:px-16 pt-8 pb-5">
          <FocusableCastPopupBackButton
            onClose={onClose}
            hasAssets={assets.length > 0}
            onFocused={() => {
              scrollContainerRef.current?.scrollTo({ top: 0, behavior: "auto" });
            }}
          />
          <span className="text-xs uppercase tracking-widest text-neutral-400 font-semibold">
            {t("cast_details")}
          </span>
        </div>

        {/* Scrollable TV Content Canvas */}
        <div
          ref={scrollContainerRef}
          className="relative flex-1 overflow-y-auto px-8 sm:px-12 lg:px-16 pt-4 pb-24 w-full scrollbar-none"
        >
          {isLoading ? (
            <div className="flex min-h-[50vh] items-center justify-center">
              <Loader size="lg" />
            </div>
          ) : isError || !professional ? (
            <div className="flex min-h-[50vh] flex-col items-center justify-center text-center gap-4">
              <span className="text-4xl">⚠️</span>
              <p className="text-base text-neutral-400">{t("failed_load_details")}</p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-theme_13_samecolour text-white rounded-full text-sm font-bold transition hover:opacity-90 mt-2 cursor-pointer"
              >
                {t("go_back")}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-10 max-w-[1700px] mx-auto">
              {/* Artist Profile Header (Integrated TV Layout) */}
              <div className="flex flex-col sm:flex-row gap-8 lg:gap-12 items-center sm:items-start pb-8 border-b border-white/10">
                {/* Photo */}
                <div className="relative w-40 h-40 sm:w-48 sm:h-48 lg:w-52 lg:h-52 rounded-full overflow-hidden shrink-0 shadow-2xl bg-neutral-900 ring-2 ring-white/15 flex items-center justify-center">
                  {professional.image ? (
                    <JOJOCommonImage
                      src={professional.image}
                      alt={professionalDisplayName}
                      fill
                      width={400}
                      height={400}
                      preset={JOJOImagePreset.Avatar}
                      contentMode={JOJOImageContentMode.Cover}
                      position={JOJOImagePosition.Top}
                      className="object-cover object-top"
                      wrapperClassName="w-full h-full rounded-full"
                      style={{ objectPosition: "center top" }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-neutral-850 text-neutral-400 font-black text-6xl select-none">
                      {professionalDisplayName ? professionalDisplayName.charAt(0) : "?"}
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-center sm:justify-start text-center sm:text-left">
                  {/* Profession */}
                  <div className="text-xs sm:text-sm font-bold text-theme_13_samecolour uppercase tracking-wider mb-2">
                    {professional.professions && professional.professions.length > 0
                      ? professional.professions
                          .map((prof: string) => formatProfession(prof))
                          .filter(Boolean)
                          .join(", ")
                      : t("cast")}
                  </div>

                  {/* Name */}
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight mb-3 drop-shadow">
                    {professionalDisplayName}
                  </h1>

                  {/* Clean Metadata Line (Born, Height, Known For) */}
                  {(knownForText || professional.dob || professional.height) && (
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 text-xs sm:text-sm text-neutral-400 font-medium mb-4">
                      {knownForText && (
                        <span>
                          <span className="text-neutral-500 font-semibold">{t("known_for")}</span>{" "}
                          <span className="text-neutral-300">{knownForText}</span>
                        </span>
                      )}
                      {knownForText && (professional.dob || professional.height) && (
                        <span className="text-neutral-600">•</span>
                      )}
                      {professional.dob && (
                        <span>
                          <span className="text-neutral-500 font-semibold">{t("dob")}</span>{" "}
                          <span className="text-neutral-300">{professional.dob}</span>
                        </span>
                      )}
                      {professional.dob && professional.height && (
                        <span className="text-neutral-600">•</span>
                      )}
                      {professional.height && (
                        <span>
                          <span className="text-neutral-500 font-semibold">{t("height")}</span>{" "}
                          <span className="text-neutral-300">{professional.height}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Description / Bio */}
                  {description && (
                    <p className="text-sm sm:text-base leading-relaxed text-neutral-300 max-w-4xl font-normal">
                      {description}
                    </p>
                  )}
                </div>
              </div>

              {/* Works & Features Grid */}
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
                    {t("works_features")}
                  </h2>
                  {assets.length > 0 && (
                    <span className="text-sm font-semibold text-neutral-400">
                      ({assets.length})
                    </span>
                  )}
                </div>

                {assets.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                    {assets.map((item: any, idx: number) => {
                      const title = resolveTitle(item);
                      const imgUrl = resolveImage(item);

                      return (
                        <FocusableCastPopupAssetItem
                          key={resolveId(item) || idx}
                          idx={idx}
                          total={assets.length}
                          title={title}
                          imgUrl={imgUrl}
                          onSelect={() => handleAssetClick(item)}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 text-neutral-500 text-sm">
                    {t("no_works_found")}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </FocusContext.Provider>
  );
}

function FocusableCastPopupBackButton({
  onClose,
  hasAssets,
  onFocused,
}: {
  onClose: () => void;
  hasAssets?: boolean;
  onFocused?: () => void;
}) {
  const { ref, focused } = useFocusable({
    focusKey: "cast-popup-back-btn",
    onEnterPress: onClose,
    onArrowPress: (direction) => {
      if (direction === "down" && hasAssets) {
        setFocus("cast-popup-asset-0");
        return false;
      }
      return false;
    },
    onFocus: () => {
      onFocused?.();
    },
  });

  return (
    <button
      ref={ref as any}
      onClick={onClose}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-transform duration-150 outline-none cursor-pointer select-none ${
        focused
          ? "bg-white text-neutral-950 font-bold ring-4 ring-white/60 shadow-2xl scale-105"
          : "bg-white/10 text-white/90 border border-white/15 hover:bg-white/20"
      }`}
      aria-label="Back to content"
    >
      <ChevronLeft size={20} className={focused ? "text-neutral-950" : "text-white"} />
      <span className="text-sm font-semibold tracking-wide">Back</span>
    </button>
  );
}

function FocusableCastPopupAssetItem({ idx, total, title, imgUrl, onSelect }: any) {
  const { ref, focused } = useFocusable({
    focusKey: `cast-popup-asset-${idx}`,
    onEnterPress: onSelect,
    onArrowPress: (direction) => {
      if (direction === "up") {
        // If element is on the top visual row, navigate to the Back button
        const el = ref.current as HTMLElement | null;
        const parent = el?.parentElement;
        const firstChild = parent?.firstElementChild as HTMLElement | null;
        const isTopRow = !el || !firstChild || Math.abs(el.offsetTop - firstChild.offsetTop) < 15;

        if (isTopRow) {
          setFocus("cast-popup-back-btn");
          return false;
        }
      }
      // For all other directions (down, left, right, or up from row 2+),
      // allow Norigin 2D spatial navigation to calculate instantly with 0ms delay.
      return true;
    },
    onFocus: () => {
      ref.current?.scrollIntoView({ behavior: "auto", block: "nearest", inline: "nearest" });
    },
  });

  return (
    <div
      ref={ref as any}
      onClick={onSelect}
      className={`group relative aspect-video rounded-xl overflow-hidden cursor-pointer bg-neutral-900 transition-transform duration-150 will-change-transform ${
        focused
          ? "border-2 border-white ring-4 ring-white/50 scale-105 shadow-2xl z-10"
          : "border border-white/10 hover:border-white/20"
      }`}
    >
      {imgUrl ? (
        <JOJOCommonImage
          src={imgUrl}
          alt={title}
          fill
          className="object-cover"
          wrapperClassName="w-full h-full"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center p-3 text-center text-sm font-semibold text-neutral-400 bg-neutral-850">
          {title}
        </div>
      )}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent transition-opacity duration-150 flex items-end p-4 ${
          focused ? "opacity-100" : "opacity-80"
        }`}
      >
        <span className="text-xs sm:text-sm font-bold text-white truncate w-full drop-shadow">
          {title}
        </span>
      </div>
      <div
        className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-150 ${
          focused ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="w-12 h-12 rounded-full bg-theme_13_samecolour text-black flex items-center justify-center shadow-2xl">
          <Play size={20} fill="currentColor" className="ml-0.5" />
        </div>
      </div>
    </div>
  );
}

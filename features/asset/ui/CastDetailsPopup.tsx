"use client";

import { useProfessionalAssets } from "@/features/content/hooks/useProfessionalAssets";
import JOJOCommonImage from "@/components/ui/JOJOCommonImage";
import { Loader } from "@/components/common/Loader";
import { ChevronLeft, X, Play } from "lucide-react";
import { getAssetTypeSlug, slugify } from "@/features/asset/store/useAssetDetailStore";
import { motion } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { useFocusable, setFocus, doesFocusableExist } from "@noriginmedia/norigin-spatial-navigation";

import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useTranslations } from "next-intl";
import { safeNavigate } from "@/lib/webos/safeNavigate";
import { WEBOS_KEYS } from "@/src/navigation/RemoteManager";

// Fixed column count the asset grid renders at on TV — used for Up/Down/Left/Right
// math below. See the matching retrySetFocus in AssetDetailView.tsx: this popup
// stays mounted over a page that keeps re-rendering in the background (hero
// preview video ticks), which can drop norigin's focus pointer right after
// this popup (and its focusables) mount — retry a few times instead of hoping
// a single setFocus lands.
const GRID_COLS = 3;
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [isKnownForExpanded, setIsKnownForExpanded] = useState(false);
  const { data, isLoading, isError } = useProfessionalAssets(professionalId);

  const professional = data?.professional;
  const assets = data?.assets || [];

  const professionalDisplayName = professional
    ? `${professional.first_name || ""} ${professional.last_name || ""}`.trim() || professional.professional_name
    : "";

  const CHAR_LIMIT = 180;
  const description = professional?.description || "";
  const shouldTruncate = description.length > CHAR_LIMIT;
  const displayDescription = shouldTruncate && !isExpanded
    ? `${description.slice(0, CHAR_LIMIT)}...`
    : description;

  const knownForText = professional?.known_for || "";
  const shouldTruncateKnownFor = knownForText.length > 75;
  const displayKnownFor = shouldTruncateKnownFor && !isKnownForExpanded
    ? `${knownForText.slice(0, 75)}...`
    : knownForText;

  // Lock body scroll when popup is open
  useBodyScrollLock(true);

  // Escape (browser testing) / webOS remote Back button support.
  // Registered with capture:true so it runs before RemoteManager's own
  // (bubble-phase) Back-key listener — that listener checks e.defaultPrevented
  // and bails, but only if we've already called preventDefault by the time it
  // runs. Without capture, RemoteManager's listener (mounted once at app root,
  // long before this popup exists) fires first and navigates the whole page
  // back instead of just closing this popup.
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

  // Auto-focus the close button so the remote has somewhere to land on open.
  useEffect(() => {
    retrySetFocus("cast-popup-close-btn");
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

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === scrollContainerRef.current) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] overflow-hidden">
      {/* Backdrop Blur Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.28, ease: "easeInOut" }}
        className="absolute inset-0 bg-black/45"
        style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
        onClick={onClose}
      />

      {/* Scrollable Container */}
      <div
        ref={scrollContainerRef}
        onClick={handleBackdropClick}
        className="absolute inset-0 overflow-y-auto flex items-start justify-center p-4 sm:p-6 overscroll-contain"
      >
        <motion.div
          initial={{ y: "100vh", opacity: 0.9, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: "100vh", opacity: 0.9, scale: 0.98 }}
          transition={{ type: "spring", damping: 26, stiffness: 200, mass: 0.85 }}
          className="relative w-full max-w-[1100px] lg:max-w-[1300px] my-8 bg-theme_10 text-white rounded-2xl overflow-hidden p-8 sm:p-10 lg:p-12 flex flex-col gap-8 z-10"
        >
          {/* Header Navigation */}
          <div className="flex items-center justify-between border-b border-neutral-900 pb-4">
            <div className="flex items-center gap-2 text-white text-lg sm:text-xl font-bold">
              <ChevronLeft size={22} />
              <span>{t("cast_details")}</span>
            </div>

            <FocusableCastPopupCloseButton onClose={onClose} />
          </div>

          {isLoading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <Loader size="lg" />
            </div>
          ) : isError || !professional ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center text-center gap-3">
              <span className="text-3xl">⚠️</span>
              <p className="text-sm text-neutral-400">{t("failed_load_details")}</p>
              <button
                onClick={onClose}
                className="px-5 py-2 bg-theme_13_samecolour rounded-full text-xs font-bold transition hover:opacity-90 mt-2"
              >
                {t("go_back")}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {/* Bio Row */}
              <div className="flex flex-col sm:flex-row gap-8 items-center sm:items-start text-center sm:text-left">
                {/* Avatar circle */}
                <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-full overflow-hidden shrink-0 shadow-lg bg-neutral-900 flex items-center justify-center">
                  {professional.image ? (
                    <JOJOCommonImage
                      src={professional.image}
                      alt={professionalDisplayName}
                      fill
                      className="object-cover"
                      wrapperClassName="w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-neutral-400 font-bold text-5xl select-none">
                      {professionalDisplayName ? professionalDisplayName.charAt(0) : "?"}
                    </div>
                  )}
                </div>

                {/* Name & Professions Info */}
                <div className="flex-1 flex flex-col justify-center sm:justify-start pt-1">
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-2 tracking-tight">
                    {professionalDisplayName}
                  </h2>
                  <div className="text-sm sm:text-base text-theme_13_samecolour font-bold uppercase tracking-wider mb-4">
                    {professional.professions && professional.professions.length > 0
                      ? professional.professions.map((prof: string) => {
                          const key = prof.toLowerCase();
                          return t(key, { defaultValue: prof });
                        }).join(", ")
                      : t("cast")}
                  </div>
                  {description && (
                    <div className="text-sm sm:text-base leading-relaxed text-neutral-300">
                      <span className="inline">{displayDescription}</span>
                      {shouldTruncate && (
                        <button
                          onClick={() => setIsExpanded(!isExpanded)}
                          className="text-theme_13_samecolour hover:underline font-bold ml-1.5 focus:outline-none inline-block text-sm"
                        >
                          {isExpanded ? t("view_less") : t("view_more")}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Additional Metadata */}
                  <div className="flex flex-col gap-1.5 mt-4 text-xs sm:text-sm text-neutral-400 font-medium">
                    {knownForText && (
                      <div>
                        <span className="text-neutral-500 font-bold">{t("known_for")}</span>{" "}
                        <span className="text-neutral-300 inline">{displayKnownFor}</span>
                        {shouldTruncateKnownFor && (
                          <button
                            onClick={() => setIsKnownForExpanded(!isKnownForExpanded)}
                            className="text-theme_13_samecolour hover:underline font-bold ml-1.5 focus:outline-none inline-block text-xs sm:text-sm"
                          >
                            {isKnownForExpanded ? t("view_less") : t("view_more")}
                          </button>
                        )}
                      </div>
                    )}
                    {professional.dob && (
                      <div>
                        <span className="text-neutral-500 font-bold">{t("dob")}</span>{" "}
                        <span className="text-neutral-300">{professional.dob}</span>
                      </div>
                    )}
                    {professional.height && (
                      <div>
                        <span className="text-neutral-500 font-bold">{t("height")}</span>{" "}
                        <span className="text-neutral-300">{professional.height}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Assets Grid */}
              <div className="mt-4">
                <h3 className="text-lg sm:text-xl font-bold text-white mb-5 border-b border-neutral-900 pb-3">
                  {t("works_features")}
                </h3>
                {assets.length > 0 ? (
                  <div className="grid grid-cols-3 gap-5 sm:gap-6">
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
                  <div className="text-center py-8 text-neutral-500 text-sm">
                    {t("no_works_found")}
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function FocusableCastPopupCloseButton({ onClose }: { onClose: () => void }) {
  const { ref, focused } = useFocusable({
    focusKey: "cast-popup-close-btn",
    onEnterPress: onClose,
    onArrowPress: (direction) => {
      if (direction === "down") {
        retrySetFocus("cast-popup-asset-0");
        return false;
      }
      return true;
    },
  });
  return (
    <button
      ref={ref as any}
      onClick={onClose}
      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-neutral-900/60 hover:bg-neutral-800/80 border transition-all flex items-center justify-center cursor-pointer text-neutral-300 hover:text-white outline-none ${focused ? "ring-4 ring-white border-white bg-neutral-800 scale-110" : "border-white/10"}`}
      aria-label="Close professional details"
    >
      <X size={22} />
    </button>
  );
}

function FocusableCastPopupAssetItem({ idx, total, title, imgUrl, onSelect }: any) {
  const { ref, focused } = useFocusable({
    focusKey: `cast-popup-asset-${idx}`,
    onEnterPress: onSelect,
    onArrowPress: (direction) => {
      const row = Math.floor(idx / GRID_COLS);
      const col = idx % GRID_COLS;
      if (direction === "up") {
        if (row === 0) {
          retrySetFocus("cast-popup-close-btn");
        } else {
          retrySetFocus(`cast-popup-asset-${idx - GRID_COLS}`);
        }
        return false;
      }
      if (direction === "down" && idx + GRID_COLS < total) {
        retrySetFocus(`cast-popup-asset-${idx + GRID_COLS}`);
        return false;
      }
      if (direction === "left" && col > 0) {
        retrySetFocus(`cast-popup-asset-${idx - 1}`);
        return false;
      }
      if (direction === "right" && col < GRID_COLS - 1 && idx + 1 < total) {
        retrySetFocus(`cast-popup-asset-${idx + 1}`);
        return false;
      }
      return true;
    },
    onFocus: () => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    },
  });

  return (
    <div
      ref={ref as any}
      onClick={onSelect}
      className={`group relative aspect-video rounded-2xl overflow-hidden cursor-pointer border bg-neutral-900 shadow-md transition-all duration-300 ${focused ? "border-white ring-4 ring-white scale-[1.04] shadow-2xl z-10" : "border-neutral-800/40 hover:scale-[1.02]"}`}
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
        <div className="w-full h-full flex items-center justify-center p-2 text-center text-sm text-neutral-500 bg-neutral-850">
          {title}
        </div>
      )}
      <div className={`absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent transition-opacity duration-300 flex items-end p-3 ${focused ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
        <span className="text-xs sm:text-sm font-semibold text-white truncate w-full">{title}</span>
      </div>
      {focused && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-11 h-11 rounded-full bg-theme_13_samecolour/90 text-black flex items-center justify-center">
            <Play size={18} fill="currentColor" className="ml-0.5" />
          </div>
        </div>
      )}
    </div>
  );
}

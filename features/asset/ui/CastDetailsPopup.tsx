"use client";

import { useProfessionalAssets } from "@/features/content/hooks/useProfessionalAssets";
import JOJOCommonImage from "@/components/ui/JOJOCommonImage";
import { Loader } from "@/components/common/Loader";
import { ChevronLeft, X, Play } from "lucide-react";
import { getAssetTypeSlug, slugify } from "@/features/asset/store/useAssetDetailStore";
import { motion } from "framer-motion";
import { useRef, useEffect, useState } from "react";

import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useTranslations } from "next-intl";

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

  // Escape key support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleAssetClick = (item: any) => {
    const id = resolveId(item);
    const title = resolveTitle(item);
    const assetType = item?.asset_type || item?.assetTypeCode || "movies";

    onClose(); // Close professional popup first

    if (isStandalone) {
      const typeSlug = getAssetTypeSlug(assetType);
      const titleSlug = slugify(title);
      const targetUrl = titleSlug ? `/${typeSlug}/${titleSlug}/${id}` : `/${typeSlug}/${id}`;
      router.push(targetUrl);
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
          className="relative w-full max-w-[850px] my-8 bg-theme_10 text-white rounded-[12px] overflow-hidden p-6 sm:p-8 flex flex-col gap-6 z-10"
        >
          {/* Header Navigation */}
          <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 text-white transition-colors text-base sm:text-lg font-bold cursor-pointer"
            >
              <ChevronLeft size={18} />
              <span>{t("cast_details")}</span>
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-neutral-900/60 hover:bg-neutral-800/80 border border-white/10 transition-colors flex items-center justify-center cursor-pointer text-neutral-400 hover:text-white"
              aria-label="Close professional details"
            >
              <X size={18} />
            </button>
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
            <div className="flex flex-col gap-6">
              {/* Bio Row */}
              <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left">
                {/* Avatar circle */}
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden shrink-0 shadow-lg bg-neutral-900 flex items-center justify-center">
                  {professional.image ? (
                    <JOJOCommonImage
                      src={professional.image}
                      alt={professionalDisplayName}
                      fill
                      className="object-cover"
                      wrapperClassName="w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-neutral-400 font-bold text-3xl select-none">
                      {professionalDisplayName ? professionalDisplayName.charAt(0) : "?"}
                    </div>
                  )}
                </div>

                {/* Name & Professions Info */}
                <div className="flex-1 flex flex-col justify-center sm:justify-start pt-1">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white mb-1.5 tracking-tight">
                    {professionalDisplayName}
                  </h2>
                  <div className="text-xs sm:text-sm text-theme_13_samecolour font-bold uppercase tracking-wider mb-3">
                    {professional.professions && professional.professions.length > 0
                      ? professional.professions.map((prof: string) => {
                          const key = prof.toLowerCase();
                          return t(key, { defaultValue: prof });
                        }).join(", ")
                      : t("cast")}
                  </div>
                  {description && (
                    <div className="text-xs sm:text-sm leading-relaxed text-neutral-300">
                      <span className="inline">{displayDescription}</span>
                      {shouldTruncate && (
                        <button
                          onClick={() => setIsExpanded(!isExpanded)}
                          className="text-theme_13_samecolour hover:underline font-bold ml-1.5 focus:outline-none inline-block text-[11px] sm:text-xs"
                        >
                          {isExpanded ? t("view_less") : t("view_more")}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Additional Metadata */}
                  <div className="flex flex-col gap-1 mt-3 text-[11px] sm:text-xs text-neutral-400 font-medium">
                    {knownForText && (
                      <div>
                        <span className="text-neutral-500 font-bold">{t("known_for")}</span>{" "}
                        <span className="text-neutral-300 inline">{displayKnownFor}</span>
                        {shouldTruncateKnownFor && (
                          <button
                            onClick={() => setIsKnownForExpanded(!isKnownForExpanded)}
                            className="text-theme_13_samecolour hover:underline font-bold ml-1.5 focus:outline-none inline-block text-[10px] sm:text-[11px]"
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
                <h3 className="text-base sm:text-lg font-bold text-white mb-4 border-b border-neutral-900 pb-2">
                  {t("works_features")}
                </h3>
                {assets.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {assets.map((item: any, idx: number) => {
                      const title = resolveTitle(item);
                      const imgUrl = resolveImage(item);

                      return (
                        <div
                          key={resolveId(item) || idx}
                          onClick={() => handleAssetClick(item)}
                          className="relative aspect-video rounded-[12px] overflow-hidden cursor-pointer border border-neutral-800/40 bg-neutral-900 shadow-md"
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
                            <div className="w-full h-full flex items-center justify-center p-2 text-center text-xs text-neutral-500 bg-neutral-850">
                              {title}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-neutral-500 text-xs sm:text-sm">
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

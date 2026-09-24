"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, memo } from "react";
import { useLocaleStore } from "@/store/useLocaleStore";
import { useFocusable, FocusContext, setFocus, doesFocusableExist } from "@noriginmedia/norigin-spatial-navigation";
import { restorePageFocus } from "@/src/navigation/focusUtils";
import { safeNavigate } from "@/lib/webos/safeNavigate";

import { ContentRailSection } from "@/components/content-rail/ContentRailSection";
import { RailCardVariant } from "@/components/content-rail/config/contentRail.types";
import { getPortraitImage, getPosterImage, mapApiRail } from "@/components/content-rail/utils/contentRail.mapper";
import { NoResults } from "@/components/search/NoResults";
import { SearchPagination } from "@/components/search/SearchPagination";
import JOJOCommonImage, { JOJOImageContentMode, JOJOImagePreset } from "@/components/ui/JOJOCommonImage";
import { JOJOCustomInput, JOJOInputSize, JOJOInputState } from "@/components/ui/JOJOInput";
import { JOJOSkeleton } from "@/components/ui/JOJOSkeleton";
import { slugify, useAssetDetailStore } from "@/features/asset/store/useAssetDetailStore";
import { TvKeyboard } from "@/components/search/TvKeyboard";

import { mapAnalyticsAssetCategory } from "@/shared/analytics/utils/mapAnalyticsAssetCategory";
import { useContentRails } from "@/features/content-rail/hooks/useContentRails";
import { useAppNavigation } from "@/features/navigation/hooks/useAppNavigation";
import { useRecentSearches } from "@/features/search/hooks/useRecentSearches";
import { useSearch } from "@/features/search/hooks/useSearch";
import { useDebounce } from "@/components/search/hooks/useDebounce";
import { useDragScroll } from "@/hooks/useDragScroll";
import { ROUTES } from "@/lib/constants/routes";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useBootstrap } from "@lib/bootstrap/BootstrapContext";
import { useRouter } from "next/navigation";
import { analyticsService } from "@/shared/analytics";
import { EVENT_NAMES } from "@/shared/analytics/constants/analytics.constants";
import { useBrowseHiddenStore } from "@/store/useBrowseHiddenStore";

// ─── shared grid ──────────────────────────────────────────────────────────────
// Fixed at 5 columns from md up (never more) so every poster keeps a large,
// consistent 2:3 size — was previously stretching up to 10 columns and
// shrinking cards down before that.
const POSTER_GRID =
  "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5";

// ─── helpers ──────────────────────────────────────────────────────────────────

// Prefers a genuinely portrait-ratio image (ratio_id aware, same helpers
// mapApiRailItem uses for every other portrait card in the app) before ever
// falling back to a landscape thumbnail — picking is_default/[0] without
// checking ratio_id could grab a landscape-shaped entry and force-crop it
// into this 2:3 card, cutting off title art and faces.
function resolveImage(asset: any): string {
  if (!asset) return "";
  const portraitArr = Array.isArray(asset?.portrait) ? asset.portrait : undefined;
  const posterArr = Array.isArray(asset?.poster) ? asset.poster : undefined;
  const landscapeArr = Array.isArray(asset?.landscape) ? asset.landscape : undefined;

  return (
    getPortraitImage(portraitArr) ||
    posterArr?.find((img: any) => Number(img?.ratio_id) === 4)?.url ||
    getPosterImage(posterArr) ||
    portraitArr?.[0]?.url ||
    posterArr?.[0]?.url ||
    landscapeArr?.[0]?.url ||
    (typeof asset?.image === "string" ? asset.image : undefined) ||
    (typeof asset?.thumbnail === "string" ? asset.thumbnail : undefined) ||
    ""
  );
}

function resolveTitle(item: any): string {
  if (item?.genre) return item.genre.name || "";
  const a = item?.asset || item;
  return a?.asset_title || a?.name_analytics || a?.title || a?.name || "";
}

function resolveId(item: any): string {
  const asset = item?.asset || item;
  return String(asset?.id || asset?.asset_id || item?.item_id || item?.id || "");
}

/**
 * Keeps a D-pad-focused element visible inside the search modal's own scroll
 * container. The modal scrolls internally (fixed panel, overflow-y-auto) rather
 * than the window, so nothing else in the app follows focus into it automatically.
 */
function useScrollIntoViewOnFocus(ref: React.RefObject<HTMLElement | null>, focused: boolean) {
  useEffect(() => {
    if (focused && ref.current) {
      ref.current.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });
    }
  }, [focused, ref]);
}

// ─── Focusable Search Input ───────────────────────────────────────────────────

function FocusableSearchInput({
  inputRef,
  value,
  onChange,
  placeholder,
  hasQuery,
  hasResults,
  hasRecents,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  hasQuery: boolean;
  hasResults: boolean;
  hasRecents: boolean;
}) {
  const { ref, focused, focusKey } = useFocusable({
    focusKey: "search-input",
    onEnterPress: () => {},
    onArrowPress: (direction) => {
      if (direction === "left") {
        if (doesFocusableExist("tv-key-0-5")) {
          setFocus("tv-key-0-5");
          return false;
        }
      }
      if (direction === "right") {
        if (hasQuery && doesFocusableExist("search-clear-btn")) {
          setFocus("search-clear-btn");
        } else if (doesFocusableExist("search-close-btn")) {
          setFocus("search-close-btn");
        }
        return false;
      }
      if (direction === "down") {
        if (hasQuery && hasResults && doesFocusableExist("search-poster-0")) {
          setFocus("search-poster-0");
          return false;
        }
        if (!hasQuery && hasRecents && doesFocusableExist("recent-chip-0")) {
          setFocus("recent-chip-0");
          return false;
        }
        return true;
      }
      if (direction === "up") {
        return false;
      }
      return true;
    },
  });

  return (
    <div
      ref={ref as any}
      data-focuskey={focusKey}
      className={`flex-1 flex items-center h-[42px] px-3 rounded-full transition-all duration-200 cursor-default ${
        focused
          ? "border-2 border-white ring-2 ring-white/60 bg-white/10 shadow-lg"
          : "border-2 border-transparent hover:border-white/20 bg-transparent"
      }`}
    >
      <JOJOCustomInput
        ref={inputRef}
        size={JOJOInputSize.S}
        state={JOJOInputState.DEFAULT}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        readOnly={true}
        inputMode="none"
        tabIndex={-1}
        aria-label={placeholder}
        inputConfig={{
          background: "transparent",
          caretColor: "transparent",
          placeholderColor: "theme_5",
        }}
        className="!bg-transparent !rounded-none !h-auto !px-0 border-none body-sm-regular w-full cursor-default"
      />
    </div>
  );
}

// ─── Search Clear Button ─────────────────────────────────────────────────────

function SearchClearButton({ onClear, label }: { onClear: () => void; label: string }) {
  const { ref, focused, focusKey } = useFocusable({
    focusKey: "search-clear-btn",
    onEnterPress: onClear,
    onArrowPress: (direction) => {
      if (direction === "left") {
        setFocus("search-input");
        return false;
      }
      if (direction === "right") {
        if (doesFocusableExist("search-close-btn")) {
          setFocus("search-close-btn");
        }
        return false;
      }
      if (direction === "down") {
        if (doesFocusableExist("search-poster-0")) {
          setFocus("search-poster-0");
          return false;
        }
        return true;
      }
      if (direction === "up") {
        return false;
      }
      return true;
    },
  });

  return (
    <div
      ref={ref as any}
      data-focuskey={focusKey}
      role="button"
      aria-label={label}
      onClick={onClear}
      className={`p-1.5 rounded-full transition-all cursor-pointer ${
        focused
          ? "bg-white text-black scale-110 ring-2 ring-white"
          : "text-theme_5 hover:text-theme_1 hover:bg-white/10"
      }`}
    >
      <X className="w-4 h-4" />
    </div>
  );
}

import { tvSoundManager } from "@/lib/webos/tvSoundManager";

// ─── PosterCard ───────────────────────────────────────────────────────────────

const PosterCard = memo(function PosterCard({
  item,
  index,
  totalCols = 5,
  hasRecents = false,
  onClick,
}: {
  item: any;
  index?: number;
  totalCols?: number;
  hasRecents?: boolean;
  onClick: () => void;
}) {
  const asset = item?.asset || item;
  const title = resolveTitle(item);
  const img = item?.genre ? item.genre.image || "" : resolveImage(asset);
  const customFocusKey = typeof index === "number" ? `search-poster-${index}` : undefined;

  const handleClick = useCallback(() => {
    try {
      tvSoundManager.play("select");
    } catch {}
    onClick();
  }, [onClick]);

  const { ref, focused, focusKey } = useFocusable({
    focusKey: customFocusKey,
    onEnterPress: handleClick,
    onArrowPress: (direction) => {
      try {
        tvSoundManager.play("nav");
      } catch {}
      if (direction === "left" && typeof index === "number" && index % totalCols === 0) {
        if (doesFocusableExist("tv-key-0-5")) {
          setFocus("tv-key-0-5");
          return false;
        }
      }
      if (direction === "up" && typeof index === "number" && index < totalCols) {
        if (hasRecents && doesFocusableExist("recent-chip-0")) {
          setFocus("recent-chip-0");
        } else {
          setFocus("search-input");
        }
        return false;
      }
      return true;
    },
  });
  useScrollIntoViewOnFocus(ref, focused);

  return (
    <div
      ref={ref as any}
      data-focuskey={focusKey}
      onClick={handleClick}
      className={`aspect-[2/3] relative rounded-xl overflow-hidden bg-[#161616] cursor-pointer transition-transform duration-75 ${
        focused ? "scale-105 z-10 shadow-2xl ring-2 ring-white" : "border border-white/5"
      }`}
    >
      {img ? (
        <JOJOCommonImage
          src={img}
          alt={title}
          fill
          contentMode={JOJOImageContentMode.Cover}
          optimizeRequestURL={true}
          wrapperClassName="w-full h-full pointer-events-none select-none"
        />
      ) : (
        <div className="w-full h-full bg-theme_1/8 flex items-center justify-center p-2 text-center caption-xs-regular text-theme_5">
          {title}
        </div>
      )}
    </div>
  );
});

// ─── Recent search chip ────────────────────────────────────────────────────────

function RecentChip({
  term,
  index,
  totalCount,
  onSelect,
  onRemove,
}: {
  term: string;
  index: number;
  totalCount: number;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const { ref, focused, focusKey } = useFocusable({
    focusKey: `recent-chip-${index}`,
    onEnterPress: onSelect,
    onArrowPress: (direction) => {
      if (direction === "left" && index === 0) {
        if (doesFocusableExist("tv-key-0-5")) {
          setFocus("tv-key-0-5");
          return false;
        }
      }
      if (direction === "up") {
        setFocus("search-input");
        return false;
      }
      if (direction === "right" && index === totalCount - 1) {
        if (doesFocusableExist("search-clear-all-btn")) {
          setFocus("search-clear-all-btn");
          return false;
        }
      }
      return true;
    },
  });
  useScrollIntoViewOnFocus(ref, focused);

  return (
    <div
      ref={ref as any}
      data-focuskey={focusKey}
      onClick={onSelect}
      className="flex items-center gap-2 bg-theme_9 rounded-full px-3 py-1.5 cursor-pointer transition-colors duration-150"
      style={focused ? { border: "2px solid #ffffff" } : { border: "2px solid transparent" }}
    >
      <div
        role="button"
        aria-label={`Remove ${term}`}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="text-theme_5 hover:text-theme_1 transition-colors cursor-pointer"
      >
        <X className="w-4 h-4" />
      </div>
      <span className="body-xs-regular text-theme_6">{term}</span>
    </div>
  );
}

function SearchCloseButton({ onClose, label, hasQuery }: { onClose: () => void; label: string; hasQuery?: boolean }) {
  const { ref, focused, focusKey } = useFocusable({
    focusKey: "search-close-btn",
    onEnterPress: onClose,
    onArrowPress: (direction) => {
      if (direction === "left") {
        if (hasQuery && doesFocusableExist("search-clear-btn")) {
          setFocus("search-clear-btn");
        } else {
          setFocus("search-input");
        }
        return false;
      }
      if (direction === "up") {
        return false;
      }
      return true;
    },
  });

  return (
    <div
      ref={ref as any}
      data-focuskey={focusKey}
      role="button"
      aria-label={label}
      onClick={onClose}
      className={`p-1.5 rounded-full transition-all cursor-pointer ${focused ? "bg-white text-black scale-110 ring-2 ring-white" : "text-theme_5 hover:text-theme_1 hover:bg-white/10"}`}
    >
      <X className="w-5 h-5" />
    </div>
  );
}

function ClearAllButton({ onClick, label, recentsCount }: { onClick: () => void; label: string; recentsCount: number }) {
  const { ref, focused, focusKey } = useFocusable({
    focusKey: "search-clear-all-btn",
    onEnterPress: onClick,
    onArrowPress: (direction) => {
      if (direction === "up") {
        setFocus("search-input");
        return false;
      }
      if (direction === "left") {
        if (recentsCount > 0 && doesFocusableExist(`recent-chip-${recentsCount - 1}`)) {
          setFocus(`recent-chip-${recentsCount - 1}`);
          return false;
        }
      }
      return true;
    },
  });
  useScrollIntoViewOnFocus(ref, focused);

  return (
    <div
      ref={ref as any}
      data-focuskey={focusKey}
      role="button"
      onClick={onClick}
      className={`caption-xs-regular rounded-full px-2 py-1 transition-colors cursor-pointer ${focused ? "bg-white text-black scale-105" : "text-theme_5 hover:text-theme_1"}`}
    >
      {label}
    </div>
  );
}

// ─── Genre colour tiles ───────────────────────────────────────────────────────

function GenreRow({
  items,
  onCardClick,
}: {
  items: any[];
  onCardClick: (i: any) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const { isDragging } = useDragScroll(rowRef);

  return (
    <div
      ref={rowRef}
      className={`flex gap-3 overflow-x-auto pb-1 scrollbar-none ${isDragging ? "scroll-auto cursor-grabbing select-none" : "scroll-smooth cursor-grab"
        }`}
    >
      {items.map((item, idx) => {
        const title = resolveTitle(item);
        const img = item?.genre
          ? item.genre.image || ""
          : resolveImage(item?.asset || item);
        return (
          <div
            key={idx}
            onClick={() => onCardClick(item)}
            className={`min-w-[130px] w-[130px] sm:min-w-[150px] sm:w-[150px] h-[68px] sm:h-[76px] relative rounded-xl overflow-hidden cursor-pointer shrink-0 transition-transform duration-300 hover:scale-[1.03]`}
          >
            {img && (
              <JOJOCommonImage
                src={img}
                alt={title}
                fill
                preset={JOJOImagePreset.Product}
                wrapperClassName="w-full h-full opacity-40 mix-blend-overlay"
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center p-2">
              <span className="body-sm-semibold text-theme_1 tracking-wide text-center drop-shadow-md">
                {title}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Recently Added grid ────────────────────────────────────────────────────

/**
 * The "Recently Added" rail renders as a plain poster grid (PosterCard, same as
 * the active-search-results state) instead of going through ContentRailSection's
 * horizontally-scrolling row. ContentRailSection/ContentRailList's per-card
 * onArrowPress wiring (spotlight lead-card cycling, row-active dimming via
 * useActiveRailStore, home-page section jump targets like nav-link-N /
 * hero-carousel) was built for the home page's row layout; reused inside this
 * modal it fights the D-pad instead of just moving focus, since this section
 * has no spotlight lead slot, no row dimming, and none of those home-page
 * escape-hatch targets exist here. A uniform grid of PosterCards needs none of
 * that — it's exactly the same component already working correctly for the
 * search-results grid below — so it just navigates with norigin's default
 * nearest-neighbor search like any other grid.
 */
function RecentlyAddedGrid({
  title,
  items,
  hasRecents = false,
  onCardClick,
}: {
  title: string;
  items: any[];
  hasRecents?: boolean;
  onCardClick: (item: any, index: number) => void;
}) {
  return (
    <div className="px-8 mb-2">
      <h3 className="title-xs-semibold text-theme_1 mb-3">{title}</h3>
      <div className={POSTER_GRID}>
        {items.map((item, idx) => (
          <PosterCard
            key={item.id ?? idx}
            item={item}
            index={idx}
            hasRecents={hasRecents}
            onClick={() => onCardClick(item, idx)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Skeleton grid ────────────────────────────────────────────────────────────

function PosterGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className={POSTER_GRID}>
      {Array.from({ length: count }).map((_, i) => (
        <JOJOSkeleton key={i} variant="image" className="aspect-[2/3] rounded-lg" />
      ))}
    </div>
  );
}

/**
 * Matches the shape of the idle-state browse content it stands in for: rails render
 * as a titled, horizontally-scrolling row (ContentRailSection), not a static grid —
 * so the loading placeholder needs to be shaped the same way, or the swap from
 * skeleton to real content reads as a layout jump instead of a fill-in.
 */
function RailSkeletonRow() {
  return (
    <div className="px-5 sm:px-6 lg:px-8 mb-6">
      <JOJOSkeleton variant="title" className="w-40 mb-3" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <JOJOSkeleton
            key={i}
            variant="image"
            className="shrink-0 w-[180px] sm:w-[220px] aspect-[16/9] rounded-xl"
          />
        ))}
      </div>
    </div>
  );
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSubnavId?: number;
  searchSubnavId?: number;
  limit?: number;
  initialQuery?: string;
  onQueryChange?: (query: string) => void;
}

export function SearchModal({ isOpen, onClose, limit = 20, initialQuery = "", onQueryChange }: SearchModalProps) {
  const t = useTranslations("Search");
  const router = useRouter();
  const { isAppReady } = useBootstrap();
  const { data: navItems } = useAppNavigation(isAppReady);
  const locale = useLocaleStore((s) => s.locale);
  const openAssetDetail = useAssetDetailStore((s) => s.openAssetDetail);
  const setIsAnyCardHovered = usePlayerStore((s) => s.setIsAnyCardHovered);
  const setSearchOpen = usePlayerStore((s) => s.setSearchOpen);

  // Keep a stable searchSubnavId — use name_analytics ("search") for matching
  // since it's always English regardless of the selected language.
  // We persist the last known good value so a locale-switch refetch (during
  // which navItems is briefly undefined) doesn't reset us to the home subnav.
  const stableSearchSubnavIdRef = useRef<number>(0);
  const homeSubnavId = navItems?.find((i) => i.url === "/")?.subnav_id ?? 1;
  const resolvedSearchSubnavId =
    navItems?.find((i) => i.url === ROUTES.SEARCH)?.subnav_id ??
    navItems?.find((i) => i.url?.includes("search"))?.subnav_id;

  if (resolvedSearchSubnavId) {
    stableSearchSubnavIdRef.current = resolvedSearchSubnavId;
  } else if (!stableSearchSubnavIdRef.current && homeSubnavId) {
    stableSearchSubnavIdRef.current = homeSubnavId;
  }
  const searchSubnavId = stableSearchSubnavIdRef.current || homeSubnavId;

  const [inputValue, setInputValue] = useState(initialQuery);
  const debouncedQuery = useDebounce(inputValue.trim(), 500);
  const [currentPage, setCurrentPage] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsTopRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const searchOpenTimeRef = useRef<number>(0);
  const hasTrackedOpenRef = useRef<boolean>(false);
  const hasTrackedCloseRef = useRef<boolean>(false);

  const { recents, addRecent, removeRecent, clearAll } = useRecentSearches();

  // Trap D-pad navigation inside the modal (isFocusBoundary) so Up/Down/Left/Right
  // never leaks through to the home page underneath — same pattern as AssetDetailModal.
  //
  // preferredChildFocusKey points at the close button specifically because it's the
  // only thing in this modal that renders unconditionally and immediately. Recent-search
  // chips (localStorage) and browse rails (network) can take longer than any fixed delay
  // to register on TV hardware — if setFocus("MODAL_SEARCH") is called before either has
  // a single child registered, it has nothing to descend into and settles on the empty
  // boundary node itself. isFocusBoundary only constrains navigation trying to leave a
  // boundary from a child inside it — it does not protect the boundary node itself from
  // being navigated away from by the tree outside it — so a focus emptily parked on
  // MODAL_SEARCH is not actually trapped at all, and D-pad presses can walk straight back
  // onto the home page behind it. Always having a real, immediately-available target to
  // land on removes that gap entirely.
  // focusable: isOpen — SearchModal is mounted for the app's whole lifetime, but
  // modalFocusRef only attaches to a real DOM node while isOpen (AnimatePresence below).
  // Without `focusable: isOpen`, this stays a live, zero-rect candidate in norigin's
  // focus tree at all times, so any arrow press elsewhere that falls through to the
  // default nearest-neighbor search (no explicit onArrowPress override) can land here
  // and lose focus permanently until reload — see the matching fix on MODAL_ASSET_DETAIL.
  const { ref: modalFocusRef, focusKey: modalFocusKey } = useFocusable({
    focusKey: "MODAL_SEARCH",
    isFocusBoundary: true,
    preferredChildFocusKey: "tv-key-0-0",
    focusable: isOpen,
  });

  useEffect(() => {
    if (!isOpen) {
      restorePageFocus();
      return;
    }

    const tryFocusSearchInput = () => {
      if (doesFocusableExist("tv-key-0-0")) {
        setFocus("tv-key-0-0");
        return true;
      }
      if (doesFocusableExist("search-input")) {
        setFocus("search-input");
        return true;
      }
      return false;
    };

    if (tryFocusSearchInput()) return;

    const observer = new MutationObserver(() => {
      if (tryFocusSearchInput()) {
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const timeoutId = setTimeout(() => {
      observer.disconnect();
      tryFocusSearchInput();
    }, 3000);

    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, [isOpen]);

  const {
    data: railsData,
    isLoading: railsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useContentRails(searchSubnavId, isAppReady && isOpen && !!locale, limit);

  useEffect(() => {
    setMounted(true);
  }, []);

  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !hasNextPage || railsLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1, root: scrollContainerRef.current }
    );

    const currentTarget = observerRef.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [isOpen, hasNextPage, isFetchingNextPage, fetchNextPage, railsLoading]);

  useEffect(() => {
    if (isOpen) {
      // Track search opened ONCE per modal open
      if (!hasTrackedOpenRef.current) {
        searchOpenTimeRef.current = Date.now();
        hasTrackedOpenRef.current = true;
        hasTrackedCloseRef.current = false;
        
        try {
          analyticsService.trackSearchOpened({
            source: 'navbar',
          });
        } catch (e) {
          // Silent fail
        }
      }
    } else {
      // Track search closed ONCE per modal close
      if (hasTrackedOpenRef.current && !hasTrackedCloseRef.current) {
        hasTrackedCloseRef.current = true;
        
        try {
          const durationSeconds = searchOpenTimeRef.current 
            ? Math.floor((Date.now() - searchOpenTimeRef.current) / 1000)
            : undefined;
          
          analyticsService.trackSearchClosed({
            duration_seconds: durationSeconds,
          });
        } catch (e) {
          // Silent fail
        }
        
        // Reset for next open
        hasTrackedOpenRef.current = false;
      }
      
      setInputValue("");
      setCurrentPage(1);
    }

    // Cleanup: fire trackSearchClosed on unmount if search was open.
    // This handles the route-based flow where isOpen stays true until
    // the component unmounts (navigating away from /search).
    return () => {
      if (hasTrackedOpenRef.current && !hasTrackedCloseRef.current) {
        hasTrackedCloseRef.current = true;
        try {
          const durationSeconds = searchOpenTimeRef.current
            ? Math.floor((Date.now() - searchOpenTimeRef.current) / 1000)
            : undefined;
          analyticsService.trackSearchClosed({
            duration_seconds: durationSeconds,
          });
        } catch (e) {
          // Silent fail
        }
        hasTrackedOpenRef.current = false;
      }
    };
  }, [isOpen, mounted]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      // e.keyCode 461 is the LG webOS remote's physical Back key.
      if (e.key === "Escape" || e.keyCode === 461) {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab" && scrollContainerRef.current) {
        const modalContainer = scrollContainerRef.current.parentElement || scrollContainerRef.current;
        const focusableElements = modalContainer.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements || focusableElements.length === 0) return;
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Pause hero background video and carousel when search modal is open
  useEffect(() => {
    setIsAnyCardHovered(isOpen);
    setSearchOpen(isOpen);
    return () => {
      setIsAnyCardHovered(false);
      setSearchOpen(false);
    };
  }, [isOpen, setIsAnyCardHovered, setSearchOpen]);

  // Track search clear
  const lastInputVal = useRef("");
  useEffect(() => {
    lastInputVal.current = inputValue;
  }, [inputValue]);

  // Track search query and results after debounce
  const lastTrackedQuery = useRef<string>("");
  const searchStartTime = useRef<number>(0);

  useEffect(() => {
    if (debouncedQuery) {
      searchStartTime.current = Date.now();
    }
  }, [debouncedQuery]);

  // Reset to page 1 on new debounced query & notify parent of query changes
  useEffect(() => {
    setCurrentPage(1);
    onQueryChange?.(debouncedQuery);
  }, [debouncedQuery, onQueryChange]);

  // Fetch search results for the current page
  const {
    data: searchData,
    isLoading: searchLoading,
    isFetching,
    error,
  } = useSearch(debouncedQuery, currentPage, limit);

  const searchResults: any[] = (() => {
    const d = (searchData as any)?.data;
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.records)) return d.records;
    if (Array.isArray(d?.results)) return d.results;
    if (Array.isArray(d?.items)) return d.items;
    if (Array.isArray(d?.data)) return d.data;
    return [];
  })();

  const meta =
    (searchData as any)?.metaData ??
    (searchData as any)?.["meta-data"] ??
    (searchData as any)?.metadata ??
    (searchData as any)?.meta;
  const totalPages: number = Number(meta?.total_pages ?? 1);
  const totalRecords: number = Number(meta?.total_record ?? searchResults.length);

  useEffect(() => {
    if (debouncedQuery && searchResults?.length > 0) addRecent(debouncedQuery);
  }, [debouncedQuery, searchResults?.length]);

  // Fire search_performed after debounce resolves and results are loaded
  useEffect(() => {
    if (!debouncedQuery) return;
    if (searchLoading || isFetching) return;
    if (lastTrackedQuery.current === debouncedQuery) return;

    lastTrackedQuery.current = debouncedQuery;
    
    try {
      analyticsService.trackSearchPerformed({
        search_query: debouncedQuery,
        result_count: totalRecords,
        has_results: totalRecords > 0,
      });
    } catch (e) {
      // Silent fail
    }
  }, [debouncedQuery, searchLoading, isFetching, totalRecords]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    setTimeout(() => {
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }, 50);
  }, []);

  const hasQuery = inputValue?.trim()?.length > 0;
  const showSpinner = searchLoading || isFetching;
  const railsBusy = railsLoading || isFetchingNextPage;

  const rails: any[] = (() => {
    return (railsData?.pages || []).flatMap((page: any) => {
      const d = page?.data;
      return (
        d?.content_rail_items ||
        d?.rails ||
        d?.navigation_list ||
        page?.rails ||
        (Array.isArray(page) ? page : [])
      );
    });
  })();

  // Show all rails from the search subnav — don't filter by cr_name since
  // rail names are translated (e.g. Gujarati) and won't match English keywords.
  // The search subnav only contains relevant rails (recently added, genre, etc.)
  // so showing all of them is correct regardless of language.
  const recentRails = rails.filter((rail: any) => {
    if (!rail) return false;
    // Always exclude hero/main-carousel display types (type 8 or 14)
    const displayType = Number(rail?.cr_display_type ?? rail?.display_type ?? 0);
    if (displayType === 8 || displayType === 14) return false;
    // Must have items
    const items = rail?.cr_items || rail?.content_rail_items || rail?.items;
    return Array.isArray(items) && items.length > 0;
  });

  const handleCardClick = useCallback(
    (item: any, index?: number) => {
      // NOTE: We intentionally do NOT call onClose() here.
      // onClose() triggers router.back() on the /search route, which would
      // race with the subsequent router.push() or openAssetDetail() call,
      // corrupting browser history. Instead:
      // - Genre/redirect navigations naturally unmount the /search page.
      // - Asset detail opens as an overlay (z-99999) on top of search (z-10001).
      //   Closing the asset detail returns the user to search — Netflix-style UX.

      // Check if the item is an asset (movie/show) vs a genre card
      const isAsset =
        !!item?.asset ||
        !!item?.asset_id ||
        !!item?.assetType ||
        !!item?.assetTypeCode ||
        !!item?.asset_type ||
        !!item?.content_type ||
        !!item?.type;

      // Only navigate to genre if the item is explicitly a genre card (not an asset)
      const isGenreItem = !!item?.genre || (!isAsset && !item?.id && !item?.item_id);
      const genreName = isGenreItem
        ? (item?.genre?.name_analytics ||
          item?.genre?.name ||
          item?.name_analytics ||
          item?.title ||
          null)
        : null;

      if (genreName) {
        const slug = slugify(genreName);
        try {
          analyticsService.track(EVENT_NAMES.GENRE_CLICKED, {
            genre_id: slug,
            genre_name: genreName,
            source: 'search_modal',
          });
        } catch (e) { }
        safeNavigate(router, `${ROUTES.GENRE}?genre=${slug}`);
        return;
      }

      // Explicit redirect URL
      const redirectUrl =
        item?.redirectUrl ||
        item?.redirect_url ||
        item?.asset?.redirect_url ||
        item?.asset?.redirectUrl ||
        item?.genre?.redirect_url ||
        item?.genre?.redirectUrl;

      if (redirectUrl) {
        safeNavigate(router, redirectUrl);
        return;
      }

      // Asset — open detail modal
      const id = resolveId(item);
      if (id) {
        const asset = item?.asset || item;
        const contentType =
          item?.assetTypeCode ||
          item?.assetType ||
          asset?.asset_type ||
          asset?.content_type ||
          asset?.type ||
          "movies";
        const title = resolveTitle(item);

        try {
          const isMovie = contentType === 1 || contentType === '1' || contentType === 'MOVIE' || contentType === 'movie' || contentType === 'movies';
          const isShow = contentType === 2 || contentType === '2' || contentType === 'SHOW' || contentType === 'show' || contentType === 'series';

          analyticsService.trackContentClicked({
            asset_id: !isNaN(Number(id)) ? Number(id) : String(id),
            asset_name: title,
            asset_title: title,
            asset_type: isMovie ? 'movie' : (isShow ? 'show' : 'other'),
            asset_category: mapAnalyticsAssetCategory(asset?.asset_category) || 'svod',
            content_rail_name: 'search_results',
            rail_name: 'search_results',
            content_rail_id: 'search',
            rail_id: 'search',
            content_rail_display_type: 'search',
            rail_display_type: 'search',
            in_top_10: Boolean(asset?.isintop10),
            is_top_10: Boolean(asset?.isintop10),
            item_position: index,
          });
        } catch (e) { 
          console.error("[SearchModal] Failed to track content_clicked:", e);
        }

        openAssetDetail(id, contentType, title);
      }
    },
    [openAssetDetail, router]
  );

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            className="fixed inset-0 z-[10000] bg-black/60"
            style={{ WebkitBackdropFilter: "blur(6px)", backdropFilter: "blur(6px)" }}
          />
          <FocusContext.Provider value={modalFocusKey}>
          <motion.div
            key="panel"
            ref={modalFocusRef as any}
            data-focuskey={modalFocusKey}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[10001] p-6 lg:p-8 flex flex-row gap-6 bg-black/92 text-white overflow-hidden"
          >
            {/* Ambient backdrop glow */}
            <div className="absolute top-[10%] left-[5%] z-0 h-[450px] w-[550px] rounded-full bg-[var(--theme_13)] opacity-[0.12] blur-[140px] pointer-events-none" />

            {/* ── LEFT COLUMN: Custom TV Keyboard ────────────────────── */}
            <div className="w-[350px] lg:w-[380px] shrink-0 flex flex-col justify-start gap-4 z-10">
              <TvKeyboard
                onKeyPress={(char) => setInputValue((prev) => prev + char)}
                onBackspace={() => setInputValue((prev) => prev.slice(0, -1))}
                onClear={() => {
                  setInputValue("");
                  setCurrentPage(1);
                }}
                onRightEdge={() => {
                  if (doesFocusableExist("search-input")) {
                    setFocus("search-input");
                  }
                }}
              />
            </div>

            {/* ── RIGHT COLUMN: Search Header & Results ─────────────── */}
            <div className="flex-1 flex flex-col gap-4 min-w-0 h-full overflow-hidden z-10">
              {/* Search Header Bar */}
              <div
                className="flex items-center gap-3 px-5 h-[56px] rounded-2xl shrink-0 bg-white/[0.08] border border-white/15 backdrop-blur-xl"
              >
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.08, duration: 0.2 }}
                  className="shrink-0"
                >
                  <Search className="w-5 h-5 text-white/70" />
                </motion.div>

                <motion.div
                  className="flex-1 overflow-hidden"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "100%", opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  <FocusableSearchInput
                    inputRef={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={t("placeholder")}
                    hasQuery={hasQuery}
                    hasResults={searchResults.length > 0}
                    hasRecents={recents?.length > 0}
                  />
                </motion.div>

                <div className="flex items-center gap-2 shrink-0">
                  {showSpinner && hasQuery && (
                    <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                  )}
                  {hasQuery && (
                    <SearchClearButton
                      onClear={() => {
                        setInputValue("");
                        setCurrentPage(1);
                        setFocus("search-input");
                      }}
                      label={t("clear_all")}
                    />
                  )}
                  <SearchCloseButton onClose={onClose} label={t("close")} hasQuery={hasQuery} />
                </div>
              </div>

              {/* ── Scrollable Content Area ─────────────────────────── */}
              <div
                ref={scrollContainerRef}
                className="flex-1 rounded-2xl overflow-y-auto scrollbar-none bg-white/[0.03] border border-white/10 p-5 backdrop-blur-md"
              >
                {/* ════ IDLE STATE ════ */}
                {!hasQuery && (
                  <div className="py-2 space-y-4">
                    {/* Recent search chips */}
                    {recents?.length > 0 && (
                      <div className="px-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="title-xs-semibold text-white/90">
                            {t("recent_searches")}
                          </h3>
                          <ClearAllButton onClick={clearAll} label={t("clear_all")} recentsCount={recents.length} />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {recents.map((term, idx) => (
                            <RecentChip
                              key={term}
                              term={term}
                              index={idx}
                              totalCount={recents.length}
                              onRemove={() => removeRecent(term)}
                              onSelect={() => {
                                setInputValue(term);
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Skeleton while rails load */}
                    {railsBusy && (
                      <div className="py-2">
                        <RailSkeletonRow />
                        <RailSkeletonRow />
                        <RailSkeletonRow />
                      </div>
                    )}

                    {/* Rails */}
                    {!railsBusy &&
                      recentRails.map((rawRail: any, idx: number) => {
                        const rail = mapApiRail(rawRail, idx);
                        if (!rail?.items || rail?.items?.length === 0) return null;

                        if (/recently added/i.test(rail.title || "")) {
                          return (
                            <RecentlyAddedGrid
                              key={rail.id || idx}
                              title={rail.title}
                              items={rail.items}
                              hasRecents={recents?.length > 0}
                              onCardClick={handleCardClick}
                            />
                          );
                        }

                        return (
                          <ContentRailSection
                            key={rail.id || idx}
                            index={idx}
                            cr_title={rail.title}
                            type={rail.type}
                            items={rail.items}
                            onItemClick={handleCardClick}
                            onArrowUpDown={idx === 0 ? (direction) => {
                              if (direction === "up") {
                                if (recents?.length > 0 && doesFocusableExist("recent-chip-0")) {
                                  setFocus("recent-chip-0");
                                } else {
                                  setFocus("search-input");
                                }
                                return true;
                              }
                            } : undefined}
                            onGenreClick={() => {}}
                            railId={rail.id}
                            totalPages={rail.totalPages}
                            disableHover={true}
                            forceFocusable={true}
                            onViewAllClick={() => {
                               if (rail.id) {
                                 const titleSlug = slugify(rail.title);
                                 useBrowseHiddenStore.getState().setHiddenParams(rail.id, 1);
                                 const targetUrl = titleSlug ? `/browse?slug=${titleSlug}` : "/browse";
                                 safeNavigate(router, targetUrl);
                               }
                             }}
                            button_name={rail?.button_name}
                            more_enabled={rail?.more_enabled}
                          />
                        );
                      })}

                    {hasNextPage && (
                      <div ref={observerRef} className="h-16 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                      </div>
                    )}

                    {/* Empty fallback */}
                    {!railsBusy &&
                      recentRails.length === 0 &&
                      recents.length === 0 && (
                        <div className="flex flex-col items-center py-16 gap-3 text-center">
                          <Search className="w-10 h-10 text-white/40 opacity-40" />
                          <p className="body-sm-regular text-white/60">
                            {t("start_typing")}
                          </p>
                        </div>
                      )}
                  </div>
                )}

                {/* ════ ACTIVE SEARCH STATE ════ */}
                {hasQuery && (
                  <div className="px-3 py-2">
                    <div ref={resultsTopRef} />

                    {/* Skeleton while fetching */}
                    {showSpinner && <PosterGridSkeleton count={10} />}

                    {/* Error */}
                    {!showSpinner && error && (
                      <div className="flex flex-col items-center py-16 gap-3 text-center">
                        <p className="body-sm-regular text-red-400">
                          {t("error")}
                        </p>
                      </div>
                    )}

                    {/* No results */}
                    {!showSpinner && !error && searchResults.length === 0 && (
                      <NoResults query={debouncedQuery} />
                    )}

                    {/* Results grid + pagination */}
                    {!showSpinner && searchResults.length > 0 && (
                      <div>
                        <h3 className="body-sm-semibold text-white/90 mb-4">
                          {t("results_for")} &ldquo;{debouncedQuery}&rdquo;
                        </h3>

                        <div className={POSTER_GRID}>
                          {searchResults.map((item: any, idx: number) => (
                            <PosterCard
                              key={idx}
                              item={item}
                              index={idx}
                              onClick={() => handleCardClick(item, idx)}
                            />
                          ))}
                        </div>

                        <SearchPagination
                          currentPage={currentPage}
                          totalPages={totalPages}
                          totalRecords={totalRecords}
                          onPageChange={handlePageChange}
                          isLoading={showSpinner}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
          </FocusContext.Provider>
        </>
      )}
    </AnimatePresence>
  );
}

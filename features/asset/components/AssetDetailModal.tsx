"use client";

import { useEffect, useRef } from "react";
import { useAssetDetailStore } from "../store/useAssetDetailStore";
import { AssetDetailView } from "../ui/AssetDetailView";
import { AnimatePresence, motion } from "framer-motion";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { usePathname } from "next/navigation";
import { useFocusable, FocusContext, setFocus } from "@noriginmedia/norigin-spatial-navigation";

import { restorePageFocus } from "@/src/navigation/focusUtils";

export function AssetDetailModal() {
  const { activeAssetId, isOpen, closeAssetDetail, resetAssetDetailModal, activePreviewItem } = useAssetDetailStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setFocus('MODAL_ASSET_DETAIL'), 100);
    } else {
      restorePageFocus(useAssetDetailStore.getState().returnFocusKey);
    }
  }, [isOpen]);

  // 0. Automatically reset the modal when navigation to the watch page completes.
  // This prevents the underlying layout from flashing during client-side navigation.
  useEffect(() => {
    if (isOpen && (pathname === "/watch" || pathname.startsWith("/watch/"))) {
      resetAssetDetailModal();
    }
  }, [pathname, isOpen, resetAssetDetailModal]);

  // 1. Lock Body Scroll when modal is open
  useBodyScrollLock(isOpen);

  // 2. Escape / webOS Back Key Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Escape" || e.keyCode === 461) && isOpen) {
        const contentSheet = typeof document !== 'undefined' ? document.getElementById("asset-detail-content-sheet") : null;
        if (contentSheet && contentSheet.getAttribute("data-overlay-open") === "true") {
          // Handled by AssetDetailView's own overlay sheet close logic
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        closeAssetDetail();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeAssetDetail]);

  // 3. Handle Browser Back Button (popstate)
  useEffect(() => {
    if (!isOpen) return;

    const handlePopState = (e: PopStateEvent) => {
      const state = e.state;
      if (state && state.type === "asset-detail" && state.id) {
        const { navigateBackToAsset } = useAssetDetailStore.getState();
        navigateBackToAsset(state.id, state.contentType || "movies", state.title || "");
      } else {
        // Reset historyCount to 0 to prevent closeAssetDetail calling history.back() again in a loop
        useAssetDetailStore.setState({ historyCount: 0 });
        closeAssetDetail();
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isOpen, closeAssetDetail]);

  // Backdrop click handler
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === scrollContainerRef.current) {
      closeAssetDetail();
    }
  };

  // Scroll modal container when activeAssetId changes (e.g. clicking related content or going back)
  useEffect(() => {
    if (scrollContainerRef.current) {
      const state = useAssetDetailStore.getState();
      if (state.shouldScrollToBottom) {
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
              top: scrollContainerRef.current.scrollHeight,
              behavior: "smooth",
            });
          }
        }, 120);
        state.resetScrollFlag();
      } else {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }, [activeAssetId]);

  return (
    <AnimatePresence>
      {isOpen && activeAssetId && (
        <AssetDetailModalBoundary
          activeAssetId={activeAssetId}
          closeAssetDetail={closeAssetDetail}
          scrollContainerRef={scrollContainerRef}
          onBackdropClick={handleBackdropClick}
          initialAsset={activePreviewItem}
        />
      )}
    </AnimatePresence>
  );
}

/**
 * Owns the MODAL_ASSET_DETAIL focus boundary itself, deliberately kept out of the
 * always-mounted parent above — this component (and its useFocusable call) only
 * exists while the modal is actually open, so its norigin registration is created
 * and destroyed together with the real DOM node instead of lingering.
 *
 * The previous approach kept useFocusable's registration alive for the app's whole
 * lifetime with `focusable: isOpen` toggling it on/off, specifically to stop a
 * default nearest-neighbor arrow search from landing on it while empty (see git
 * history). But keeping the registration alive turned out to cause a second,
 * worse bug: norigin's `autoRestoreFocus` (enabled on ROOT_FOCUS_KEY in
 * SpatialNavigationProvider) walks up to the nearest still-registered ancestor
 * once a focused child's node is torn down — and on this TV hardware, that child
 * teardown lags the visual close by 700ms-1.3s, so MODAL_ASSET_DETAIL (still
 * registered, `node=null`) was reliably "restored" to well after
 * restorePageFocus() had already moved focus to the hero/navbar, silently
 * stealing it right back. A boundary that doesn't exist at all while closed can't
 * be an auto-restore target either, which fixes both bugs at once.
 */
function AssetDetailModalBoundary({
  activeAssetId,
  closeAssetDetail,
  scrollContainerRef,
  onBackdropClick,
  initialAsset,
}: {
  activeAssetId: string;
  closeAssetDetail: () => void;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  onBackdropClick: (e: React.MouseEvent) => void;
  initialAsset?: any;
}) {
  const { ref: focusRef, focusKey } = useFocusable({
    focusKey: 'MODAL_ASSET_DETAIL',
    isFocusBoundary: true,
  });

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={focusRef as any} data-focuskey={focusKey} className="fixed inset-0 z-[99999] overflow-hidden bg-[var(--theme_12)]">
        {/* Scrollable Container */}
        <div
          ref={scrollContainerRef}
          onClick={onBackdropClick}
          className="absolute inset-0 overflow-y-auto flex items-start justify-start p-0 overscroll-contain"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative w-full min-h-screen m-0 z-10"
          >
            <AssetDetailView assetId={activeAssetId} onClose={closeAssetDetail} isStandalone={true} initialAsset={initialAsset} />
          </motion.div>
        </div>
      </div>
    </FocusContext.Provider>
  );
}

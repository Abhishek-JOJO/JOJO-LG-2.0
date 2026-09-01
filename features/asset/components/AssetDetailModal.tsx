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
  const { activeAssetId, isOpen, closeAssetDetail, resetAssetDetailModal } = useAssetDetailStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const { ref: focusRef, focusKey } = useFocusable({
    focusKey: 'MODAL_ASSET_DETAIL',
    isFocusBoundary: true,
  });

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setFocus('MODAL_ASSET_DETAIL'), 100);
    } else {
      restorePageFocus();
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
        <FocusContext.Provider value={focusKey}>
          <div ref={focusRef as any} className="fixed inset-0 z-[99999] overflow-hidden bg-[var(--theme_12)]">
            {/* Scrollable Container */}
            <div
              ref={scrollContainerRef}
              onClick={handleBackdropClick}
              className="absolute inset-0 overflow-y-auto flex items-start justify-center p-0 overscroll-contain"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="relative w-full min-h-screen m-0 z-10"
              >
                <AssetDetailView assetId={activeAssetId} onClose={closeAssetDetail} isStandalone={true} />
              </motion.div>
            </div>
          </div>
        </FocusContext.Provider>
      )}
    </AnimatePresence>
  );
}

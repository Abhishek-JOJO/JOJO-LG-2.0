import React from "react";
import { useSearchStore } from "@/store/useSearchStore";
import { motion, AnimatePresence } from "framer-motion";

export function SearchOverlay() {
  const isSearchOpen = useSearchStore((state) => state.isSearchOpen);
  const searchText = useSearchStore((state) => state.searchText);
  const reset = useSearchStore((state) => state.reset);

  // Only show the overlay when search is open but empty
  const showOverlay = isSearchOpen && !searchText.trim();

  return (
    <AnimatePresence>
      {showOverlay && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={reset}
          className="fixed inset-0 z-40 bg-black/50 pointer-events-auto cursor-pointer"
        />
      )}
    </AnimatePresence>
  );
}

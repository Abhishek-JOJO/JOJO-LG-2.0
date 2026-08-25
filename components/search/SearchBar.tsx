import React, { useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { useSearchStore } from "@/store/useSearchStore";
import { SearchInput } from "./SearchInput";
import { motion } from "framer-motion";
import { useDebounce } from "./hooks/useDebounce";
import { usePathname } from "next/navigation";

export function SearchBar() {
  const pathname = usePathname();


  const isSearchOpen = useSearchStore((state) => state.isSearchOpen);
  const setIsSearchOpen = useSearchStore((state) => state.setIsSearchOpen);
  const searchText = useSearchStore((state) => state.searchText);
  const setSearchText = useSearchStore((state) => state.setSearchText);
  const setDebouncedSearch = useSearchStore((state) => state.setDebouncedSearch);
  const reset = useSearchStore((state) => state.reset);

  const debouncedSearchValue = useDebounce(searchText, 500);

  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  // Restore search state from URL ?query= param (if present)
  useEffect(() => {
    const urlQuery = searchParams.get("query");
    if (urlQuery && urlQuery.trim()) {
      setIsSearchOpen(true);
      setSearchText(urlQuery);
      setDebouncedSearch(urlQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Sync debounced value to store AND update URL ?query= param
  useEffect(() => {
    setDebouncedSearch(debouncedSearchValue);
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearchValue.trim()) {
      params.set("query", debouncedSearchValue.trim());
    } else {
      params.delete("query");
    }
    const newUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;
    window.history.replaceState(null, "", newUrl);
  }, [debouncedSearchValue, setDebouncedSearch, pathname]);
  const handleReset = () => {
    reset();
    const params = new URLSearchParams(searchParams.toString());
    params.delete("query");
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    window.history.replaceState(null, "", newUrl);
  };

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        if (isSearchOpen && !searchText) {
          handleReset();
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSearchOpen, searchText]);

  const toggleSearch = () => {
    if (isSearchOpen) {
      if (searchText) setSearchText("");
      else handleReset();
    } else {
      setIsSearchOpen(true);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative flex items-center h-8 sm:h-9 text-theme_1 select-none z-50"
    >
      <motion.div
        initial={false}
        animate={
          isSearchOpen
            ? { width: "240px", borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(0,0,0,0.4)" }
            : { width: "36px", borderColor: "rgba(255,255,255,0)", backgroundColor: "rgba(0,0,0,0)" }
        }
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="flex items-center rounded-full h-full border overflow-hidden pl-2"
      >
        <div
          onClick={toggleSearch}
          className="text-theme_1 hover:text-theme_13_samecolour transition-colors p-1 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
          aria-label="Search"
          aria-expanded={isSearchOpen}
          aria-controls="search-input"
        >
          <Search className="w-[18px] h-[18px]" />
        </div>

        <div className="flex-1 overflow-hidden h-full flex items-center">
          <SearchInput
            ref={inputRef}
            value={searchText}
            onChange={setSearchText}
            onClear={() => setSearchText("")}
            onClose={handleReset}
            isFocused={isSearchOpen}
          />
        </div>
      </motion.div>
    </div>
  );
}

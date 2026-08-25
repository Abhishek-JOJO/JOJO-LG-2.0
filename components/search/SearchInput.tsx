import React, { useEffect } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

interface SearchInputProps {
  value: string;
  onChange: (val: string) => void;
  onClear: () => void;
  onClose: () => void;
  isFocused: boolean;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onChange, onClear, onClose, isFocused }, ref) => {
    const tHome = useTranslations("HomePage");

    useEffect(() => {
      if (isFocused && ref && "current" in ref && ref.current) {
        ref.current.focus();
      }
    }, [isFocused, ref]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        if (value) onClear();
        else onClose();
      }
    };

    return (
      <div className="relative w-full flex items-center">
        <input
          id="search-input"
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tHome("search_placeholder") || "Search movies, shows, genres..."}
          className="w-full bg-transparent text-theme_1 outline-none placeholder-theme_1/40 text-sm py-1.5 pl-2 pr-8 focus:ring-0 focus:border-none border-none leading-none h-full"
          aria-label="Search"
          autoComplete="off"
          tabIndex={isFocused ? 0 : -1}
        />
        {value && (
          <div
            onClick={onClear}
            className="absolute right-2 text-theme_1/60 hover:text-theme_1 transition-colors cursor-pointer"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </div>
        )}
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";

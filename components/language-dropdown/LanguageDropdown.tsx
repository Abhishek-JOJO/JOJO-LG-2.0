"use client";

import { memo } from "react";
import { Locale, LOCALE_LABELS, SUPPORTED_LOCALES } from "@/enums/ui.enum";
import { useLocaleStore } from "@/store/useLocaleStore";
import { useTrackEvent } from "@/shared/analytics";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";

import { cn } from "@/lib/utils";

const LOCALE_ITEMS = SUPPORTED_LOCALES.map((code) => ({
  value: code,
  label: LOCALE_LABELS[code],
}));

const selectLocale = (s: ReturnType<typeof useLocaleStore.getState>) => s.locale;
const selectSetLocale = (s: ReturnType<typeof useLocaleStore.getState>) =>
  s.setLocale;

interface LanguageSwitcherProps {
  className?: string;
  minimal?: boolean;
}

const LanguageSwitcher = memo(function LanguageSwitcher({ className, minimal }: LanguageSwitcherProps) {
  const locale = useLocaleStore(selectLocale);
  const setLocale = useLocaleStore(selectSetLocale);

  const handleLanguageChange = (value: string) => {
    const newLocale = value as Locale;
    setLocale(newLocale);
  };

  return (
    <div className="relative z-1001">
      <Select
        value={locale}
        onValueChange={handleLanguageChange}
      >
        <SelectTrigger
          aria-label="Select language"
          className={cn(
            minimal
              ? "bg-transparent hover:bg-transparent px-0 h-auto gap-1 border-none min-w-0 shadow-none ring-0 select-none cursor-pointer text-theme_13"
              : "h-9 min-w-26 px-4 body-xs-medium text-theme_2_same_colour sm:h-11 sm:px-5 sm:body-sm-medium",
            className
          )}
        >
          <SelectValue placeholder="Language" />
        </SelectTrigger>

        <SelectContent className="z-1002">
          <SelectGroup>
            {LOCALE_ITEMS.map(({ value, label }) => (
              <SelectItem key={value} value={value} >
                {label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
});

export default LanguageSwitcher;
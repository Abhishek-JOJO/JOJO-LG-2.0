import React from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

interface NoResultsProps {
  query: string;
}

export function NoResults({ query }: NoResultsProps) {
  const t = useTranslations("Search");

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center select-none animate-fade-in">
      <div className="relative mb-6 flex items-center justify-center w-24 h-24 rounded-full bg-theme_1/[0.03] border border-theme_1/10 shadow-2xl">
        <div className="absolute inset-0 rounded-full border border-theme_1/5 animate-ping opacity-25" style={{ animationDuration: "3s" }} />
        <Search className="w-10 h-10 text-theme_1/40" />
      </div>
      <h3 className="text-xl sm:text-2xl font-semibold text-theme_1 mb-2">
        {t("no_results_found")} &ldquo;{query}&rdquo;
      </h3>
      <p className="text-sm sm:text-base text-theme_1/50 max-w-md">
        {t("try_searching_different")}
      </p>
    </div>
  );
}

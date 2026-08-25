import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

export interface SearchPaginationProps {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    isLoading?: boolean;
    onPageChange: (page: number) => void;
}

export function SearchPagination({
    currentPage,
    totalPages,
    totalRecords,
    isLoading = false,
    onPageChange,
}: SearchPaginationProps) {
    const t = useTranslations("Search");

    if (totalPages <= 1) return null;

    const pageSet = new Set(
        [1, totalPages, currentPage - 1, currentPage, currentPage + 1].filter(
            (p) => p >= 1 && p <= totalPages
        )
    );
    const sorted = Array.from(pageSet).sort((a, b) => a - b);
    const pages: (number | "…")[] = [];
    sorted.forEach((p, i) => {
        if (i > 0 && p - sorted[i - 1] > 1) pages.push("…");
        pages.push(p);
    });

    const base =
        "min-w-[34px] h-[34px] px-2 rounded-lg flex items-center justify-center transition-all duration-200 caption-xs-medium select-none";

    const activeCls =
        "bg-theme_13_samecolour text-theme_1 font-semibold shadow-md scale-105";

    const idleCls =
        "text-theme_5 hover:text-theme_1 hover:bg-theme_1/10 cursor-pointer active:scale-95";

    const disabledCls =
        "opacity-30 cursor-not-allowed pointer-events-none";

    const iconBtn = (disabled: boolean) =>
        `${base} ${disabled ? disabledCls : idleCls}`;

    return (
        <div className="mt-5 flex justify-end">
            <div className="flex flex-col items-center gap-3">
                <p className="caption-xs-regular text-theme_5">
                    {t("pagination_info", { totalRecords, page: currentPage, totalPages })}
                </p>
                <div className="flex items-center gap-1">
                    <div
                        onClick={() => onPageChange(currentPage - 1)}
                        aria-label={t("previous")}
                        className={iconBtn(currentPage === 1 || isLoading)}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </div>
                    {pages?.map((p, i) =>
                        p === "…" ? (
                            <span
                                key={`ellipsis-${i}`}
                                className={`${base} text-theme_5 cursor-default`}
                            >
                                …
                            </span>
                        ) : (
                            <div
                                key={p}
                                onClick={() => onPageChange(p as number)}
                                aria-label={t("page_info", { page: p, totalPages })}
                                aria-current={p === currentPage ? "page" : undefined}
                                className={`${base} ${p === currentPage ? activeCls : isLoading ? disabledCls : idleCls
                                    }`}
                            >
                                {p}
                            </div>
                        )
                    )}
                    <div
                        onClick={() => onPageChange(currentPage + 1)}
                        aria-label={t("next")}
                        className={iconBtn(currentPage === totalPages || isLoading)}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </div>
                </div>
            </div>
        </div>
    );
}

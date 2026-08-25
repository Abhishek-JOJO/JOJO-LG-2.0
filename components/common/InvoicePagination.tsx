"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { JOJOCustomButton, JOJOButtonMode, JOJOButtonSize, JOJOButtonState } from "@/components/ui/JOJOButton";
import { useTranslations } from "next-intl";

export interface InvoicePaginationProps {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    onPageChange: (page: number) => void;
}

export function InvoicePagination({
    currentPage,
    totalPages,
    totalRecords,
    onPageChange,
}: InvoicePaginationProps) {
    const t = useTranslations("tSettings");

    if (totalRecords === 0) return null;

    const pageSet = new Set(
        [1, totalPages, currentPage - 1, currentPage, currentPage + 1].filter(
            (page) => page >= 1 && page <= totalPages
        )
    );

    const sorted = Array.from(pageSet).sort((a, b) => a - b);
    const pages: (number | "…")[] = [];

    sorted.forEach((page, index) => {
        if (index > 0 && page - sorted[index - 1] > 1) {
            pages.push("…");
        }

        pages.push(page);
    });

    return (
        <div className="mt-4 flex flex-col gap-3 border-t border-theme_1/10 bg-theme_11/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-theme_5">
                {t("showing_records", { count: totalRecords, page: currentPage, pages: totalPages })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <JOJOCustomButton
                    type="button"
                    size={JOJOButtonSize.S}
                    mode={JOJOButtonMode.ICON_TEXT}
                    state={currentPage === 1 ? JOJOButtonState.DISABLED : JOJOButtonState.DEFAULT}
                    onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1}
                    leftIcon={<ChevronLeft className="h-4 w-4" />}
                    bgColor="theme_10"
                    hoverColor="theme_13_samecolour"
                    textColor="theme_1"
                >
                    {t("prev")}
                </JOJOCustomButton>

                {pages.map((page, index) =>
                    page === "…" ? (
                        <span key={`ellipsis-${index}`} className="rounded-full px-3 py-2 text-center text-sm text-theme_5">
                            …
                        </span>
                    ) : (
                        <JOJOCustomButton
                            key={page}
                            type="button"
                            size={JOJOButtonSize.S}
                            state={currentPage === page ? JOJOButtonState.ACTIVE : JOJOButtonState.DEFAULT}
                            onClick={() => onPageChange(page)}
                            bgColor={currentPage === page ? "theme_13_samecolour" : "theme_10"}
                            hoverColor="theme_13_samecolour"
                            textColor={currentPage === page ? "theme_1" : "theme_1"}
                        >
                            {page}
                        </JOJOCustomButton>
                    )
                )}

                <JOJOCustomButton
                    type="button"
                    size={JOJOButtonSize.S}
                    mode={JOJOButtonMode.ICON_TEXT}
                    state={currentPage === totalPages ? JOJOButtonState.DISABLED : JOJOButtonState.DEFAULT}
                    onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    rightIcon={<ChevronRight className="h-4 w-4" />}
                    bgColor="theme_10"
                    hoverColor="theme_13_samecolour"
                    textColor="theme_1"
                >
                    {t("next")}
                </JOJOCustomButton>
            </div>
        </div>
    );
}

import React, { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFocusable } from "@noriginmedia/norigin-spatial-navigation";

export interface SearchPaginationProps {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    isLoading?: boolean;
    onPageChange: (page: number) => void;
}

function PageButton({
    disabled,
    onClick,
    className,
    children,
    ariaLabel,
    ariaCurrent,
}: {
    disabled?: boolean;
    onClick: () => void;
    className: string;
    children: React.ReactNode;
    ariaLabel?: string;
    ariaCurrent?: "page";
}) {
    const { ref, focused, focusKey } = useFocusable({
        onEnterPress: () => {
            if (!disabled) onClick();
        },
    });

    // The search modal scrolls its own internal container, not the window,
    // so pagination controls at the bottom need to scroll themselves into view.
    useEffect(() => {
        if (focused) {
            ref.current?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
        }
    }, [focused, ref]);

    return (
        <div
            ref={ref as any}
            data-focuskey={focusKey}
            onClick={disabled ? undefined : onClick}
            aria-label={ariaLabel}
            aria-current={ariaCurrent}
            className={`${className} ${focused && !disabled ? "!text-black !bg-white scale-105" : ""}`}
        >
            {children}
        </div>
    );
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
                    <PageButton
                        disabled={currentPage === 1 || isLoading}
                        onClick={() => onPageChange(currentPage - 1)}
                        className={iconBtn(currentPage === 1 || isLoading)}
                        ariaLabel={t("previous")}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </PageButton>
                    {pages?.map((p, i) =>
                        p === "…" ? (
                            <span
                                key={`ellipsis-${i}`}
                                className={`${base} text-theme_5 cursor-default`}
                            >
                                …
                            </span>
                        ) : (
                            <PageButton
                                key={p}
                                disabled={isLoading}
                                onClick={() => onPageChange(p as number)}
                                className={`${base} ${p === currentPage ? activeCls : isLoading ? disabledCls : idleCls
                                    }`}
                                ariaLabel={t("page_info", { page: p, totalPages })}
                                ariaCurrent={p === currentPage ? "page" : undefined}
                            >
                                {p}
                            </PageButton>
                        )
                    )}
                    <PageButton
                        disabled={currentPage === totalPages || isLoading}
                        onClick={() => onPageChange(currentPage + 1)}
                        className={iconBtn(currentPage === totalPages || isLoading)}
                        ariaLabel={t("next")}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </PageButton>
                </div>
            </div>
        </div>
    );
}

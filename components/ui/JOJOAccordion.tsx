"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

export type JOJOAccordionValue = string | string[];

export enum JOJOAccordionVariant {
    DEFAULT = "default",
    GLASS = "glass",
    FLAT = "flat",
    BORDERED = "bordered",
}

export enum JOJOAccordionSize {
    SM = "sm",
    MD = "md",
    LG = "lg",
}

export interface JOJOAccordionItem {
    id: string;

    /**
     * Current FAQ structure support
     */
    question?: React.ReactNode;
    answer?: React.ReactNode;

    /**
     * Future generic structure support
     */
    title?: React.ReactNode;
    content?: React.ReactNode;

    disabled?: boolean;
    icon?: React.ReactNode;
    trailing?: React.ReactNode;

    className?: string;
    triggerClassName?: string;
    contentClassName?: string;
}

export interface JOJOAccordionProps {
    items: JOJOAccordionItem[];

    /**
     * Allow multiple items open at once.
     * Default: false
     */
    multiple?: boolean;

    /**
     * Controlled open value.
     * For single: string
     * For multiple: string[]
     */
    value?: JOJOAccordionValue;

    /**
     * Default open value.
     * For single: string
     * For multiple: string[]
     */
    defaultValue?: JOJOAccordionValue;

    /**
     * Called when open item changes.
     */
    onValueChange?: (value: JOJOAccordionValue) => void;

    /**
     * Called when any item is clicked.
     */
    onItemClick?: (item: JOJOAccordionItem) => void;

    variant?: JOJOAccordionVariant;
    size?: JOJOAccordionSize;

    showChevron?: boolean;
    maxContentHeight?: number;

    className?: string;
    itemClassName?: string;
    triggerClassName?: string;
    contentClassName?: string;
}

// ── JOJOAccordion ──────────────────────────────────────────────────────────

export function JOJOAccordion({
    items,
    multiple = false,
    value,
    defaultValue,
    onValueChange,
    onItemClick,
    variant = JOJOAccordionVariant.GLASS,
    size = JOJOAccordionSize.MD,
    showChevron = true,
    maxContentHeight = 500,
    className,
    itemClassName,
    triggerClassName,
    contentClassName,
}: JOJOAccordionProps) {
    const isControlled = value !== undefined;

    const [internalOpenIds, setInternalOpenIds] = React.useState<Set<string>>(() =>
        getInitialOpenIds(defaultValue, multiple)
    );

    const openIds = React.useMemo(() => {
        if (!isControlled) return internalOpenIds;

        if (multiple) {
            return new Set(Array.isArray(value) ? value : value ? [value] : []);
        }

        return new Set(typeof value === "string" && value ? [value] : []);
    }, [isControlled, internalOpenIds, multiple, value]);

    const emitValueChange = React.useCallback(
        (nextOpenIds: Set<string>) => {
            const nextValue: JOJOAccordionValue = multiple
                ? Array.from(nextOpenIds)
                : Array.from(nextOpenIds)[0] || "";

            onValueChange?.(nextValue);
        },
        [multiple, onValueChange]
    );

    const toggle = React.useCallback(
        (item: JOJOAccordionItem) => {
            if (item.disabled) return;

            const next = new Set(openIds);

            if (next.has(item.id)) {
                next.delete(item.id);
            } else {
                if (!multiple) next.clear();
                next.add(item.id);
            }

            if (!isControlled) {
                setInternalOpenIds(next);
            }

            emitValueChange(next);
            onItemClick?.(item);
        },
        [emitValueChange, isControlled, multiple, onItemClick, openIds]
    );

    return (
        <div className={cn("flex w-full flex-col gap-3", className)}>
            {items.map((item) => (
                <JOJOAccordionItemRow
                    key={item.id}
                    item={item}
                    isOpen={openIds.has(item.id)}
                    onToggle={() => toggle(item)}
                    variant={variant}
                    size={size}
                    showChevron={showChevron}
                    maxContentHeight={maxContentHeight}
                    itemClassName={itemClassName}
                    triggerClassName={triggerClassName}
                    contentClassName={contentClassName}
                />
            ))}
        </div>
    );
}

// ── JOJOAccordionItemRow ───────────────────────────────────────────────────

interface JOJOAccordionItemRowProps {
    item: JOJOAccordionItem;
    isOpen: boolean;
    onToggle: () => void;
    variant: JOJOAccordionVariant;
    size: JOJOAccordionSize;
    showChevron: boolean;
    maxContentHeight: number;
    itemClassName?: string;
    triggerClassName?: string;
    contentClassName?: string;
}

function JOJOAccordionItemRow({
    item,
    isOpen,
    onToggle,
    variant,
    size,
    showChevron,
    maxContentHeight,
    itemClassName,
    triggerClassName,
    contentClassName,
}: JOJOAccordionItemRowProps) {
    const title = item.title ?? item.question;
    const content = item.content ?? item.answer;

    const triggerId = `jojo-accordion-trigger-${item.id}`;
    const bodyId = `jojo-accordion-body-${item.id}`;

    return (
        <div
            className={cn(
                "flex w-full flex-col items-start overflow-hidden transition-all duration-300 backdrop-blur-12",
                getJOJOAccordionVariantClass(variant),
                getJOJOAccordionSizeClass(size),
                item.disabled && "pointer-events-none opacity-50",
                itemClassName,
                item.className
            )}
        >
            <div
                role="button"
                onClick={onToggle}
                className={cn(
                    "flex w-full items-center justify-between gap-3 bg-transparent p-0 text-left transition-colors cursor-pointer",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme_1/30",
                    triggerClassName,
                    item.triggerClassName
                )}
                style={{
                    color: "var(--theme_3)",
                }}
                aria-expanded={isOpen}
                aria-controls={bodyId}
                id={triggerId}
            >
                <div className="flex min-w-0 flex-1 items-center gap-3 text-theme_3">
                    {item.icon ? (
                        <span className="flex shrink-0 items-center justify-center">
                            {item.icon}
                        </span>
                    ) : null}

                    <span
                        className={cn(
                            "min-w-0 flex-1 text-theme_3",
                            getJOJOAccordionTitleClass(size),
                            triggerClassName,
                            item.triggerClassName
                        )}
                    >
                        {title}
                    </span>

                    {item.trailing ? (
                        <span className="shrink-0">{item.trailing}</span>
                    ) : null}
                </div>

                {showChevron ? <JOJOAccordionChevron isOpen={isOpen} /> : null}
            </div>

            <div
                id={bodyId}
                role="region"
                aria-labelledby={triggerId}
                className={cn(
                    // Smooth animation using CSS grid trick
                    "grid transition-all duration-500 ease-in-out",
                    isOpen
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0",
                    contentClassName,
                    item.contentClassName
                )}
            >
                <div className="overflow-hidden">
                    <div
                        className={cn(
                            getJOJOAccordionContentSpacingClass(size)
                        )}
                        style={{
                            maxHeight: `${maxContentHeight}px`,
                        }}
                    >
                        {typeof content === "string" ? (
                            <p
                                className={cn(
                                    "m-0 leading-relaxed",
                                    getJOJOAccordionBodyClass(size),
                                    contentClassName,
                                    item.contentClassName
                                )}
                                style={{
                                    color: "var(--theme_5)",
                                }}
                            >
                                {content}
                            </p>
                        ) : (
                            content
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── JOJOAccordionChevron ───────────────────────────────────────────────────

function JOJOAccordionChevron({ isOpen }: { isOpen: boolean }) {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 transition-transform duration-300"
            style={{
                transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                color: "var(--theme_6)",
            }}
            aria-hidden="true"
        >
            <polyline points="6 9 12 15 18 9" />
        </svg>
    );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getInitialOpenIds(
    defaultValue: JOJOAccordionValue | undefined,
    multiple: boolean
) {
    if (!defaultValue) return new Set<string>();

    if (multiple) {
        return new Set(Array.isArray(defaultValue) ? defaultValue : [defaultValue]);
    }

    return new Set(typeof defaultValue === "string" ? [defaultValue] : []);
}

function getJOJOAccordionVariantClass(variant: JOJOAccordionVariant) {
    switch (variant) {
        case JOJOAccordionVariant.GLASS:
            return cn(
                "bg-[var(--theme_12_60)]",
                "backdrop-blur-[12px]"
            );

        case JOJOAccordionVariant.FLAT:
            return "rounded-none border-b border-theme_1/10 bg-transparent";

        case JOJOAccordionVariant.BORDERED:
            return "border border-theme_1/10 bg-transparent";

        case JOJOAccordionVariant.DEFAULT:
        default:
            return cn(
                "bg-[var(--theme_12_60)]",
                "backdrop-blur-[12px]"
            );
    }
}

function getJOJOAccordionSizeClass(size: JOJOAccordionSize) {
    switch (size) {
        case JOJOAccordionSize.SM:
            return "rounded-[26px] px-5 py-4";

        case JOJOAccordionSize.LG:
            return "rounded-[26px] sm:rounded-[40px] px-5 md:px-8 py-4 md:py-6";

        case JOJOAccordionSize.MD:
        default:
            return "rounded-[26px] px-5 md:px-[30px] py-4 md:py-5";
    }
}

function getJOJOAccordionTitleClass(size: JOJOAccordionSize) {
    switch (size) {
        case JOJOAccordionSize.SM:
            return "text-sm md:text-base font-medium";

        case JOJOAccordionSize.LG:
            return "text-base md:text-lg lg:text-xl font-medium";

        case JOJOAccordionSize.MD:
        default:
            return "text-sm md:text-base lg:text-lg font-medium";
    }
}

function getJOJOAccordionBodyClass(size: JOJOAccordionSize) {
    switch (size) {
        case JOJOAccordionSize.SM:
            return "text-xs md:text-sm";

        case JOJOAccordionSize.LG:
            return "text-sm md:text-base lg:text-lg";

        case JOJOAccordionSize.MD:
        default:
            return "text-xs md:text-sm lg:text-base";
    }
}

function getJOJOAccordionContentSpacingClass(size: JOJOAccordionSize) {
    switch (size) {
        case JOJOAccordionSize.SM:
            return "pt-2";

        case JOJOAccordionSize.LG:
            return "pt-4";

        case JOJOAccordionSize.MD:
        default:
            return "pt-3";
    }
}
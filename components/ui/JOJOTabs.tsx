"use client";

import { cn } from "@/lib/utils";
import { themeColors } from "@/tailwind.config";
import * as React from "react";

export enum JOJOTabsRadius {
  None = "none",
  Sm = "sm",
  Md = "md",
  Lg = "lg",
  Xl = "xl",
  TwoXl = "2xl",
  Full = "full",
  Pill = "pill",
}

export enum JOJOTabsSize {
  Sm = "sm",
  Md = "md",
  Lg = "lg",
}

export enum JOJOTabsVariant {
  Default = "default",
  Glass = "glass",
  Outline = "outline",
  Transparent = "transparent",
}

type JOJOTabsRadiusToken = `${JOJOTabsRadius}`;
type JOJOTabsSizeToken = `${JOJOTabsSize}`;
type JOJOTabsVariantToken = `${JOJOTabsVariant}`;

export interface JOJOTabItem<T extends string = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface JOJOTabsProps<T extends string = string> {
  items: JOJOTabItem<T>[];
  value: T;
  onChange: (value: T) => void;

  /**
   * Layout
   */
  width?: React.CSSProperties["width"];
  height?: React.CSSProperties["height"];
  padding?: React.CSSProperties["padding"];
  gap?: React.CSSProperties["gap"];

  /**
   * Presets
   */
  size?: JOJOTabsSize | JOJOTabsSizeToken;
  variant?: JOJOTabsVariant | JOJOTabsVariantToken;
  radius?: JOJOTabsRadius | JOJOTabsRadiusToken;

  /**
   * Colors
   */
  background?: React.CSSProperties["background"];
  activeBackground?: React.CSSProperties["background"];
  activeTextColor?: React.CSSProperties["color"];
  inactiveTextColor?: React.CSSProperties["color"];
  hoverTextColor?: React.CSSProperties["color"];
  disabledTextColor?: React.CSSProperties["color"];
  borderColor?: React.CSSProperties["borderColor"];

  /**
   * Typography
   */
  fontSize?: React.CSSProperties["fontSize"];
  fontWeight?: React.CSSProperties["fontWeight"];
  lineHeight?: React.CSSProperties["lineHeight"];

  /**
   * Animation
   */
  animationDuration?: number;
  animationEasing?: string;

  /**
   * Classes
   */
  className?: string;
  style?: React.CSSProperties;

  tabClassName?: string;
  tabStyle?: React.CSSProperties;

  activeTabClassName?: string;
  inactiveTabClassName?: string;
  disabledTabClassName?: string;

  pillClassName?: string;
  pillStyle?: React.CSSProperties;
}

const JOJO_TABS_RADIUS_CLASS_MAP: Record<JOJOTabsRadiusToken, string> = {
  [JOJOTabsRadius.None]: "rounded-none",
  [JOJOTabsRadius.Sm]: "rounded-sm",
  [JOJOTabsRadius.Md]: "rounded-md",
  [JOJOTabsRadius.Lg]: "rounded-lg",
  [JOJOTabsRadius.Xl]: "rounded-xl",
  [JOJOTabsRadius.TwoXl]: "rounded-2xl",
  [JOJOTabsRadius.Full]: "rounded-full",
  [JOJOTabsRadius.Pill]: "rounded-pill",
};

const JOJO_TABS_SIZE_MAP: Record<
  JOJOTabsSizeToken,
  {
    width: React.CSSProperties["width"];
    height: React.CSSProperties["height"];
    padding: React.CSSProperties["padding"];
    gap: React.CSSProperties["gap"];
    fontSize: React.CSSProperties["fontSize"];
    fontWeight: React.CSSProperties["fontWeight"];
    lineHeight: React.CSSProperties["lineHeight"];
  }
> = {
  [JOJOTabsSize.Sm]: {
    width: "240px",
    height: "38px",
    padding: "4px",
    gap: "2px",
    fontSize: "12px",
    fontWeight: 600,
    lineHeight: "16px",
  },
  [JOJOTabsSize.Md]: {
    width: "280px",
    height: "44px",
    padding: "6px",
    gap: "2px",
    fontSize: "13px",
    fontWeight: 600,
    lineHeight: "18px",
  },
  [JOJOTabsSize.Lg]: {
    width: "320px",
    height: "52px",
    padding: "6px",
    gap: "4px",
    fontSize: "14px",
    fontWeight: 600,
    lineHeight: "20px",
  },
};

const JOJO_TABS_DEFAULTS = {
  size: JOJOTabsSize.Md,
  variant: JOJOTabsVariant.Default,
  radius: JOJOTabsRadius.Pill,

  background: themeColors.theme_9,
  activeBackground: themeColors.theme_13_samecolour,
  activeTextColor: themeColors.theme_1,
  inactiveTextColor: themeColors.theme_5,
  hoverTextColor: themeColors.theme_1,
  disabledTextColor: themeColors.tabs_disable,

  animationDuration: 250,
  animationEasing: "cubic-bezier(0.4, 0, 0.2, 1)",
} as const;

function getVariantStyle({
  variant,
  background,
  borderColor,
}: {
  variant: JOJOTabsVariant | JOJOTabsVariantToken;
  background?: React.CSSProperties["background"];
  borderColor?: React.CSSProperties["borderColor"];
}): React.CSSProperties {
  if (background) {
    return { background };
  }

  switch (variant) {
    case JOJOTabsVariant.Glass:
      return {
        background:
          "linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      };

    case JOJOTabsVariant.Outline:
      return {
        background: "transparent",
        border: `1px solid ${borderColor ?? "rgba(255,255,255,0.08)"}`,
      };

    case JOJOTabsVariant.Transparent:
      return {
        background: "transparent",
      };

    case JOJOTabsVariant.Default:
    default:
      return {
        background: JOJO_TABS_DEFAULTS.background,
      };
  }
}

export function JOJOTabs<T extends string = string>({
  items,
  value,
  onChange,

  width,
  height,
  padding,
  gap,

  size = JOJO_TABS_DEFAULTS.size,
  variant = JOJO_TABS_DEFAULTS.variant,
  radius = JOJO_TABS_DEFAULTS.radius,

  background,
  activeBackground = JOJO_TABS_DEFAULTS.activeBackground,
  activeTextColor = JOJO_TABS_DEFAULTS.activeTextColor,
  inactiveTextColor = JOJO_TABS_DEFAULTS.inactiveTextColor,
  hoverTextColor = JOJO_TABS_DEFAULTS.hoverTextColor,
  disabledTextColor = JOJO_TABS_DEFAULTS.disabledTextColor,
  borderColor,

  fontSize,
  fontWeight,
  lineHeight,

  animationDuration = JOJO_TABS_DEFAULTS.animationDuration,
  animationEasing = JOJO_TABS_DEFAULTS.animationEasing,

  className,
  style,

  tabClassName,
  tabStyle,

  activeTabClassName,
  inactiveTabClassName,
  disabledTabClassName,

  pillClassName,
  pillStyle,
}: JOJOTabsProps<T>) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const buttonRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());

  const [pillPosition, setPillPosition] = React.useState({
    left: 0,
    width: 0,
  });

  const [ready, setReady] = React.useState(false);

  const sizeToken = size as JOJOTabsSizeToken;
  const radiusToken = radius as JOJOTabsRadiusToken;

  const sizeConfig = JOJO_TABS_SIZE_MAP[sizeToken];
  const radiusClass = JOJO_TABS_RADIUS_CLASS_MAP[radiusToken];

  const resolvedWidth = width ?? sizeConfig.width;
  const resolvedHeight = height ?? sizeConfig.height;
  const resolvedPadding = padding ?? sizeConfig.padding;
  const resolvedGap = gap ?? sizeConfig.gap;

  const resolvedFontSize = fontSize ?? sizeConfig.fontSize;
  const resolvedFontWeight = fontWeight ?? sizeConfig.fontWeight;
  const resolvedLineHeight = lineHeight ?? sizeConfig.lineHeight;

  const updatePillPosition = React.useCallback(() => {
    const activeButton = buttonRefs.current.get(value);
    const container = containerRef.current;

    if (!activeButton || !container) return;

    const containerRect = container.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();

    setPillPosition({
      left: buttonRect.left - containerRect.left,
      width: buttonRect.width,
    });

    setReady(true);
  }, [value]);

  React.useEffect(() => {
    updatePillPosition();
  }, [updatePillPosition, items]);

  React.useEffect(() => {
    window.addEventListener("resize", updatePillPosition);

    return () => {
      window.removeEventListener("resize", updatePillPosition);
    };
  }, [updatePillPosition]);

  return (
    <div
      ref={containerRef}
      role="tablist"
      className={cn("relative flex", radiusClass, className)}
      style={{
        width: resolvedWidth,
        height: resolvedHeight,
        padding: resolvedPadding,
        gap: resolvedGap,
        ...getVariantStyle({
          variant,
          background,
          borderColor,
        }),
        ...style,
      }}
    >
      {ready && (
        <span
          aria-hidden="true"
          className={cn("absolute", radiusClass, pillClassName)}
          style={{
            top:
              typeof resolvedPadding === "number"
                ? resolvedPadding
                : resolvedPadding,
            bottom:
              typeof resolvedPadding === "number"
                ? resolvedPadding
                : resolvedPadding,
            left: pillPosition.left,
            width: pillPosition.width,
            background: activeBackground,
            transition: `left ${animationDuration}ms ${animationEasing}, width ${animationDuration}ms ${animationEasing}`,
            ...pillStyle,
          }}
        />
      )}

      {items.map((item) => {
        const isActive = item.value === value;
        const isDisabled = Boolean(item.disabled);

        return (
          <div
            key={item.value}
            ref={(element) => {
              if (element) {
                buttonRefs.current.set(item.value, element);
              } else {
                buttonRefs.current.delete(item.value);
              }
            }}
            role="tab"
            aria-selected={isActive}
            aria-disabled={isDisabled}
            onClick={() => {
              if (!isDisabled) {
                onChange(item.value);
              }
            }}
            className={cn(
              "relative z-[1] caption-sm-semibold flex h-full flex-1 items-center justify-center border-0 bg-transparent outline-none",
              radiusClass,
              "transition-colors duration-200",
              isDisabled
                ? "cursor-not-allowed"
                : "cursor-pointer",
              isActive && activeTabClassName,
              !isActive && !isDisabled && inactiveTabClassName,
              isDisabled && disabledTabClassName,
              tabClassName
            )}
            style={{
              color: isDisabled
                ? disabledTextColor
                : isActive
                  ? activeTextColor
                  : inactiveTextColor,
              fontSize: resolvedFontSize,
              fontWeight: resolvedFontWeight,
              lineHeight: resolvedLineHeight,
              ...tabStyle,
            }}
            onMouseEnter={(event) => {
              if (!isActive && !isDisabled) {
                event.currentTarget.style.color = String(hoverTextColor);
              }
            }}
            onMouseLeave={(event) => {
              if (!isActive && !isDisabled) {
                event.currentTarget.style.color = String(inactiveTextColor);
              }
            }}
          >
            {item.label}
          </div>
        );
      })}
    </div>
  );
}
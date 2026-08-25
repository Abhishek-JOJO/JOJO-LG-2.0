"use client";

import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

/** Gold CTA — design spec */
export const JOJO_BUTTON_GOLD_GRADIENT =
  "linear-gradient(44.13deg, #FAAF3F 21.63%, #FFD691 49.52%, #FAAF3F 81.68%)";

const jojoButtonVariants = cva(
  [
    "inline-flex items-center justify-center",
    "rounded-[100px]",
    "transition-all duration-200 ease-in-out",
    "select-none",
    "whitespace-nowrap",
    "border-none outline-none",
    "disabled:pointer-events-none",
    "focus-visible:ring-2 focus-visible:ring-theme_13_samecolour",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
  ],
  {
    variants: {
      size: {
        s: "h-9 px-4 gap-2 caption-sm-regular",
        m: "h-11 px-5 gap-2 body-sm-medium",
        l: "h-12 px-6 gap-2 body-sm-medium",
      },
      mode: {
        text: "gap-0",
        iconText: "gap-2",
      },
      state: {
        default: "cursor-pointer text-theme_5 bg-theme_10 hover:bg-theme_8",
        active:
          "cursor-pointer text-theme_1 bg-theme_13_samecolour hover:bg-theme_8",
        hovered: "cursor-pointer text-theme_1 bg-theme_8",
        disabled:
          "cursor-not-allowed text-theme_5 bg-theme_10 opacity-50 hover:bg-theme_10 body-sm-medium",
      },
    },
    defaultVariants: {
      size: "l",
      mode: "text",
      state: "default",
    },
  }
);

export enum JOJOButtonSize {
  S = "s",
  M = "m",
  L = "l",
}

export enum JOJOButtonMode {
  TEXT = "text",
  ICON_TEXT = "iconText",
}

export enum JOJOButtonState {
  DEFAULT = "default",
  ACTIVE = "active",
  HOVERED = "hovered",
  DISABLED = "disabled",
}

export enum JOJOButtonAppearance {
  DEFAULT = "default",
  GOLD = "gold",
  CUSTOM = "custom",
}

export const JOJOButton = {
  Size: JOJOButtonSize,
  Mode: JOJOButtonMode,
  State: JOJOButtonState,
  Appearance: JOJOButtonAppearance,
} as const;

export type JOJOButtonCSSValue = React.CSSProperties[keyof React.CSSProperties];

export interface JOJOCustomButtonStyleConfig {
  /**
   * Normal background.
   * Example: "#7C3AED", "var(--theme_9)", "theme_9"
   */
  background?: string;

  /**
   * Hover background.
   * Example: "#6D28D9", "var(--theme_8)", "theme_8"
   */
  hoverBackground?: string;

  /**
   * Active / pressed background.
   */
  activeBackground?: string;

  /**
   * Text/icon color.
   */
  textColor?: string;

  /**
   * Disabled background.
   */
  disabledBackground?: string;

  /**
   * Disabled text/icon color.
   */
  disabledTextColor?: string;

  /**
   * Custom gradient background.
   */
  gradient?: string;

  /**
   * Border CSS.
   * Example: "1px solid rgba(255,255,255,0.12)"
   */
  border?: string;

  /**
   * Box shadow CSS.
   */
  boxShadow?: string;

  /**
   * Custom radius.
   * Example: 12, "100px", "9999px"
   */
  borderRadius?: React.CSSProperties["borderRadius"];

  /**
   * Custom height.
   * Example: 48, "48px", "3rem"
   */
  height?: React.CSSProperties["height"];

  /**
   * Custom horizontal padding.
   * Example: "0 24px"
   */
  padding?: React.CSSProperties["padding"];

  /**
 * Custom width.
 * Example: 160, "160px", "100%", "fit-content"
 */
  width?: React.CSSProperties["width"];

  /**
   * Custom gap.
   */
  gap?: React.CSSProperties["gap"];

  /**
   * Font size override.
   */
  fontSize?: React.CSSProperties["fontSize"];

  /**
   * Font weight override.
   */
  fontWeight?: React.CSSProperties["fontWeight"];

  /**
   * Hover text/icon color.
   */
  hoverTextColor?: string;

  /**
   * Active / pressed text/icon color.
   */
  activeTextColor?: string;
}

export interface JOJOCustomButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "size">,
  Omit<VariantProps<typeof jojoButtonVariants>, "size" | "state" | "mode"> {
  /**
   * Default: L
   */
  size?: JOJOButtonSize | "s" | "m" | "l";

  /**
   * Default: auto.
   * If icon exists, it becomes iconText.
   * Otherwise text.
   */
  mode?: JOJOButtonMode | "text" | "iconText";

  /**
   * Default: DEFAULT
   */
  state?: JOJOButtonState | "default" | "active" | "hovered" | "disabled";

  /**
   * Default, Gold, or Custom.
   */
  appearance?: JOJOButtonAppearance;

  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
  hideChildrenWhenLoading?: boolean;

  /**
   * Generic styling overrides.
   * Use this when future button colors need to change from parent side.
   */
  buttonConfig?: JOJOCustomButtonStyleConfig;

  /**
   * Shortcut props, useful for quick one-line overrides.
   */
  bgColor?: string;
  hoverColor?: string;
  activeColor?: string;
  textColor?: string;
  hoverTextColor?: string;
  activeTextColor?: string;
  disabledBgColor?: string;
  disabledTextColor?: string;
}

const getCssColor = (value?: string) => {
  if (!value) return undefined;

  /**
   * Allows both:
   * - "#FFFFFF"
   * - "var(--theme_1)"
   * - "theme_1"
   */
  if (
    value.startsWith("#") ||
    value.startsWith("rgb") ||
    value.startsWith("hsl") ||
    value.startsWith("var(") ||
    value.startsWith("linear-gradient")
  ) {
    return value;
  }

  return `var(--${value})`;
};

const normalizeButtonState = (
  state?: JOJOButtonState | "default" | "active" | "hovered" | "disabled"
): JOJOButtonState => {
  switch (state) {
    case "active":
    case JOJOButtonState.ACTIVE:
      return JOJOButtonState.ACTIVE;

    case "hovered":
    case JOJOButtonState.HOVERED:
      return JOJOButtonState.HOVERED;

    case "disabled":
    case JOJOButtonState.DISABLED:
      return JOJOButtonState.DISABLED;

    case "default":
    case JOJOButtonState.DEFAULT:
    default:
      return JOJOButtonState.DEFAULT;
  }
};

export const JOJOCustomButton = React.forwardRef<
  HTMLButtonElement,
  JOJOCustomButtonProps
>(function JOJOCustomButton(
  {
    className,

    size = JOJOButtonSize.L,
    mode,
    state = JOJOButtonState.DEFAULT,

    appearance = JOJOButtonAppearance.DEFAULT,

    leftIcon,
    rightIcon,

    disabled,
    isLoading = false,

    children,
    type = "button",
    style,

    buttonConfig,

    bgColor,
    hoverColor,
    activeColor,
    textColor,
    hoverTextColor,
    activeTextColor,
    disabledBgColor,
    disabledTextColor,

    onMouseEnter,
    onMouseLeave,
    onMouseDown,
    onMouseUp,
    hideChildrenWhenLoading = false,

    ...props
  },
  ref
) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isPressed, setIsPressed] = React.useState(false);

  const isButtonDisabled =
    disabled || isLoading || state === JOJOButtonState.DISABLED;

  const resolvedState: JOJOButtonState = isButtonDisabled
    ? JOJOButtonState.DISABLED
    : normalizeButtonState(state);

  const resolvedMode =
    mode ??
    (leftIcon || rightIcon || isLoading
      ? JOJOButtonMode.ICON_TEXT
      : JOJOButtonMode.TEXT);

  const isGold = appearance === JOJOButtonAppearance.GOLD;

  const shouldRenderChildren = !isLoading || !hideChildrenWhenLoading;

  const mergedConfig: JOJOCustomButtonStyleConfig = {
    ...buttonConfig,
    background: bgColor ?? buttonConfig?.background,
    hoverBackground: hoverColor ?? buttonConfig?.hoverBackground,
    activeBackground: activeColor ?? buttonConfig?.activeBackground,
    textColor: textColor ?? buttonConfig?.textColor,
    hoverTextColor: hoverTextColor ?? buttonConfig?.hoverTextColor,
    activeTextColor: activeTextColor ?? buttonConfig?.activeTextColor,
    disabledBackground: disabledBgColor ?? buttonConfig?.disabledBackground,
    disabledTextColor: disabledTextColor ?? buttonConfig?.disabledTextColor,
  };

  const getCustomBackground = () => {
    if (isButtonDisabled) {
      return getCssColor(mergedConfig.disabledBackground);
    }

    // Check for active/pressed state first
    if (isPressed && mergedConfig.activeBackground) {
      return getCssColor(mergedConfig.activeBackground);
    }

    // Check for hover state
    if (isHovered && mergedConfig.hoverBackground) {
      return getCssColor(mergedConfig.hoverBackground);
    }

    // Check for gradient
    if (mergedConfig.gradient) {
      return mergedConfig.gradient;
    }

    // Check for normal background
    if (mergedConfig.background) {
      return getCssColor(mergedConfig.background);
    }

    // Gold appearance
    if (isGold) {
      return JOJO_BUTTON_GOLD_GRADIENT;
    }

    return undefined;
  };

  const getCustomTextColor = () => {
    if (isButtonDisabled && mergedConfig.disabledTextColor) {
      return getCssColor(mergedConfig.disabledTextColor);
    }

    if (isPressed && mergedConfig.activeTextColor) {
      return getCssColor(mergedConfig.activeTextColor);
    }

    if (isHovered && mergedConfig.hoverTextColor) {
      return getCssColor(mergedConfig.hoverTextColor);
    }

    if (mergedConfig.textColor) {
      return getCssColor(mergedConfig.textColor);
    }

    if (isGold) {
      return "var(--theme_12)";
    }

    return undefined;
  };

  const hasCustomSurface =
    isGold ||
    appearance === JOJOButtonAppearance.CUSTOM ||
    Boolean(
      mergedConfig.background ||
      mergedConfig.hoverBackground ||
      mergedConfig.activeBackground ||
      mergedConfig.gradient ||
      mergedConfig.textColor ||
      mergedConfig.disabledBackground ||
      mergedConfig.disabledTextColor
    );

  const customSurfaceClass = hasCustomSurface
    ? cn(
      // Allow custom background/color to take precedence over default variants
      // but avoid using !bg-transparent which removes the background color entirely
      isGold && !isButtonDisabled && "active:brightness-95",
      isGold && isButtonDisabled && "!grayscale-[0.12]"
    )
    : undefined;

  const customSurfaceStyle: React.CSSProperties = {
    background: getCustomBackground(),
    color: getCustomTextColor(),
    border: mergedConfig.border,
    boxShadow:
      mergedConfig.boxShadow ??
      (isGold ? "inset 0 1px 0 rgba(255, 255, 255, 0.28)" : undefined),
    borderRadius: mergedConfig.borderRadius,
    height: mergedConfig.height,
    width: mergedConfig.width,
    padding: mergedConfig.padding,
    gap: mergedConfig.gap,
    fontSize: mergedConfig.fontSize,
    fontWeight: mergedConfig.fontWeight,
    // Ensure transitions work properly
    transition: "all 0.2s ease-in-out",
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={isButtonDisabled}
      aria-disabled={isButtonDisabled}
      style={{
        ...customSurfaceStyle,
        ...style,
      }}
      className={cn(
        jojoButtonVariants({
          size,
          mode: resolvedMode,
          state: resolvedState,
        }),
        customSurfaceClass,
        className
      )}
      onMouseEnter={(event) => {
        setIsHovered(true);
        onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        setIsHovered(false);
        setIsPressed(false);
        onMouseLeave?.(event);
      }}
      onMouseDown={(event) => {
        setIsPressed(true);
        onMouseDown?.(event);
      }}
      onMouseUp={(event) => {
        setIsPressed(false);
        onMouseUp?.(event);
      }}
      {...props}
    >
      {isLoading && (
        <span
          className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent shrink-0"
          aria-hidden="true"
        />
      )}

      {shouldRenderChildren && leftIcon && (
        <span className="inline-flex items-center shrink-0">{leftIcon}</span>
      )}

      {shouldRenderChildren && children && (
        <span className="inline-flex items-center">{children}</span>
      )}

      {shouldRenderChildren && rightIcon && (
        <span className="inline-flex items-center shrink-0">{rightIcon}</span>
      )}
    </button>
  );
});

JOJOCustomButton.displayName = "JOJOCustomButton";

/* -------------------------------------------------------------------------- */
/* Legacy Wrapper                                                              */
/* -------------------------------------------------------------------------- */

type LegacyVariant = "default" | "active" | "disable" | "ghost";
type LegacySize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps
  extends Omit<JOJOCustomButtonProps, "size" | "state" | "mode"> {
  variant?: LegacyVariant;
  size?: LegacySize;
  state?: JOJOButtonState;
}

const mapLegacySize = (size?: LegacySize): JOJOButtonSize => {
  if (size === "sm") return JOJOButtonSize.S;
  if (size === "md") return JOJOButtonSize.M;
  if (size === "lg") return JOJOButtonSize.L;
  if (size === "icon") return JOJOButtonSize.S;

  return JOJOButtonSize.L;
};

const mapLegacyState = (variant?: LegacyVariant): JOJOButtonState => {
  if (variant === "active") return JOJOButtonState.ACTIVE;
  if (variant === "disable") return JOJOButtonState.DISABLED;

  return JOJOButtonState.DEFAULT;
};

export function Button({
  variant,
  size,
  state,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const resolvedState = disabled
    ? JOJOButtonState.DISABLED
    : state ?? mapLegacyState(variant);

  const resolvedSize = mapLegacySize(size);

  return (
    <JOJOCustomButton
      {...props}
      size={resolvedSize}
      state={resolvedState}
      disabled={disabled || resolvedState === JOJOButtonState.DISABLED}
      className={cn(
        variant === "ghost" &&
        "bg-transparent hover:bg-transparent text-theme_5",
        className
      )}
    />
  );
}
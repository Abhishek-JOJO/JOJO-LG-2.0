"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const jojoInputVariants = cva(
  [
    "w-full",
    "rounded-full",
    "body-sm-regular",
    "bg-theme_10",
    "border border-transparent",
    "outline-none",
    "placeholder:text-theme_5_50",
    "transition-all duration-150 ease-in-out",
    "disabled:cursor-not-allowed disabled:opacity-50",
  ],
  {
    variants: {
      size: {
        s: "h-10 px-4",
        m: "h-12 px-4",
        l: "h-13 px-4.5",
      },
      state: {
        default: "text-theme_1",
        filled: "text-theme_1",
        focused: "text-theme_1 border-none",
        error: "text-theme_14_samecolour border-theme_14_samecolour focus:border-theme_14_samecolour",
        disabled: "text-theme_7 bg-theme_10 cursor-not-allowed opacity-50",
      },
    },
    defaultVariants: {
      size: "l",
      state: "default",
    },
  }
);

export enum JOJOInputSize {
  S = "s",
  M = "m",
  L = "l",
}

export enum JOJOInputState {
  DEFAULT = "default",
  FILLED = "filled",
  FOCUSED = "focused",
  ERROR = "error",
  DISABLED = "disabled",
}

export enum JOJOInputAppearance {
  DEFAULT = "default",
  CUSTOM = "custom",
}

export const JOJOInput = {
  Size: JOJOInputSize,
  State: JOJOInputState,
  Appearance: JOJOInputAppearance,
} as const;

export type JOJOInputCSSValue = React.CSSProperties[keyof React.CSSProperties];

export interface JOJOCustomInputStyleConfig {
  /**
   * Normal background.
   * Example: "#111827", "var(--input-bg)", "input-bg"
   */
  background?: string;

  /**
   * Hover background.
   */
  hoverBackground?: string;

  /**
   * Focus background.
   */
  focusBackground?: string;

  /**
   * Error background.
   */
  errorBackground?: string;

  /**
   * Disabled background.
   */
  disabledBackground?: string;

  /**
   * Text color.
   */
  textColor?: string;

  /**
   * Filled text color.
   */
  filledTextColor?: string;

  /**
   * Focus text color.
   */
  focusTextColor?: string;

  /**
   * Error text color.
   */
  errorTextColor?: string;

  /**
   * Disabled text color.
   */
  disabledTextColor?: string;

  /**
   * Placeholder color.
   */
  placeholderColor?: string;

  /**
   * Border CSS.
   * Example: "1px solid rgba(255,255,255,0.12)"
   */
  border?: React.CSSProperties["border"];

  /**
   * Focus border CSS.
   */
  focusBorder?: React.CSSProperties["border"];

  /**
   * Error border CSS.
   */
  errorBorder?: React.CSSProperties["border"];

  /**
   * Disabled border CSS.
   */
  disabledBorder?: React.CSSProperties["border"];

  /**
   * Border color only.
   * Example: "#FFFFFF", "theme_1", "var(--theme_1)"
   */
  borderColor?: string;

  /**
   * Focus border color only.
   */
  focusBorderColor?: string;

  /**
   * Error border color only.
   */
  errorBorderColor?: string;

  /**
   * Disabled border color only.
   */
  disabledBorderColor?: string;

  /**
   * Box shadow CSS.
   */
  boxShadow?: React.CSSProperties["boxShadow"];

  /**
   * Focus box shadow CSS.
   */
  focusBoxShadow?: React.CSSProperties["boxShadow"];

  /**
   * Error box shadow CSS.
   */
  errorBoxShadow?: React.CSSProperties["boxShadow"];

  /**
   * Custom radius.
   * Example: 12, "100px", "9999px"
   */
  borderRadius?: React.CSSProperties["borderRadius"];

  /**
   * Custom height.
   * Example: 52, "52px", "3.25rem"
   */
  height?: React.CSSProperties["height"];

  /**
   * Custom width.
   * Example: 320, "320px", "100%", "fit-content"
   */
  width?: React.CSSProperties["width"];

  /**
   * Custom padding.
   * Example: "0 18px"
   */
  padding?: React.CSSProperties["padding"];

  /**
   * Font size override.
   */
  fontSize?: React.CSSProperties["fontSize"];

  /**
   * Font weight override.
   */
  fontWeight?: React.CSSProperties["fontWeight"];

  /**
   * Caret color.
   */
  caretColor?: React.CSSProperties["caretColor"];
}

export interface JOJOCustomInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
  Omit<VariantProps<typeof jojoInputVariants>, "size" | "state"> {
  /**
   * Default: L
   */
  size?: JOJOInputSize | "s" | "m" | "l";

  /**
   * Default: auto.
   * Auto state detects disabled, error, focused and filled.
   */
  state?:
  | JOJOInputState
  | "default"
  | "filled"
  | "focused"
  | "error"
  | "disabled";

  /**
   * Default or Custom.
   */
  appearance?: JOJOInputAppearance;

  /**
   * Error state.
   */
  error?: boolean;

  /**
   * Generic styling overrides.
   */
  inputConfig?: JOJOCustomInputStyleConfig;

  /**
   * Shortcut props, useful for quick one-line overrides.
   */
  bgColor?: string;
  hoverBgColor?: string;
  focusBgColor?: string;
  errorBgColor?: string;
  disabledBgColor?: string;

  textColor?: string;
  filledTextColor?: string;
  focusTextColor?: string;
  errorTextColor?: string;
  disabledTextColor?: string;
  placeholderColor?: string;

  borderColor?: string;
  focusBorderColor?: string;
  errorBorderColor?: string;
  disabledBorderColor?: string;
}

type JOJOInputInlineStyle = React.CSSProperties & {
  "--jojo-input-placeholder-color"?: string;
};

const getCssColor = (value?: string) => {
  if (!value) return undefined;

  /**
   * Allows:
   * - "#FFFFFF"
   * - "rgb(...)"
   * - "hsl(...)"
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

const normalizeInputState = (
  state?:
    | JOJOInputState
    | "default"
    | "filled"
    | "focused"
    | "error"
    | "disabled"
): JOJOInputState => {
  switch (state) {
    case "filled":
    case JOJOInputState.FILLED:
      return JOJOInputState.FILLED;

    case "focused":
    case JOJOInputState.FOCUSED:
      return JOJOInputState.FOCUSED;

    case "error":
    case JOJOInputState.ERROR:
      return JOJOInputState.ERROR;

    case "disabled":
    case JOJOInputState.DISABLED:
      return JOJOInputState.DISABLED;

    case "default":
    case JOJOInputState.DEFAULT:
    default:
      return JOJOInputState.DEFAULT;
  }
};

export const JOJOCustomInput = React.forwardRef<
  HTMLInputElement,
  JOJOCustomInputProps
>(function JOJOCustomInput(
  {
    className,

    size = JOJOInputSize.L,
    state = JOJOInputState.DEFAULT,
    appearance = JOJOInputAppearance.DEFAULT,

    type = "text",
    value,
    defaultValue,
    disabled,
    error = false,
    style,

    inputConfig,

    bgColor,
    hoverBgColor,
    focusBgColor,
    errorBgColor,
    disabledBgColor,

    textColor,
    filledTextColor,
    focusTextColor,
    errorTextColor,
    disabledTextColor,
    placeholderColor,

    borderColor,
    focusBorderColor,
    errorBorderColor,
    disabledBorderColor,

    onFocus,
    onBlur,
    onMouseEnter,
    onMouseLeave,
    onChange,

    ...props
  },
  ref
) {
  const [isFocused, setIsFocused] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState<
    string | number | readonly string[] | undefined
  >(defaultValue);

  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  const hasValue =
    currentValue !== undefined &&
    currentValue !== null &&
    String(currentValue).length > 0;

  const normalizedState = normalizeInputState(state);

  const isInputDisabled =
    disabled || normalizedState === JOJOInputState.DISABLED;

  const isInputError =
    error || normalizedState === JOJOInputState.ERROR;

  const resolvedState: JOJOInputState = isInputDisabled
    ? JOJOInputState.DISABLED
    : isInputError
      ? JOJOInputState.ERROR
      : isFocused || normalizedState === JOJOInputState.FOCUSED
        ? JOJOInputState.FOCUSED
        : hasValue || normalizedState === JOJOInputState.FILLED
          ? JOJOInputState.FILLED
          : JOJOInputState.DEFAULT;

  const mergedConfig: JOJOCustomInputStyleConfig = {
    ...inputConfig,

    background: bgColor ?? inputConfig?.background,
    hoverBackground: hoverBgColor ?? inputConfig?.hoverBackground,
    focusBackground: focusBgColor ?? inputConfig?.focusBackground,
    errorBackground: errorBgColor ?? inputConfig?.errorBackground,
    disabledBackground: disabledBgColor ?? inputConfig?.disabledBackground,

    textColor: textColor ?? inputConfig?.textColor,
    filledTextColor: filledTextColor ?? inputConfig?.filledTextColor,
    focusTextColor: focusTextColor ?? inputConfig?.focusTextColor,
    errorTextColor: errorTextColor ?? inputConfig?.errorTextColor,
    disabledTextColor: disabledTextColor ?? inputConfig?.disabledTextColor,
    placeholderColor: placeholderColor ?? inputConfig?.placeholderColor,

    borderColor: borderColor ?? inputConfig?.borderColor,
    focusBorderColor: focusBorderColor ?? inputConfig?.focusBorderColor,
    errorBorderColor: errorBorderColor ?? inputConfig?.errorBorderColor,
    disabledBorderColor:
      disabledBorderColor ?? inputConfig?.disabledBorderColor,
  };

  const getCustomBackground = () => {
    if (isInputDisabled && mergedConfig.disabledBackground) {
      return getCssColor(mergedConfig.disabledBackground);
    }

    if (isInputError && mergedConfig.errorBackground) {
      return getCssColor(mergedConfig.errorBackground);
    }

    if (isFocused && mergedConfig.focusBackground) {
      return getCssColor(mergedConfig.focusBackground);
    }

    if (isHovered && mergedConfig.hoverBackground) {
      return getCssColor(mergedConfig.hoverBackground);
    }

    if (mergedConfig.background) {
      return getCssColor(mergedConfig.background);
    }

    return undefined;
  };

  const getCustomTextColor = () => {
    if (isInputDisabled && mergedConfig.disabledTextColor) {
      return getCssColor(mergedConfig.disabledTextColor);
    }

    if (isInputError && mergedConfig.errorTextColor) {
      return getCssColor(mergedConfig.errorTextColor);
    }

    if (isFocused && mergedConfig.focusTextColor) {
      return getCssColor(mergedConfig.focusTextColor);
    }

    if (hasValue && mergedConfig.filledTextColor) {
      return getCssColor(mergedConfig.filledTextColor);
    }

    if (mergedConfig.textColor) {
      return getCssColor(mergedConfig.textColor);
    }

    return undefined;
  };

  const getCustomBorder = () => {
    if (isInputDisabled && mergedConfig.disabledBorder) {
      return mergedConfig.disabledBorder;
    }

    if (isInputError && mergedConfig.errorBorder) {
      return mergedConfig.errorBorder;
    }

    if (isFocused && mergedConfig.focusBorder) {
      return mergedConfig.focusBorder;
    }

    if (mergedConfig.border) {
      return mergedConfig.border;
    }

    return undefined;
  };

  const getCustomBorderColor = () => {
    if (isInputDisabled && mergedConfig.disabledBorderColor) {
      return getCssColor(mergedConfig.disabledBorderColor);
    }

    if (isInputError && mergedConfig.errorBorderColor) {
      return getCssColor(mergedConfig.errorBorderColor);
    }

    if (isFocused && mergedConfig.focusBorderColor) {
      return getCssColor(mergedConfig.focusBorderColor);
    }

    if (mergedConfig.borderColor) {
      return getCssColor(mergedConfig.borderColor);
    }

    return undefined;
  };

  const getCustomBoxShadow = () => {
    if (isInputError && mergedConfig.errorBoxShadow) {
      return mergedConfig.errorBoxShadow;
    }

    if (isFocused && mergedConfig.focusBoxShadow) {
      return mergedConfig.focusBoxShadow;
    }

    if (mergedConfig.boxShadow) {
      return mergedConfig.boxShadow;
    }

    return undefined;
  };

  const customBorderVal = getCustomBorder();
  let borderWidth: string | undefined = undefined;
  let borderStyle: string | undefined = undefined;
  let borderColorFromBorder: string | undefined = undefined;

  if (customBorderVal && customBorderVal !== "none" && customBorderVal !== "0") {
    const parts = String(customBorderVal).trim().split(/\s+/);
    if (parts.length >= 1) {
      borderWidth = parts[0];
    }
    if (parts.length >= 2) {
      borderStyle = parts[1];
    }
    if (parts.length >= 3) {
      borderColorFromBorder = parts.slice(2).join(" ");
    }
  } else if (customBorderVal === "none" || customBorderVal === "0") {
    borderStyle = "none";
  }

  const placeholderCssColor = getCssColor(mergedConfig.placeholderColor);

  const customInputStyle: JOJOInputInlineStyle = {
    background: getCustomBackground(),
    color: getCustomTextColor(),
    borderWidth,
    borderStyle,
    borderColor: getCustomBorderColor() ?? (borderColorFromBorder ? getCssColor(borderColorFromBorder) : undefined),
    boxShadow: getCustomBoxShadow(),
    borderRadius: mergedConfig.borderRadius,
    height: mergedConfig.height,
    width: mergedConfig.width,
    padding: mergedConfig.padding,
    fontSize: mergedConfig.fontSize,
    fontWeight: mergedConfig.fontWeight,
    caretColor: mergedConfig.caretColor
      ? getCssColor(String(mergedConfig.caretColor))
      : undefined,
    "--jojo-input-placeholder-color": placeholderCssColor,
    transition: "all 0.15s ease-in-out",
  };

  const valueProps = isControlled
    ? { value }
    : { defaultValue };

  return (
    <input
      ref={ref}
      type={type}
      disabled={isInputDisabled}
      aria-invalid={isInputError}
      style={{
        ...customInputStyle,
        ...style,
      }}
      className={cn(
        jojoInputVariants({
          size,
          state: resolvedState,
        }),
        mergedConfig.placeholderColor &&
        "placeholder:text-[var(--jojo-input-placeholder-color)]",
        appearance === JOJOInputAppearance.CUSTOM && "appearance-none",
        className
      )}
      onFocus={(event) => {
        setIsFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setIsFocused(false);
        onBlur?.(event);
      }}
      onMouseEnter={(event) => {
        setIsHovered(true);
        onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        setIsHovered(false);
        onMouseLeave?.(event);
      }}
      onChange={(event) => {
        if (!isControlled) {
          setInternalValue(event.target.value);
        }

        onChange?.(event);
      }}
      {...valueProps}
      {...props}
    />
  );
});

JOJOCustomInput.displayName = "JOJOCustomInput";
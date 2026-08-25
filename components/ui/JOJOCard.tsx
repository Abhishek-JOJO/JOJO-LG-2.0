"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Accepts bare token ("theme_1"), CSS var ("var(--theme_1)"), or raw value ("#fff"). */
const toCssValue = (value?: string): string | undefined => {
  if (!value) return undefined;
  if (
    value.startsWith("var(") ||
    value.startsWith("#") ||
    value.startsWith("rgb") ||
    value.startsWith("hsl") ||
    value.startsWith("linear-gradient") ||
    value.startsWith("blur(") ||
    value.startsWith("rgba")
  ) {
    return value;
  }
  return `var(--${value})`;
};

/* -------------------------------------------------------------------------- */
/* Enums                                                                      */
/* -------------------------------------------------------------------------- */

export enum JOJOCardSize {
  SM = "sm",
  MD = "md",
  LG = "lg",
}

export enum JOJOCardRadius {
  SM = "sm",
  MD = "md",
  LG = "lg",
  XL = "xl",
}

/** Namespace object — mirrors JOJOButton pattern */
export const JOJOCard = {
  Size: JOJOCardSize,
  Radius: JOJOCardRadius,
} as const;

/* -------------------------------------------------------------------------- */
/* CVA variants                                                               */
/* -------------------------------------------------------------------------- */

const jojoCardVariants = cva(
  ["relative z-10 overflow-hidden", "flex flex-col items-start"],
  {
    variants: {
      size: {
        sm: "px-3 py-4 sm:px-4 sm:py-5 md:px-5 md:py-6 lg:px-5 lg:pt-7 lg:pb-5",
        md: "px-4 py-5 sm:px-6 sm:py-7 md:px-7 md:py-8 lg:px-7 lg:pt-9 lg:pb-7",
        lg: "px-5 py-6 sm:px-7 sm:py-8 md:px-8 md:py-9 lg:px-8 lg:pt-10 lg:pb-8",
      },
      radius: {
        sm: "rounded-[12px]",
        md: "rounded-[16px]",
        lg: "rounded-[20px]",
        xl: "rounded-[24px]",
      },
    },
    defaultVariants: {
      size: "md",
      radius: "lg",
    },
  }
);

/* -------------------------------------------------------------------------- */
/* Style config interface                                                     */
/* -------------------------------------------------------------------------- */

export interface JOJOCustomCardStyleConfig {
  /** Card background. E.g. "var(--theme_12_60)", "rgba(255,255,255,0.1)", "theme_12_60" */
  background?: string;
  /** Backdrop blur. E.g. "blur(6px)" */
  backdropFilter?: string;
  /** Gradient used for the border overlay. */
  borderGradient?: string;
  /** Border overlay thickness in px. Default: 2 */
  borderWidth?: number;
  /** Overrides the radius class with an exact CSS value. */
  borderRadius?: React.CSSProperties["borderRadius"];
  /** Gap between direct children. E.g. "10px" */
  gap?: React.CSSProperties["gap"];
  /** Overrides the size-preset padding. */
  padding?: React.CSSProperties["padding"];
  boxShadow?: React.CSSProperties["boxShadow"];
  width?: React.CSSProperties["width"];
  maxWidth?: React.CSSProperties["maxWidth"];
  /** Show the gradient border overlay. Default: true */
  showBorder?: boolean;
}

/* -------------------------------------------------------------------------- */
/* JOJOCustomCard                                                             */
/* -------------------------------------------------------------------------- */

export interface JOJOCustomCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "size">,
    Omit<VariantProps<typeof jojoCardVariants>, "size" | "radius"> {
  /** Size preset. Default: MD */
  size?: JOJOCardSize | "sm" | "md" | "lg";
  /** Radius preset. Default: LG */
  radius?: JOJOCardRadius | "sm" | "md" | "lg" | "xl";
  /** Full style config object. */
  cardConfig?: JOJOCustomCardStyleConfig;
  /** Shortcut — card background color/token. */
  bgColor?: string;
  /** Shortcut — border gradient override. */
  borderGradient?: string;
  /** Shortcut — hide the gradient border overlay. Default: true */
  showBorder?: boolean;
}

const RADIUS_MAP: Record<string, string> = {
  sm: "12px",
  md: "16px",
  lg: "20px",
  xl: "24px",
};

export const JOJOCustomCard = React.forwardRef<HTMLDivElement, JOJOCustomCardProps>(
  function JOJOCustomCard(
    {
      className,
      style,
      children,
      size = JOJOCardSize.MD,
      radius = JOJOCardRadius.LG,
      cardConfig,
      bgColor,
      borderGradient,
      showBorder = true,
      ...props
    },
    ref
  ) {
    // Merge shortcut props over cardConfig
    const cfg: JOJOCustomCardStyleConfig = {
      showBorder: true,
      ...cardConfig,
      ...(bgColor !== undefined && { background: bgColor }),
      ...(borderGradient !== undefined && { borderGradient }),
      ...(showBorder !== undefined && { showBorder }),
    };

    const bg = toCssValue(cfg.background) ?? "var(--theme_12_60)";
    const blur = cfg.backdropFilter ?? "blur(20px)";
    const bGradient =
      cfg.borderGradient ??
      "linear-gradient(45deg, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.05) 50%)";
    const bWidth = cfg.borderWidth ?? 2;
    const bRadius = cfg.borderRadius ?? RADIUS_MAP[radius as string] ?? "20px";

    const cardStyle: React.CSSProperties = {
      background: bg,
      backdropFilter: blur,
      WebkitBackdropFilter: blur,
      gap: cfg.gap ?? "10px",
      ...(cfg.borderRadius && { borderRadius: cfg.borderRadius }),
      ...(cfg.padding && { padding: cfg.padding }),
      ...(cfg.boxShadow && { boxShadow: cfg.boxShadow }),
      ...(cfg.width && { width: cfg.width }),
      ...(cfg.maxWidth && { maxWidth: cfg.maxWidth }),
      // caller's style wins last
      ...style,
    };

    return (
      <div
        ref={ref}
        className={cn(jojoCardVariants({ size, radius }), className)}
        style={cardStyle}
        {...props}
      >
        {/* Gradient border overlay */}
        {cfg.showBorder && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              borderRadius: bRadius,
              padding: `${bWidth}px`,
              background: bGradient,
              WebkitMask:
                "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
            }}
          />
        )}

        {children}
      </div>
    );
  }
);

JOJOCustomCard.displayName = "JOJOCustomCard";

/* -------------------------------------------------------------------------- */
/* JOJOCardHeader                                                             */
/* -------------------------------------------------------------------------- */

export interface JOJOCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Text / item alignment. Default: center */
  align?: "left" | "center" | "right";
}

export const JOJOCardHeader = React.forwardRef<HTMLDivElement, JOJOCardHeaderProps>(
  function JOJOCardHeader({ className, align = "center", ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col gap-1",
          align === "left" && "items-start text-left",
          align === "center" && "items-center text-center",
          align === "right" && "items-end text-right",
          className
        )}
        {...props}
      />
    );
  }
);

JOJOCardHeader.displayName = "JOJOCardHeader";

/* -------------------------------------------------------------------------- */
/* JOJOCardTitle                                                              */
/* -------------------------------------------------------------------------- */

export interface JOJOCardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Heading tag. Default: h1 */
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  /** Text color token or CSS value. Default: var(--theme_1) */
  color?: string;
}

export const JOJOCardTitle = React.forwardRef<HTMLHeadingElement, JOJOCardTitleProps>(
  function JOJOCardTitle({ className, style, as: Tag = "h1", color, ...props }, ref) {
    return (
      <Tag
        ref={ref}
        className={cn("w-full text-center m-0 title-xs-semibold", className)}
        style={{
          color: toCssValue(color) ?? "var(--theme_1)",
          lineHeight: "var(--title-xs-semibold-height)",
          alignSelf: "stretch",
          ...style,
        }}
        {...props}
      />
    );
  }
);

JOJOCardTitle.displayName = "JOJOCardTitle";

/* -------------------------------------------------------------------------- */
/* JOJOCardDescription                                                        */
/* -------------------------------------------------------------------------- */

export interface JOJOCardDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {
  /** Text color token or CSS value. Default: var(--theme_5) */
  color?: string;
}

export const JOJOCardDescription = React.forwardRef<
  HTMLParagraphElement,
  JOJOCardDescriptionProps
>(function JOJOCardDescription({ className, style, color, ...props }, ref) {
  return (
    <p
      ref={ref}
      className={cn("m-0", className)}
      style={{
        color: toCssValue(color) ?? "var(--theme_5)",
        fontSize: "var(--body-xs-regular-size)",
        fontWeight: "var(--body-xs-regular-weight)",
        lineHeight: "var(--body-xs-regular-height)",
        ...style,
      }}
      {...props}
    />
  );
});

JOJOCardDescription.displayName = "JOJOCardDescription";

/* -------------------------------------------------------------------------- */
/* JOJOCardContent                                                            */
/* -------------------------------------------------------------------------- */

export interface JOJOCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Gap between children.
   * Pass a Tailwind class via `className` (e.g. "gap-0") to override,
   * or use this prop for arbitrary values (e.g. gap="8px").
   * Default: "20px"
   */
  gap?: React.CSSProperties["gap"];
}

export const JOJOCardContent = React.forwardRef<HTMLDivElement, JOJOCardContentProps>(
  function JOJOCardContent({ className, style, gap, ...props }, ref) {
    // If caller passes a Tailwind gap class (gap-0, gap-5 etc.) via className,
    // it will win over the inline style because Tailwind classes are applied last.
    // We only set the inline gap when the prop is explicitly provided.
    const gapStyle = gap !== undefined ? { gap } : { gap: "20px" };

    return (
      <div
        ref={ref}
        className={cn("flex flex-col", className)}
        style={{ ...gapStyle, ...style }}
        {...props}
      />
    );
  }
);

JOJOCardContent.displayName = "JOJOCardContent";

/* -------------------------------------------------------------------------- */
/* JOJOCardFooter                                                             */
/* -------------------------------------------------------------------------- */

export interface JOJOCardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Justify content. Default: center */
  justify?: "start" | "center" | "end" | "between";
}

export const JOJOCardFooter = React.forwardRef<HTMLDivElement, JOJOCardFooterProps>(
  function JOJOCardFooter({ className, justify = "center", ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center",
          justify === "start" && "justify-start",
          justify === "center" && "justify-center",
          justify === "end" && "justify-end",
          justify === "between" && "justify-between",
          className
        )}
        {...props}
      />
    );
  }
);

JOJOCardFooter.displayName = "JOJOCardFooter";

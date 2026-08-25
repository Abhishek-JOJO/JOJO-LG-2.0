import * as React from "react";
import { cn } from "@/lib/utils";
import { REGEX } from "@/lib/constants/regex";

export type JOJOFlagEmojiShape = "circle" | "rounded" | "square";

export interface JOJOFlagEmojiProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "alt" | "width" | "height"> {
  countryCode?: string | null;
  size?: number;
  label?: string;
  fallback?: React.ReactNode;
  shape?: JOJOFlagEmojiShape;
  showFallbackText?: boolean;
}

const TWEMOJI_CDN_BASE_URL =
  "https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg";

const DEFAULT_FLAG_SIZE = 20;
const DEFAULT_FALLBACK = "🌍";

export function getJOJOFlagCdnUrl(countryCode?: string | null): string | null {
  const normalizedCode = normalizeCountryCode(countryCode);

  if (!normalizedCode) {
    return null;
  }

  const unicodePoints = normalizedCode
    .split("")
    .map((char) => (0x1f1a5 + char.charCodeAt(0)).toString(16));

  return `${TWEMOJI_CDN_BASE_URL}/${unicodePoints.join("-")}.svg`;
}

export function normalizeCountryCode(countryCode?: string | null): string | null {
  if (!countryCode) return null;

  const normalizedCode = countryCode.trim().toUpperCase();

  if (!REGEX.COUNTRY_CODE_REGEX.test(normalizedCode)) {
    return null;
  }

  return normalizedCode;
}

export function JOJOFlagEmoji({
  countryCode,
  size = DEFAULT_FLAG_SIZE,
  label,
  fallback = DEFAULT_FALLBACK,
  shape = "circle",
  showFallbackText = false,
  className,
  style,
  ...props
}: JOJOFlagEmojiProps) {
  const [hasImageError, setHasImageError] = React.useState(false);

  const normalizedCode = normalizeCountryCode(countryCode);
  const flagUrl = getJOJOFlagCdnUrl(normalizedCode);

  const shouldShowFallback = !flagUrl || hasImageError;

  const shapeClass = getFlagShapeClass(shape);

  if (shouldShowFallback) {
    return (
      <span
        role="img"
        aria-label={label || normalizedCode || "flag"}
        className={cn(
          "inline-flex shrink-0 items-center justify-center overflow-hidden align-middle",
          shapeClass,
          className
        )}
        style={{
          width: size,
          height: size,
          fontSize: Math.max(size * 0.75, 12),
          lineHeight: `${size}px`,
          ...style,
        }}
      >
        {fallback}
        {showFallbackText && normalizedCode ? (
          <span className="ml-1 text-xs">{normalizedCode}</span>
        ) : null}
      </span>
    );
  }

  return (
    <img
      src={flagUrl}
      alt={label || `${normalizedCode} flag`}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={cn(
        "inline-block shrink-0 object-cover align-middle",
        shapeClass,
        className
      )}
      style={{
        width: size,
        height: size,
        ...style,
      }}
      onError={() => setHasImageError(true)}
      {...props}
    />
  );
}

function getFlagShapeClass(shape: JOJOFlagEmojiShape) {
  switch (shape) {
    case "circle":
      return "rounded-full";

    case "rounded":
      return "rounded-sm";

    case "square":
    default:
      return "rounded-none";
  }
}
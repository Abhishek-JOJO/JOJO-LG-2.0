"use client";

import { useTranslations } from "next-intl";
import Image, { type ImageProps } from "next/image";
import {
  useEffect,
  useState,
  useRef,
  type CSSProperties,
  type ReactEventHandler,
  type ReactNode,
} from "react";

export enum JOJOImageRadius {
  None = "none",
  Sm = "sm",
  Md = "md",
  Lg = "lg",
  Xl = "xl",
  TwoXl = "2xl",
  Full = "full",
}

export enum JOJOImageAspectRatio {
  Auto = "auto",
  Square = "1/1",
  FourByThree = "4/3",
  ThreeByTwo = "3/2",
  SixteenByNine = "16/9",
}

export enum JOJOImageFallbackType {
  Text = "text",
  None = "none",
}

export enum JOJOImageContentMode {
  Cover = "cover",
  Contain = "contain",
  Fill = "fill",
  None = "none",
  ScaleDown = "scale-down",
}

export enum JOJOImagePosition {
  Center = "center",
  Top = "top",
  Bottom = "bottom",
  Left = "left",
  Right = "right",
  TopLeft = "left top",
  TopRight = "right top",
  BottomLeft = "left bottom",
  BottomRight = "right bottom",
}

export enum JOJOImagePreset {
  Default = "default",
  Avatar = "avatar",
  Product = "product",
  Banner = "banner",
  Logo = "logo",
  Thumbnail = "thumbnail",
}

enum JOJOImageRenderState {
  Primary = "primary",
  FallbackText = "fallbackText",
  Hidden = "hidden",
}

type JOJOImageRadiusToken = `${JOJOImageRadius}`;
type JOJOImageAspectRatioToken = `${JOJOImageAspectRatio}`;
type JOJOImageFallbackTypeToken = `${JOJOImageFallbackType}`;
type JOJOImageContentModeToken = `${JOJOImageContentMode}`;
type JOJOImagePositionToken = `${JOJOImagePosition}`;
type JOJOImagePresetToken = `${JOJOImagePreset}`;

export type JOJOImageRadiusValue =
  | JOJOImageRadius
  | JOJOImageRadiusToken
  | NonNullable<CSSProperties["borderRadius"]>;

export type JOJOImageAspectRatioValue =
  | JOJOImageAspectRatio
  | JOJOImageAspectRatioToken
  | `${number}/${number}`
  | number;

export type JOJOImageFallbackTypeValue =
  | JOJOImageFallbackType
  | JOJOImageFallbackTypeToken;

export type JOJOImageContentModeValue =
  | JOJOImageContentMode
  | JOJOImageContentModeToken
  | NonNullable<CSSProperties["objectFit"]>;

export type JOJOImagePositionValue =
  | JOJOImagePosition
  | JOJOImagePositionToken
  | NonNullable<CSSProperties["objectPosition"]>;

export type JOJOImagePresetValue = JOJOImagePreset | JOJOImagePresetToken;

const JOJO_IMAGE_DEFAULTS = {
  radius: JOJOImageRadius.None,
  aspectRatio: JOJOImageAspectRatio.Auto,
  contentMode: JOJOImageContentMode.Cover,
  position: JOJOImagePosition.Center,
  fallbackType: JOJOImageFallbackType.Text,
  fallbackTitle: "Image unavailable",
  sizes: "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
} as const;

const JOJO_IMAGE_RADIUS_CLASS_MAP: Record<JOJOImageRadiusToken, string> = {
  [JOJOImageRadius.None]: "",
  [JOJOImageRadius.Sm]: "rounded-sm",
  [JOJOImageRadius.Md]: "rounded-md",
  [JOJOImageRadius.Lg]: "rounded-lg",
  [JOJOImageRadius.Xl]: "rounded-xl",
  [JOJOImageRadius.TwoXl]: "rounded-2xl",
  [JOJOImageRadius.Full]: "rounded-full",
};

const JOJO_IMAGE_RADIUS_VALUE_SET = new Set<string>(
  Object.values(JOJOImageRadius)
);

type JOJOImagePresetConfig = {
  radius?: JOJOImageRadiusValue;
  aspectRatio?: JOJOImageAspectRatioValue;
  contentMode?: JOJOImageContentModeValue;
  position?: JOJOImagePositionValue;
};

const JOJO_IMAGE_PRESET_MAP: Record<
  JOJOImagePresetToken,
  JOJOImagePresetConfig
> = {
  [JOJOImagePreset.Default]: {},

  [JOJOImagePreset.Avatar]: {
    radius: JOJOImageRadius.Full,
    aspectRatio: JOJOImageAspectRatio.Square,
    contentMode: JOJOImageContentMode.Cover,
    position: JOJOImagePosition.Center,
  },

  [JOJOImagePreset.Product]: {
    radius: JOJOImageRadius.Lg,
    aspectRatio: JOJOImageAspectRatio.FourByThree,
    contentMode: JOJOImageContentMode.Cover,
    position: JOJOImagePosition.Center,
  },

  [JOJOImagePreset.Banner]: {
    radius: JOJOImageRadius.Xl,
    aspectRatio: JOJOImageAspectRatio.SixteenByNine,
    contentMode: JOJOImageContentMode.Cover,
    position: JOJOImagePosition.Center,
  },

  [JOJOImagePreset.Logo]: {
    radius: JOJOImageRadius.Md,
    contentMode: JOJOImageContentMode.Contain,
    position: JOJOImagePosition.Center,
  },

  [JOJOImagePreset.Thumbnail]: {
    radius: JOJOImageRadius.Md,
    aspectRatio: JOJOImageAspectRatio.Square,
    contentMode: JOJOImageContentMode.Cover,
    position: JOJOImagePosition.Center,
  },
};

export type JOJOImageFallback = {
  type?: JOJOImageFallbackTypeValue;
  title?: string;
  titleKey?: string;
  alt?: string;
  altKey?: string;
  node?: ReactNode;
};

export type JOJOCommonImageProps = Omit<
  ImageProps,
  "src" | "alt" | "fill" | "onError" | "className" | "style"
> & {
  src?: ImageProps["src"] | null;

  alt?: string;
  altKey?: string;

  /**
   * Common presets:
   * avatar, product, banner, logo, thumbnail
   */
  preset?: JOJOImagePresetValue;

  /**
   * Preferred enum usage:
   * radius={JOJOImageRadius.Lg}
   *
   * Also supports existing string/custom usage:
   * radius="lg"
   * radius="24px"
   */
  radius?: JOJOImageRadiusValue;

  /**
   * Backward compatible with your previous prop.
   * Prefer radius={JOJOImageRadius.Full}.
   */
  rounded?: boolean;

  /**
   * Preferred enum usage:
   * aspectRatio={JOJOImageAspectRatio.SixteenByNine}
   *
   * Also supports:
   * aspectRatio="21/9"
   */
  aspectRatio?: JOJOImageAspectRatioValue;

  /**
   * Preferred prop for object-fit.
   */
  contentMode?: JOJOImageContentModeValue;

  /**
   * Backward compatible alias.
   * Existing fit="cover" still works.
   */
  fit?: JOJOImageContentModeValue;

  position?: JOJOImagePositionValue;

  /**
   * If true, image fills parent.
   * Parent/wrapper should have dimensions.
   */
  fill?: boolean;

  fallback?: JOJOImageFallback;

  wrapperClassName?: string;
  fallbackClassName?: string;

  /**
   * Applies to actual Next Image.
   */
  className?: string;

  /**
   * Applies to actual Next Image.
   */
  style?: CSSProperties;

  /**
   * Applies to wrapper.
   */
  wrapperStyle?: CSSProperties;

  onError?: ReactEventHandler<HTMLImageElement>;
  onLoad?: ReactEventHandler<HTMLImageElement>;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isRadiusToken(value: unknown): value is JOJOImageRadiusToken {
  return typeof value === "string" && JOJO_IMAGE_RADIUS_VALUE_SET.has(value);
}

function normalizeAspectRatio(aspectRatio?: JOJOImageAspectRatioValue) {
  if (!aspectRatio || aspectRatio === JOJOImageAspectRatio.Auto) {
    return undefined;
  }

  return aspectRatio;
}

function getInitialState(
  src: JOJOCommonImageProps["src"],
  fallbackType: JOJOImageFallbackTypeValue
): JOJOImageRenderState {
  if (src) return JOJOImageRenderState.Primary;

  if (fallbackType === JOJOImageFallbackType.None) {
    return JOJOImageRenderState.Hidden;
  }

  return JOJOImageRenderState.FallbackText;
}

// Global cache to track successfully loaded image URLs in memory
const loadedImageUrls = new Set<string>();

function markImageAsLoaded(key: string) {
  loadedImageUrls.add(key);
}

function getImageUrlKey(src: unknown): string | null {
  if (!src) return null;
  if (typeof src === "string") return src;
  if (typeof src === "object" && "src" in src && typeof src.src === "string") {
    return src.src;
  }
  return null;
}

export default function JOJOCommonImage({
  src,
  alt,
  altKey,

  preset = JOJOImagePreset.Default,

  radius,
  rounded = false,

  aspectRatio,
  contentMode,
  fit,
  position,

  fill = false,

  fallback,
  wrapperClassName = "",
  fallbackClassName = "",
  className = "",
  style,
  wrapperStyle,

  width,
  height,
  sizes,
  title,
  onError,
  onLoad,

  ...rest
}: JOJOCommonImageProps) {
  const t = useTranslations("image-alt-name");

  const resolvedPreset = String(preset) as JOJOImagePresetToken;

  const presetConfig =
    JOJO_IMAGE_PRESET_MAP[resolvedPreset] ??
    JOJO_IMAGE_PRESET_MAP[JOJOImagePreset.Default];

  const fallbackType = fallback?.type ?? JOJO_IMAGE_DEFAULTS.fallbackType;

  const resolvedAspectRatio =
    aspectRatio ??
    presetConfig.aspectRatio ??
    JOJO_IMAGE_DEFAULTS.aspectRatio;

  const normalizedAspectRatio = normalizeAspectRatio(resolvedAspectRatio);

  const resolvedContentMode =
    contentMode ??
    fit ??
    presetConfig.contentMode ??
    JOJO_IMAGE_DEFAULTS.contentMode;

  const resolvedPosition =
    position ?? presetConfig.position ?? JOJO_IMAGE_DEFAULTS.position;

  const radiusValue =
    rounded
      ? JOJOImageRadius.Full
      : radius ?? presetConfig.radius ?? JOJO_IMAGE_DEFAULTS.radius;

  const [imageState, setImageState] = useState<JOJOImageRenderState>(() =>
    getInitialState(src, fallbackType)
  );

  const imgRef = useRef<HTMLImageElement>(null);

  const [isLoaded, setIsLoaded] = useState(() => {
    const key = getImageUrlKey(src);
    return key ? loadedImageUrls.has(key) : false;
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImageState(getInitialState(src, fallbackType));
    const key = getImageUrlKey(src);
    setIsLoaded(key ? loadedImageUrls.has(key) : false);
  }, [src, fallbackType]);

  // Synchronously catch browser cached image loads where onload doesn't fire
  useEffect(() => {
    if (imgRef.current?.complete) {
      const key = getImageUrlKey(src);
      if (key) {
        markImageAsLoaded(key);
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoaded(true);
    }
  }, [src]);

  const translate = (key?: string, fallbackValue = "") => {
    if (!key) return fallbackValue;

    try {
      return t(key as Parameters<typeof t>[0]);
    } catch {
      return fallbackValue;
    }
  };

  const resolvedAlt = translate(altKey, alt ?? "");

  const fallbackTitle =
    translate(fallback?.titleKey, fallback?.title) ||
    title ||
    resolvedAlt ||
    JOJO_IMAGE_DEFAULTS.fallbackTitle;

  const fallbackAlt =
    translate(fallback?.altKey, fallback?.alt) || resolvedAlt || fallbackTitle;

  const shouldUseFill = fill || Boolean(normalizedAspectRatio);

  const radiusClass = isRadiusToken(radiusValue)
    ? JOJO_IMAGE_RADIUS_CLASS_MAP[radiusValue]
    : "";

  const customBorderRadius =
    !isRadiusToken(radiusValue) &&
      radiusValue !== undefined &&
      radiusValue !== null
      ? radiusValue
      : undefined;

  const imageStyle: CSSProperties = {
    objectFit: resolvedContentMode as CSSProperties["objectFit"],
    objectPosition: resolvedPosition as CSSProperties["objectPosition"],
    borderRadius: customBorderRadius,
    ...(shouldUseFill ? { width: "100%", height: "100%" } : {}),
    ...style,
  };

  const computedWrapperStyle: CSSProperties = {
    aspectRatio: normalizedAspectRatio as CSSProperties["aspectRatio"],
    borderRadius: customBorderRadius,
    width,
    height: normalizedAspectRatio ? undefined : height,
    ...wrapperStyle,
  };

  const wrapperClass = cn(
    "relative overflow-hidden",
    shouldUseFill ? "block" : "inline-block",
    radiusClass,
    wrapperClassName
  );

  const handleError: ReactEventHandler<HTMLImageElement> = (event) => {
    onError?.(event);

    /**
     * If fallback disabled, hide image.
     */
    if (fallbackType === JOJOImageFallbackType.None) {
      setImageState(JOJOImageRenderState.Hidden);
      return;
    }

    /**
     * On any image error, show the title as text fallback.
     */
    setImageState(JOJOImageRenderState.FallbackText);
  };

  if (imageState === JOJOImageRenderState.Hidden) {
    return null;
  }

  if (!src || imageState === JOJOImageRenderState.FallbackText) {
    return (
      <div className={wrapperClass} style={computedWrapperStyle}>
        <div
          role={resolvedAlt ? "img" : undefined}
          aria-label={resolvedAlt || undefined}
          title={fallbackTitle}
          className={cn(
            "flex h-full w-full items-center justify-center bg-neutral-900 px-2 text-center text-sm text-neutral-500",
            fallbackClassName
          )}
        >
          {fallback?.node ?? (
            <div className="flex flex-col items-center justify-center gap-1.5 w-full h-full p-4">
              <div className="relative w-16 h-8 opacity-25">
                <JOJOCommonImage
                  src="/logos/JOJO_LOGO.png"
                  alt="JOJO Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-theme_1/30 truncate max-w-full">
                {fallbackTitle}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperClass} style={computedWrapperStyle}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-theme_1/5 rounded-lg" />
      )}
      <Image
        ref={imgRef}
        {...rest}
        src={src}
        alt={resolvedAlt || fallbackAlt}
        title={title}
        sizes={shouldUseFill ? sizes ?? JOJO_IMAGE_DEFAULTS.sizes : sizes}
        width={shouldUseFill ? undefined : width}
        height={shouldUseFill ? undefined : height}
        fill={shouldUseFill}
        onError={handleError}
        onLoad={(e) => {
          const key = getImageUrlKey(src);
          if (key) {
            markImageAsLoaded(key);
          }
          setIsLoaded(true);
          onLoad?.(e);
        }}
        loading={isLoaded ? "eager" : rest.loading}
        className={cn("block transition-opacity duration-300", isLoaded ? "opacity-100" : "opacity-0", className)}
        style={imageStyle}
      />
    </div>
  );
}

"use client";

import { VIDEO_CONSTANTS, isHlsUrl } from "@/lib/constants/video";
import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactEventHandler,
  type VideoHTMLAttributes,
} from "react";

export enum JOJOVideoRadius {
  None = "none",
  Sm = "sm",
  Md = "md",
  Lg = "lg",
  Xl = "xl",
  TwoXl = "2xl",
  Full = "full",
}

export enum JOJOVideoAspectRatio {
  Auto = "auto",
  Square = "1/1",
  FourByThree = "4/3",
  ThreeByTwo = "3/2",
  SixteenByNine = "16/9",
}

export enum JOJOVideoContentMode {
  Cover = "cover",
  Contain = "contain",
  Fill = "fill",
  None = "none",
  ScaleDown = "scale-down",
}

export enum JOJOVideoPosition {
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

export enum JOJOVideoPreset {
  Default = "default",
  Preview = "preview",
  Background = "background",
}

type JOJOVideoRadiusToken = `${JOJOVideoRadius}`;
type JOJOVideoAspectRatioToken = `${JOJOVideoAspectRatio}`;
type JOJOVideoContentModeToken = `${JOJOVideoContentMode}`;
type JOJOVideoPositionToken = `${JOJOVideoPosition}`;
type JOJOVideoPresetToken = `${JOJOVideoPreset}`;

export type JOJOVideoRadiusValue =
  | JOJOVideoRadius
  | JOJOVideoRadiusToken
  | NonNullable<CSSProperties["borderRadius"]>;

export type JOJOVideoAspectRatioValue =
  | JOJOVideoAspectRatio
  | JOJOVideoAspectRatioToken
  | `${number}/${number}`
  | number;

export type JOJOVideoContentModeValue =
  | JOJOVideoContentMode
  | JOJOVideoContentModeToken
  | NonNullable<CSSProperties["objectFit"]>;

export type JOJOVideoPositionValue =
  | JOJOVideoPosition
  | JOJOVideoPositionToken
  | NonNullable<CSSProperties["objectPosition"]>;

export type JOJOVideoPresetValue = JOJOVideoPreset | JOJOVideoPresetToken;

const JOJO_VIDEO_DEFAULTS = {
  radius: JOJOVideoRadius.None,
  aspectRatio: JOJOVideoAspectRatio.Auto,
  contentMode: JOJOVideoContentMode.Cover,
  position: JOJOVideoPosition.Center,
} as const;

const JOJO_VIDEO_RADIUS_CLASS_MAP: Record<JOJOVideoRadiusToken, string> = {
  [JOJOVideoRadius.None]: "",
  [JOJOVideoRadius.Sm]: "rounded-sm",
  [JOJOVideoRadius.Md]: "rounded-md",
  [JOJOVideoRadius.Lg]: "rounded-lg",
  [JOJOVideoRadius.Xl]: "rounded-xl",
  [JOJOVideoRadius.TwoXl]: "rounded-2xl",
  [JOJOVideoRadius.Full]: "rounded-full",
};

const JOJO_VIDEO_RADIUS_VALUE_SET = new Set<string>(
  Object.values(JOJOVideoRadius)
);

type JOJOVideoPresetConfig = {
  radius?: JOJOVideoRadiusValue;
  aspectRatio?: JOJOVideoAspectRatioValue;
  contentMode?: JOJOVideoContentModeValue;
  position?: JOJOVideoPositionValue;
};

const JOJO_VIDEO_PRESET_MAP: Record<
  JOJOVideoPresetToken,
  JOJOVideoPresetConfig
> = {
  [JOJOVideoPreset.Default]: {},

  [JOJOVideoPreset.Preview]: {
    radius: JOJOVideoRadius.Md,
    aspectRatio: JOJOVideoAspectRatio.SixteenByNine,
    contentMode: JOJOVideoContentMode.Cover,
    position: JOJOVideoPosition.Center,
  },

  [JOJOVideoPreset.Background]: {
    radius: JOJOVideoRadius.None,
    contentMode: JOJOVideoContentMode.Cover,
    position: JOJOVideoPosition.Center,
  },
};

export interface JOJOCommonVideoProps
  extends Omit<
    VideoHTMLAttributes<HTMLVideoElement>,
    "className" | "style" | "onError" | "src"
  > {
  src?: string | null;

  preset?: JOJOVideoPresetValue;
  radius?: JOJOVideoRadiusValue;
  rounded?: boolean;
  aspectRatio?: JOJOVideoAspectRatioValue;
  contentMode?: JOJOVideoContentModeValue;
  fit?: JOJOVideoContentModeValue;
  position?: JOJOVideoPositionValue;

  fill?: boolean;

  wrapperClassName?: string;
  className?: string;
  style?: CSSProperties;
  wrapperStyle?: CSSProperties;

  onError?: ReactEventHandler<HTMLVideoElement>;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isRadiusToken(value: unknown): value is JOJOVideoRadiusToken {
  return typeof value === "string" && JOJO_VIDEO_RADIUS_VALUE_SET.has(value);
}

function normalizeAspectRatio(aspectRatio?: JOJOVideoAspectRatioValue) {
  if (!aspectRatio || aspectRatio === JOJOVideoAspectRatio.Auto) {
    return undefined;
  }
  return aspectRatio;
}

export const JOJOCommonVideo = forwardRef<HTMLVideoElement, JOJOCommonVideoProps>(
  (
    {
      src,
      preset = JOJOVideoPreset.Default,
      radius,
      rounded = false,
      aspectRatio,
      contentMode,
      fit,
      position,
      fill = false,
      wrapperClassName = "",
      className = "",
      style,
      wrapperStyle,
      onError,
      ...rest
    },
    ref
  ) => {
    const resolvedPreset = String(preset) as JOJOVideoPresetToken;
    const presetConfig =
      JOJO_VIDEO_PRESET_MAP[resolvedPreset] ??
      JOJO_VIDEO_PRESET_MAP[JOJOVideoPreset.Default];

    const resolvedAspectRatio =
      aspectRatio ??
      presetConfig.aspectRatio ??
      JOJO_VIDEO_DEFAULTS.aspectRatio;

    const normalizedAspectRatio = normalizeAspectRatio(resolvedAspectRatio);

    const resolvedContentMode =
      contentMode ??
      fit ??
      presetConfig.contentMode ??
      JOJO_VIDEO_DEFAULTS.contentMode;

    const resolvedPosition =
      position ?? presetConfig.position ?? JOJO_VIDEO_DEFAULTS.position;

    const radiusValue =
      rounded
        ? JOJOVideoRadius.Full
        : radius ?? presetConfig.radius ?? JOJO_VIDEO_DEFAULTS.radius;

    const [hasError, setHasError] = useState(false);
    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const [shouldPassSrcNatively, setShouldPassSrcNatively] = useState(() => {
      const isHls = isHlsUrl(src);
      return !isHls;
    });

    const setRef = (node: HTMLVideoElement | null) => {
      localVideoRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    useEffect(() => {
      setHasError(false);
    }, [src]);

    useEffect(() => {
      const video = localVideoRef.current;
      if (!video) return;
      const isHls = isHlsUrl(src);
      const nativeHls = video.canPlayType(VIDEO_CONSTANTS.HLS_MIME_TYPE);
      const supportsMSE = typeof window !== "undefined" && (window.MediaSource || (window as any).WebKitMediaSource);
      setShouldPassSrcNatively(!isHls || (!supportsMSE && !!nativeHls));
    }, [src]);

    useEffect(() => {
      const video = localVideoRef.current;
      if (video && rest.muted !== undefined) {
        video.muted = !!rest.muted;
      }
    }, [rest.muted]);

    const autoPlayRef = useRef(rest.autoPlay);
    useEffect(() => {
      autoPlayRef.current = rest.autoPlay;
    }, [rest.autoPlay]);

    useEffect(() => {
      const video = localVideoRef.current;
      if (!video || !src) return;

      const isHls = isHlsUrl(src);
      const nativeHls = video.canPlayType(VIDEO_CONSTANTS.HLS_MIME_TYPE);
      const supportsMSE = typeof window !== "undefined" && (window.MediaSource || (window as any).WebKitMediaSource);
      let hlsInstance: any = null;

      if (isHls && (supportsMSE || !nativeHls)) {
        import("hls.js").then(({ default: Hls }) => {
          if (!localVideoRef.current) return;
          if (!Hls.isSupported()) {
            setHasError(true);
            return;
          }

          hlsInstance = new Hls({
            maxBufferLength: 5,
            maxMaxBufferLength: 10,
            enableWorker: true,
            capLevelToPlayerSize: false,
            abrEwmaDefaultEstimate: 5000000,
            startLevel: -1,
          });
          hlsInstance.loadSource(src);
          hlsInstance.attachMedia(video);

          hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
            try {
              if (hlsInstance.levels && hlsInstance.levels.length > 0) {
                // Set initial quality directly to highest level for instant HD preview
                hlsInstance.startLevel = hlsInstance.levels.length - 1;
              }
            } catch (err) {
              console.warn("[JOJOCommonVideo] Failed to set startLevel", err);
            }
            if (autoPlayRef.current) {
              video.play().catch(() => { });
            }
          });

          hlsInstance.on(Hls.Events.ERROR, (event: any, data: any) => {
            if (data.fatal) {
              setHasError(true);
              hlsInstance?.destroy();
              hlsInstance = null;
            }
          });
        });
      } else {
        if (isHls && nativeHls) {
          video.src = src;
        }
        if (autoPlayRef.current) {
          video.play().catch(() => { });
        }
      }

      return () => {
        if (hlsInstance) {
          hlsInstance.destroy();
          hlsInstance = null;
        }
      };
    }, [src, rest.autoPlay]);

    const shouldUseFill = fill || Boolean(normalizedAspectRatio);

    const radiusClass = isRadiusToken(radiusValue)
      ? JOJO_VIDEO_RADIUS_CLASS_MAP[radiusValue]
      : "";

    const customBorderRadius =
      !isRadiusToken(radiusValue) &&
        radiusValue !== undefined &&
        radiusValue !== null
        ? radiusValue
        : undefined;

    const videoStyle: CSSProperties = {
      objectFit: resolvedContentMode as CSSProperties["objectFit"],
      objectPosition: resolvedPosition as CSSProperties["objectPosition"],
      borderRadius: customBorderRadius,
      ...(shouldUseFill ? { width: "100%", height: "100%" } : {}),
      ...style,
    };

    const computedWrapperStyle: CSSProperties = {
      aspectRatio: normalizedAspectRatio as CSSProperties["aspectRatio"],
      borderRadius: customBorderRadius,
      ...wrapperStyle,
    };

    const wrapperClass = cn(
      fill ? "absolute inset-0 w-full h-full" : "relative",
      "overflow-hidden",
      shouldUseFill ? "block" : "inline-block",
      radiusClass,
      wrapperClassName
    );

    const handleVideoError: ReactEventHandler<HTMLVideoElement> = (event) => {
      setHasError(true);
      onError?.(event);
    };

    if (!src) {
      return null;
    }

    return (
      <div className={wrapperClass} style={computedWrapperStyle}>
        <video
          ref={setRef}
          src={shouldPassSrcNatively ? (src ?? undefined) : undefined}
          onError={handleVideoError}
          className={cn("block", className)}
          style={videoStyle}
          {...rest}
        />
      </div>
    );
  }
);

JOJOCommonVideo.displayName = "JOJOCommonVideo";

export default JOJOCommonVideo;

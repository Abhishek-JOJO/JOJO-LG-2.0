"use client";

import { IMAGES } from "@/lib/constants/assets";
import dynamic from "next/dynamic";
import { useEffect, useState, useRef } from "react";

// Lazy load Lottie player component to keep initial load lightweight
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

interface PageBackgroundProps {
  staticOnly?: boolean;
  bgImage?: string;
}

export function PageBackground({ staticOnly = false, bgImage }: PageBackgroundProps) {
  const [animationData, setAnimationData] = useState<object | null>(null);
  const [isLottieLoaded, setIsLottieLoaded] = useState(false);
  const [isLottieReady, setIsLottieReady] = useState(false);
  const lottieRef = useRef<any>(null);

  const defaultBg = staticOnly ? IMAGES.WATCHING_BG_IMAGE : IMAGES.NEW_AUTH_BG_IMAGE;
  const currentBg = bgImage || defaultBg;

  useEffect(() => {
    if (staticOnly) return;
    let mounted = true;

    // Fetch the large Lottie JSON file asynchronously after initial page load
    fetch("/lottie/auth_background_data.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch Lottie JSON");
        return res.json();
      })
      .then((data) => {
        if (mounted) {
          setAnimationData(data);
          setIsLottieLoaded(true);
        }
      })
      .catch((err) => {
        logger.warn("[PageBackground] Failed to load Lottie background, falling back to static image", err);
      });

    return () => {
      mounted = false;
    };
  }, [staticOnly]);

  return (
    <>
      {/* Static Background Image (always rendered, transitions opacity to 0 once Lottie is ready) */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 w-full z-0 bg-top bg-cover"
        style={{
          backgroundImage: `url(${currentBg})`,
          height: "100%",
          opacity: (!staticOnly && isLottieReady) ? 0 : 1,
          transition: "opacity 0.5s ease-in-out",
        }}
      />

      {/* Lottie Animation Background (plays directly, fades in when DOM is ready) */}
      {!staticOnly && isLottieLoaded && animationData && (
        <div
          aria-hidden="true"
          className="absolute top-0 left-0 right-0 w-full z-0 overflow-hidden"
          style={{
            height: "100%",
            opacity: isLottieReady ? 1 : 0,
            transition: "opacity 0.5s ease-in-out",
          }}
        >
          <Lottie
            lottieRef={lottieRef}
            animationData={animationData}
            loop={true}
            onDOMLoaded={() => {
              setIsLottieReady(true);
              try {
                lottieRef.current?.setSpeed(0.080); // Slower speed (0.08x)
              } catch (e) {
                console.warn("[PageBackground] Failed to set animation speed", e);
              }
            }}
            rendererSettings={{
              preserveAspectRatio: "xMidYMid slice", // Behaves like object-fit: cover for the SVG
            }}
            style={{
              width: "100%",
              height: "100%",
            }}
          />
        </div>
      )}

      {/* Dark overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-theme_12/75 z-1"
      />

      <div
        aria-hidden="true"
        className="absolute inset-0 page-bg-fade-gradient z-1"
      />
    </>
  );
}

// Simple fallback logger for non-critical logging
const logger = {
  warn: (msg: string, err: any) => {
    console.warn(msg, err);
  }
};

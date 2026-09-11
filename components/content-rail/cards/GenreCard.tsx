"use client";

import React, { useRef } from "react";
import { useRouter } from "next/navigation";
import { useFocusable, setFocus } from "@noriginmedia/norigin-spatial-navigation";
import JOJOCommonImage from "@/components/ui/JOJOCommonImage";
import { ContentRailItem } from "../config/contentRail.types";
import { RailCardDesignConfig } from "../config/contentRail.config";
import { getGenreBackground } from "@/lib/utils";
import { useActiveRailStore } from "@/store/useActiveRailStore";
import { ROUTES } from "@/lib/constants/routes";
import { safeNavigate } from "@/lib/webos/safeNavigate";

interface GenreCardProps {
  item: ContentRailItem;
  config: RailCardDesignConfig;
  onClick?: () => void;
  className?: string;
  fullWidth?: boolean;
  gridHeight?: number;
  focusKey?: string;
  focusable?: boolean;
  index?: number;
}

export function GenreCard({
  item,
  config,
  onClick,
  className = "",
  fullWidth = false,
  gridHeight = 180,
  focusKey,
  focusable = true,
  index = 0,
}: GenreCardProps) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const effectiveFocusKey = focusKey || `genre-${item?.id || (item as any)?.slug || item?.title || index}`;

  const { ref: focusRef, focused } = useFocusable({
    focusKey: effectiveFocusKey,
    focusable,
    onFocus: () => {
      if (cardRef.current) {
        // Cross-rail section jumping/dimming below is a home-page-only concept — skip it
        // entirely when this card is rendered inside a modal (search, asset detail), where
        // there's no such section list and no home-page rail to dim.
        const insideModal = cardRef.current.closest('[data-focuskey="MODAL_SEARCH"], [data-focuskey="MODAL_ASSET_DETAIL"]');
        const currentSection = insideModal ? null : cardRef.current.closest("section");
        if (currentSection) {
          const sIndex = currentSection.getAttribute("data-section-index");
          if (sIndex !== null) {
            useActiveRailStore.getState().setActiveSectionIndex(Number(sIndex));
          }
          const sectionRect = currentSection.getBoundingClientRect();
          if (Math.abs(sectionRect.top - 105) > 35) {
            window.scrollTo({
              top: Math.max(0, (window.scrollY || window.pageYOffset) + sectionRect.top - 105),
              behavior: "auto",
            });
          }
        }
        cardRef.current.scrollIntoView({ behavior: "auto", block: "nearest", inline: "center" });
      }
    },
    onArrowPress: (direction) => {
      // Same home-page-only guard as onFocus above — document.querySelectorAll("section")
      // below would otherwise find (and jump focus onto) sections on the home page behind
      // an open modal, escaping the modal's focus boundary entirely.
      if (cardRef.current?.closest('[data-focuskey="MODAL_SEARCH"], [data-focuskey="MODAL_ASSET_DETAIL"]')) {
        return true;
      }
      if (direction === "up") {
        const currentSection = cardRef.current?.closest("section");
        if (currentSection) {
          const allSections = Array.from(document.querySelectorAll("section"));
          const currentIndex = allSections.indexOf(currentSection);
          if (currentIndex <= 1) {
            window.scrollTo({ top: 0, behavior: "auto" });
            const hero = document.getElementById("hero-carousel-container");
            hero?.focus({ preventScroll: true });
            try { setFocus("hero-carousel"); } catch { }
            useActiveRailStore.getState().setActiveSectionIndex(0);
            return false;
          } else {
            const prevSection = allSections[currentIndex - 1];
            const targetCard = prevSection?.querySelector(
              '[data-focuskey*="spotlight-lead"], [data-focuskey]'
            ) as HTMLElement | null;
            if (targetCard) {
              const targetKey = targetCard.getAttribute("data-focuskey");
              const sIndex = prevSection.getAttribute("data-section-index");
              useActiveRailStore.getState().setActiveSectionIndex(sIndex !== null ? Number(sIndex) : currentIndex - 1);
              const sectionRect = prevSection.getBoundingClientRect();
              window.scrollTo({
                top: Math.max(0, (window.scrollY || window.pageYOffset) + sectionRect.top - 105),
                behavior: "auto",
              });
              targetCard.focus({ preventScroll: true });
              if (targetKey) {
                try { setFocus(targetKey); } catch { }
              }
              return false;
            }
          }
        }
      } else if (direction === "down") {
        const currentSection = cardRef.current?.closest("section");
        if (currentSection) {
          const allSections = Array.from(document.querySelectorAll("section"));
          const currentIndex = allSections.indexOf(currentSection);
          if (currentIndex < allSections.length - 1) {
            const nextSection = allSections[currentIndex + 1];
            const targetCard = nextSection?.querySelector(
              '[data-focuskey*="spotlight-lead"], [data-focuskey]'
            ) as HTMLElement | null;
            if (targetCard) {
              const targetKey = targetCard.getAttribute("data-focuskey");
              const sIndex = nextSection.getAttribute("data-section-index");
              useActiveRailStore.getState().setActiveSectionIndex(sIndex !== null ? Number(sIndex) : currentIndex + 1);
              const sectionRect = nextSection.getBoundingClientRect();
              window.scrollTo({
                top: Math.max(0, (window.scrollY || window.pageYOffset) + sectionRect.top - 105),
                behavior: "auto",
              });
              targetCard.focus({ preventScroll: true });
              if (targetKey) {
                try { setFocus(targetKey); } catch { }
              }
              return false;
            }
          }
        }
      }
      return true;
    },
    onEnterPress: () => {
      if (onClick) {
        onClick();
      } else if ((item as any)?.slug || item?.title) {
        const slug = (item as any)?.slug || item?.title;
        safeNavigate(router, `${ROUTES.GENRE}?genre=${slug.toLowerCase().trim()}`);
      }
    },
  });

  const hasImage = Boolean(item.image);
  const gradient = getGenreBackground(item?.title);

  const cardStyle = {
    "--desktop-width": fullWidth ? "100%" : `${config.width || 220}px`,
    "--desktop-height": fullWidth ? "auto" : `${config.height || 98}px`,
    "--mobile-width": fullWidth ? "100%" : "130px",
    "--mobile-height": fullWidth ? "auto" : "58px",
    aspectRatio: fullWidth ? `${config.width} / ${config.height}` : undefined,
    borderRadius: `${config.borderRadius || 12}px`,
    background: gradient,
  } as React.CSSProperties;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      const slug = (item as any)?.slug || item?.title;
      if (slug) {
        safeNavigate(router, `${ROUTES.GENRE}?genre=${slug.toLowerCase().trim()}`);
      }
    }
  };

  return (
    <div
      ref={(node) => {
        if (focusRef) {
          if (typeof (focusRef as any) === "function") (focusRef as any)(node);
          else (focusRef as any).current = node;
        }
        if (cardRef) {
          (cardRef as any).current = node;
        }
      }}
      tabIndex={focusable ? 0 : -1}
      data-focuskey={effectiveFocusKey}
      onClick={handleClick}
      className={`group relative shrink-0 overflow-hidden text-left transition-all duration-200 cursor-pointer select-none w-[var(--desktop-width)] h-[var(--desktop-height)] max-sm:w-[var(--mobile-width)] max-sm:h-[var(--mobile-height)] ${className} ${focused
        ? "ring-[4px] ring-white scale-105 z-[99] shadow-2xl"
        : "hover:scale-[1.02] opacity-95"
        }`}
      style={cardStyle}
    >
      {hasImage && (
        <JOJOCommonImage
          src={item.image}
          alt={item.title}
          fill
          contentMode="fill"
          className="object-cover opacity-50 transition-transform duration-300 pointer-events-none select-none"
          wrapperClassName="w-full h-full pointer-events-none select-none"
        />
      )}

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{ background: gradient }}
      />

      {/* Subtle dark overlay for contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-10 pointer-events-none" />

      {/* Visible Genre Title */}
      <h3
        className={`absolute bottom-2 left-3 sm:bottom-3 sm:left-4 z-20 font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] line-clamp-1 ${fullWidth ? "text-base sm:text-2xl" : "text-sm sm:text-lg lg:text-xl"
          }`}
      >
        {item.title}
      </h3>
    </div>
  );
}

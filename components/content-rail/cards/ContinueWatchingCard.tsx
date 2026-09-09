"use client";

import React, { useState, useCallback } from "react";
import { Trash2 } from "lucide-react";

import { JOJOButton, JOJOCustomButton } from "@/components/ui/JOJOButton";
import { ContentRailItem, RailCardVariant } from "../config/contentRail.types";
import { RailCardDesignConfig, RailCardAspectRatio } from "../config/contentRail.config";
import { BaseContentCard } from "./BaseContentCard";
import { JOJOModal } from "@/components/ui/JOJOModal";
import { useContinueWatchingStore } from "@/store/useContinueWatchingStore";

interface Props {
  item: ContentRailItem;
  config: RailCardDesignConfig;
  index: number;
  itemsLength?: number;
  onClick?: (item: ContentRailItem) => void;
  onFocusChange?: (index: number) => void;
  className?: string;
  focusKey?: string;
  forceFocusRing?: boolean;
  focusable?: boolean;
  railActive?: boolean;
  onArrowLeftRight?: (direction: "left" | "right") => void;
  onArrowUpDown?: (direction: "up" | "down") => boolean | void;
}

export const ContinueWatchingCard = React.memo(function ContinueWatchingCard({
  item,
  config,
  index,
  itemsLength,
  onClick,
  onFocusChange,
  className,
  focusKey,
  forceFocusRing,
  focusable,
  railActive,
  onArrowLeftRight,
  onArrowUpDown,
}: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleClick = useCallback(() => {
    onClick?.(item);
  }, [onClick, item]);

  // We enforce no hover effects as requested by the user
  const noHoverConfig: RailCardDesignConfig = {
    ...config,
    hover: {
      enabled: false,
      type: "simple",
      showOverlay: false,
      showTitle: false,
      showMeta: false,
    },
  };

  // Adaptive image selection: 16:9 landscape image when expanded/active, 2:3 portrait image when normal
  const isLandscape = config.variant === RailCardVariant.CONTINUE_WATCHING;
  const imageUrl =
    (isLandscape && (item.landscapeImage || item.heroImage)) ||
    item.portraitImage ||
    item.posterImage ||
    item.image ||
    item.landscapeImage ||
    item.heroImage ||
    "";

  return (
    <>
      <BaseContentCard
        item={item}
        config={noHoverConfig}
        imageUrl={imageUrl}
        index={index}
        itemsLength={itemsLength}
        onClick={handleClick}
        onFocusChange={onFocusChange}
        focusKey={focusKey}
        forceFocusRing={forceFocusRing}
        focusable={focusable}
        onArrowLeftRight={onArrowLeftRight}
        onArrowUpDown={onArrowUpDown}
        className={className}
      >
        {/* Continue Watching: Bottom Progress Bar — ALWAYS SHOW AT BOTTOM OF CARD */}
        <div className="absolute bottom-0 left-0 right-0 z-30 h-2 bg-white/20">
          <div
            className="h-full bg-theme_13_samecolour transition-all duration-300"
            style={{ width: `${item.progressPercentage ?? 0}%` }}
          />
        </div>

        {/* Delete Button on top left (visible when active/focused) */}
        {(forceFocusRing || railActive) && (
          <div 
            className="absolute top-3.5 left-3.5 z-30"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <JOJOCustomButton
              state={JOJOButton.State.DEFAULT}
              size={JOJOButton.Size.S}
              leftIcon={<Trash2 size={18} />}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              aria-label="Remove from Continue Watching"
              title="Remove"
              className="!bg-black/70 hover:!bg-red-950/70 hover:!text-red-500 border border-white/10 hover:border-red-500/30"
              buttonConfig={{ width: "36px", height: "36px", padding: "0", gap: "0", borderRadius: "9999px" }}
            />
          </div>
        )}
      </BaseContentCard>

      {/* Delete confirmation modal */}
      <JOJOModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
      >
        <div className="space-y-3">
          <h3 className="text-[22px] sm:text-2xl font-bold text-theme_1 tracking-tight leading-snug">
            Remove from Continue Watching?
          </h3>
          <p className="text-[14px] sm:text-[15px] text-theme_6 font-normal leading-relaxed text-center">
            Are you sure you want to remove "{item.title}" from your Continue Watching list? Your progress will be lost.
          </p>
        </div>

        <div className="flex w-full items-center gap-4 mt-2">
          <JOJOCustomButton
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              useContinueWatchingStore.getState().removeItem(item.id);
              setShowDeleteConfirm(false);
            }}
            size={JOJOButton.Size.L}
            state={JOJOButton.State.DEFAULT}
            className="flex-1 font-semibold text-sm sm:text-base hover:!bg-red-600 hover:!text-white"
            bgColor="theme_9"
            textColor="theme_5"
          >
            Remove
          </JOJOCustomButton>
          <JOJOCustomButton
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowDeleteConfirm(false);
            }}
            size={JOJOButton.Size.L}
            state={JOJOButton.State.DEFAULT}
            className="flex-1 font-semibold text-sm sm:text-base"
            bgColor="theme_13_samecolour"
            textColor="theme_1"
          >
            Cancel
          </JOJOCustomButton>
        </div>
      </JOJOModal>
    </>
  );
});

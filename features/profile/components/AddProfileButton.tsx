"use client";

import { JOJOButton, JOJOCustomButton } from "@/components/ui/JOJOButton";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFocusable } from "@noriginmedia/norigin-spatial-navigation";

interface AddProfileButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

/**
 * AddProfileButton Component
 * 
 * Displays a circular "Add Profile" button that matches the size and style
 * of profile avatars. Used on the watching page to allow users to create
 * additional profiles (up to the maximum limit).
 */
export function AddProfileButton({ onClick, disabled = false }: AddProfileButtonProps) {
  const t = useTranslations("watchingPage");

  const { ref, focused } = useFocusable({
    focusKey: 'profile-add-button',
    onEnterPress: () => {
      if (!disabled) onClick();
    }
  });

  return (
    <div ref={ref as any} className={`transition-transform ${focused ? "scale-[1.05]" : ""}`}>
      <JOJOCustomButton
      size={JOJOButton.Size.L}
      state={disabled ? JOJOButton.State.DISABLED : JOJOButton.State.DEFAULT}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "none",
        height: "auto",
        padding: 0,
      }}
      className="!h-auto !p-0 !flex-col !items-center !justify-start w-20 sm:w-28 md:w-36 lg:w-[186px] shrink-0 group focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none"
    >
      <div className="flex flex-col items-center gap-2 sm:gap-3 md:gap-4 w-full">
        {/* Add Profile Circle Button */}
        <div
          className={cn(
            "flex items-center justify-center rounded-full shrink-0",
            "border-2 border-dashed",
            focused ? "border-white shadow-xl ring-4 ring-white" : "border-theme_7 bg-theme_10 hover:bg-theme_9",
            "transition-all duration-200 ease-in-out",
            "h-20 w-20", // mobile: 80px (matches profile avatars)
            "sm:h-28 sm:w-28", // small: 112px
            "md:h-36 md:w-36", // medium: 144px
            "lg:h-[186px] lg:w-[186px]", // desktop: 186px
            "group-hover:scale-[1.04]",
            "group-focus-visible:ring-4 group-focus-visible:ring-theme_13_samecolour",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <Plus
            className={cn(
              "text-theme_7",
              "w-6 h-6", // mobile: smaller icon
              "sm:w-10 sm:h-10", // tablet
              "md:w-14 md:h-14", // medium
              "lg:w-16 lg:h-16" // desktop
            )}
            strokeWidth={2}
          />
        </div>

        {/* Add Profile Label */}
        <div className="flex flex-col items-center gap-0.5 sm:gap-1 w-full max-w-[80px] sm:max-w-[112px] md:max-w-[144px] lg:max-w-[186px]">
          <span className={`text-sm sm:text-base md:text-lg font-medium text-center line-clamp-2 ${focused ? "text-theme_13_samecolour" : "text-theme_7"}`}>
            {t("add_profile")}
          </span>
        </div>
      </div>
    </JOJOCustomButton>
    </div>
  );
}
"use client";

import { cn } from "@/lib/utils";
import { JOJOButton, JOJOCustomButton } from "@/components/ui/JOJOButton";
import { useFocusable } from "@noriginmedia/norigin-spatial-navigation";

export function Chip({
    label,
    active,
    onClick,
    focusKey,
}: {
    label: string;
    active: boolean;
    onClick: () => void;
    focusKey?: string;
}) {
    const { ref, focused } = useFocusable({
        focusKey,
        onEnterPress: onClick,
        onFocus: () => {
            (ref.current as HTMLElement | null)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        },
    });

    return (
        <JOJOCustomButton
            ref={ref as any}
            size={JOJOButton.Size.M}
            state={active ? JOJOButton.State.ACTIVE : JOJOButton.State.DEFAULT}
            type="button"
            onClick={onClick}
            className={cn(
                // !text: body-sm-regular is an unlayered class and beats plain text-* utilities.
                "h-11 sm:h-16 w-full body-sm-regular sm:!text-2xl text-theme_5_50 select-none duration-200 cursor-pointer bg-theme_10_50",
                "rounded-[100px] border-none outline-none",
                active ? "font-bold ring-1 ring-theme_13_samecolour text-theme_13_samecolour" : "",
                // The app's focused-button look (Exit / Resume popups): orange fill, white ring.
                focused ? "!bg-theme_13_samecolour !text-white font-bold ring-4 ring-white scale-105" : ""
            )}
        >
            {label}
        </JOJOCustomButton>
    );
}

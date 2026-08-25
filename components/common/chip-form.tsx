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
                "h-11 sm:h-12 w-full body-sm-regular text-theme_5_50 select-none duration-200 cursor-pointer bg-theme_10_50",
                "rounded-[100px] border-none outline-none",
                active ? "font-bold ring-1 ring-theme_13_samecolour text-theme_13_samecolour" : "",
                focused ? "ring-2 ring-white scale-105" : ""
            )}
        >
            {label}
        </JOJOCustomButton>
    );
}

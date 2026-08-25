import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";
import { useFocusable } from "@noriginmedia/norigin-spatial-navigation";

interface ProfileMenuLinkProps {
    href: string;
    children: ReactNode;
    className?: string;
    target?: string;
}

export function ProfileMenuLink({
    href,
    children,
    className,
    target,
}: ProfileMenuLinkProps) {
    const router = useRouter();
    const handleClick = () => {
        if (target === "_blank") {
            window.open(href, "_blank", "noopener,noreferrer");
        } else {
            router.push(href);
        }
    };

    const { ref, focused } = useFocusable({
        onEnterPress: handleClick,
    });

    return (
        <div
            ref={ref as any}
            onClick={handleClick}
            className={cn(
                "block w-full rounded-xl px-3 py-2 text-left body_xs_regular",
                "text-theme_5",
                "hover:bg-theme_11_samecolour hover:text-theme_13_samecolour",
                "transition-all duration-200 cursor-pointer",
                focused ? "bg-theme_11_samecolour ring-2 ring-white text-theme_13_samecolour" : "",
                className
            )}
        >
            {children}
        </div>
    );
}
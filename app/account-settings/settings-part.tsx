"use client";

import JOJOGoldRowSection from "./jojo-gold-row-section";
import LanguageSwitcher from "@/components/language-dropdown/LanguageDropdown";
import { DarkLightToggle } from "@/components/layout/dark-light-toggle";
import { appConfig } from "@/lib/config/app.config";
import { LOGOS } from "@/lib/constants/assets";
import JOJOCommonImage, { JOJOImagePreset } from "@/components/ui/JOJOCommonImage";
import { useTranslations } from "next-intl";
import { useLogout } from "@/features/auth/hooks/useLogout";
import { LogOut } from "lucide-react";
import { JOJOCustomButton, JOJOButton } from "@/components/ui/JOJOButton";
import { themeColors } from "@/tailwind.config";
import { useFocusable } from "@noriginmedia/norigin-spatial-navigation";
import { cn } from "@/lib/utils";

function FocusableLogoutButton({ onClick, tSettings }: any) {
    const { ref, focused } = useFocusable({
        onEnterPress: onClick,
    });
    return (
        <div
            ref={ref as any}
            onClick={onClick}
            className={cn(
                "h-9 px-4 body-xs-medium sm:h-11 sm:px-5 sm:body-sm-medium cursor-pointer rounded-full flex items-center justify-center transition-all",
                focused ? "ring-2 ring-white scale-105 z-10 bg-theme_13_samecolour text-theme_1" : "bg-theme_10 text-theme_2_same_colour hover:bg-theme_13_samecolour hover:text-theme_1"
            )}
        >
            {tSettings("logout")}
        </div>
    );
}

export default function SettingsPart() {
    const tSettings = useTranslations("tSettings");
    const showDarkLightToggle = appConfig.flags.showDarkLightToggle;
    const { logout } = useLogout();

    const handleLogout = () => {
        logout();
    };

    return (
        <div className="space-y-8">
            <div className="space-y-6 pt-2 max-w-4xl">
                <div className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center shrink-0 w-[35px] h-[30px]">
                            <JOJOCommonImage
                                src={LOGOS.LANGUAGE_CHANGE_LOGO}
                                alt="Language"
                                width={35}
                                height={30}
                                preset={JOJOImagePreset.Default}
                            />
                        </div>
                        <span className="text-base font-normal text-theme_1">
                            {tSettings("language")}
                        </span>
                    </div>
                    <div>
                        <LanguageSwitcher minimal />
                    </div>
                </div>

                <div className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center shrink-0 w-[35px] h-[30px]">
                            <JOJOCommonImage
                                src={LOGOS.THEME_LOGO}
                                alt="Theme"
                                width={30}
                                height={30}
                                preset={JOJOImagePreset.Default}
                            />
                        </div>
                        <span className="text-base font-normal text-theme_1">
                            {tSettings("theme")}
                        </span>
                    </div>
                    <div>
                        <DarkLightToggle disabled={!showDarkLightToggle} />
                    </div>
                </div>

                <div className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center shrink-0 w-[35px] h-[30px] text-theme_1">
                            <LogOut size={22} className="text-theme_1" />
                        </div>
                        <span className="text-base font-normal text-theme_1">
                            {tSettings("logout")}
                        </span>
                    </div>
                    <div>
                        <FocusableLogoutButton onClick={handleLogout} tSettings={tSettings} />
                    </div>
                </div>
            </div>

            {process.env.NEXT_PUBLIC_APP_VERSION && (
                <div className="pt-6 border-t border-[rgba(255,255,255,0.08)] max-w-4xl">
                    <p className="text-xs text-theme_5 body-sm-light">
                        {`JOJO Updated ${process.env.NEXT_PUBLIC_APP_VERSION}`}
                    </p>
                </div>
            )}
        </div>
    );
}
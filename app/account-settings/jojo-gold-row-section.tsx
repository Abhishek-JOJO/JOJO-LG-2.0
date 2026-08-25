import JOJOCommonImage, { JOJOImagePreset } from "@/components/ui/JOJOCommonImage";
import { StorageKey } from "@/enums/storage.enum";
import { useVerifySubscription } from "@/hooks/useVerifySubscription";
import { useBootstrap } from "@/lib/bootstrap/BootstrapContext";
import { LOGOS } from "@/lib/constants/assets";
import { ROUTES } from "@/lib/constants/routes";
import { localStorageManager } from "@/lib/localStorage/localStorage.manager";
import { useAuthStore } from "@/store/useAuthStore";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFocusable } from "@noriginmedia/norigin-spatial-navigation";
import { cn } from "@/lib/utils";

function FocusableUpgradeButton({ onClick, tSettings }: any) {
    const { ref, focused } = useFocusable({
        onEnterPress: onClick,
    });

    return (
        <div
            ref={ref as any}
            onClick={onClick}
            className={cn(
                "gold-gradient-outline-button h-7 sm:h-8 px-3.5 sm:px-4 cursor-pointer whitespace-nowrap !flex items-center justify-center transition-all duration-200",
                focused ? "ring-2 ring-white scale-110 z-10" : ""
            )}
        >
            {tSettings("upgrade_now")}
        </div>
    );
}

export default function JOJOGoldRowSection() {
    const tSettings = useTranslations("tSettings");
    const route = useRouter();
    const sessionId = useAuthStore(state => state.token);
    const { isAppReady } = useBootstrap();
    const [countryCode, setCountryCode] = useState("IN");

    useEffect(() => {
        const geoCache = localStorageManager.get<any>(StorageKey.GEO_CACHE);
        if (geoCache?.geoData?.country_code) {
            setCountryCode(geoCache.geoData.country_code);
        }
    }, []);

    const { data: subData } = useVerifySubscription(countryCode, sessionId, isAppReady);
    const planDetails = subData?.data;
    const subscription = planDetails?.subscription;
    const endDate = subscription?.dEndDate;
    const isExpired = endDate ? new Date(endDate).getTime() < Date.now() : false;
    const isGold = !!(subscription && !isExpired);

    if (isGold) {
        return (
            <div
                className="relative flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 rounded-2xl border gold-border-gradient shadow-lg w-full animate-fade-in"
                style={{
                    background: "var(--gold-card-bg-gradient)"
                }}
            >
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 relative flex-shrink-0 flex items-center justify-center bg-[#FAAF3F]/10 rounded-xl border border-[#FAAF3F]/20">
                        <JOJOCommonImage
                            src={LOGOS.CROWN_LOGO}
                            alt="Crown"
                            width={20}
                            height={20}
                            preset={JOJOImagePreset.Default}
                        />
                    </div>
                    <div className="text-left">
                        <div className="flex items-center gap-2">
                            <span
                                className="text-sm font-bold tracking-wider uppercase"
                                style={{
                                    background: "var(--gold-text-gradient)",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent"
                                }}
                            >
                                {tSettings("jojo_gold_premium")}
                            </span>
                        </div>
                        <p className="text-xs text-theme_5 mt-0.5">
                            {tSettings("premium_welcome_message")}
                        </p>
                    </div>
                </div>
                <div className="text-xs font-semibold text-theme_1 px-4 py-1.5 rounded-full border border-theme_1/10 bg-theme_1/5 whitespace-nowrap">
                    {tSettings("premium_active")}
                </div>
            </div>
        );
    }

    return (
        <div
            className="flex items-center justify-between gap-3 px-6 py-3 rounded-md"
            style={{
                background: "linear-gradient(90deg, rgba(255, 214, 145, 0.1) 0%, rgba(250, 175, 63, 0.01) 100%)"
            }}
        >
            <Link
                href={ROUTES.SUBSCRIPTION}
                aria-label="JOJO Gold"
                className="flex items-center shrink-0"
            >
                <div className="w-20 h-8 sm:w-[110px] sm:h-[42px] relative flex items-center">
                    <JOJOCommonImage
                        src={LOGOS.JOJO_GOLD}
                        alt="JOJO"
                        fill
                        preset={JOJOImagePreset.Logo}
                        wrapperClassName="w-full h-full cursor-pointer animate-fade-in"
                    />
                </div>
            </Link>
            <FocusableUpgradeButton 
                onClick={() => route.push("/subscription")} 
                tSettings={tSettings} 
            />
        </div>
    );
}
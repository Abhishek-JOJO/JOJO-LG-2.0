"use client";

import { ROUTES } from "@/lib/constants/routes";
import { analyticsService } from "@/shared/analytics";
import { EVENT_NAMES } from "@/shared/analytics/constants/analytics.constants";
import { AnimatePresence, motion } from "framer-motion";
import { CreditCard, Monitor, Settings, User, UserCheck2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { AVATAR_FLOW_STORAGE_KEYS } from "../profile/avatar-flow-storage";
import AccountPart from "./account-part";
import ProfilePart from "./profile-part";
import SettingsPart from "./settings-part";
import SubscriptionPart from "./subscription-part";
import TvLoginPart from "./tv-login-part";

type TabType = "account" | "profile" | "subscription" | "tv-login" | "invoice" | "settings";
const TABS: TabType[] = ["account", "profile", "subscription", "tv-login", "invoice", "settings"];

function isTabType(value: string | null): value is TabType {
    return Boolean(value && TABS.includes(value as TabType));
}

import { useFocusable, FocusContext, setFocus } from "@noriginmedia/norigin-spatial-navigation";

function FocusableTabButton({ tab, activeTab, icon, label, onClick }: any) {
    const { ref, focused } = useFocusable({
        focusKey: `account-settings-tab-${tab}`,
        onEnterPress: () => onClick(tab),
    });

    return (
        <button
            ref={ref as any}
            onClick={() => onClick(tab)}
            className={`relative w-full flex items-center gap-3 px-5 py-3 rounded-full cursor-pointer select-none font-medium text-sm sm:text-base text-left transition-transform duration-200 ${
                focused ? "ring-2 ring-white scale-105 z-20 text-theme_1" : "text-theme_1"
            }`}
        >
            {activeTab === tab && (
                <motion.div
                    layoutId="tab-active-bg"
                    className="absolute inset-0 rounded-full"
                    style={{ backgroundColor: "var(--theme_10)" }}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
            )}
            <span className="relative z-10 shrink-0">{icon}</span>
            <span className="relative z-10">{label}</span>
        </button>
    );
}

export default function AccountSettingsPage() {
    const router = useRouter();
    const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const tabParam = searchParams?.get("tab") ?? null;
    const [activeTab, setActiveTab] = useState<TabType>(
        isTabType(tabParam) ? tabParam : "account"
    );
    const tSettings = useTranslations("tSettings");

    useEffect(() => {
        // Auto-restore focus to the active tab so the D-pad knows where to start
        const timer = setTimeout(() => {
            setFocus(`account-settings-tab-${activeTab}`);
        }, 200);
        return () => clearTimeout(timer);
    }, [activeTab]);

    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        router.replace(`${ROUTES.ACCOUNT_SETTINGS}?tab=${tab}`, { scroll: false });
        analyticsService.track(EVENT_NAMES.HELP_AND_SETTING_OPTION_SELECTED, {
            option_name: tab,
            screen_name: 'account_settings',
        });
    };

    useEffect(() => {
        // Fire page_view on mount
        analyticsService.track(EVENT_NAMES.PAGE_VIEW, {
            screen_name: 'account_settings',
            tab: isTabType(tabParam) ? tabParam : 'account',
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (isTabType(tabParam)) {
            setActiveTab(tabParam);
            return;
        }

        const storedTab = window.sessionStorage.getItem(AVATAR_FLOW_STORAGE_KEYS.accountSettingsTab);

        if (isTabType(storedTab)) {
            window.sessionStorage.removeItem(AVATAR_FLOW_STORAGE_KEYS.accountSettingsTab);
            handleTabChange(storedTab);
        }
    }, [tabParam]);

    return (
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-16 pt-20 sm:pt-30 lg:pt-38">
            <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
                <div className="w-full md:w-64 lg:w-72 shrink-0 flex flex-col gap-2">
                    {(
                        [
                            { tab: "account",      icon: <User className="w-5 h-5 stroke-[1.75]" />,       label: tSettings("account") },
                            { tab: "profile",      icon: <UserCheck2 className="w-5 h-5 stroke-[1.75]" />, label: tSettings("profile") },
                            { tab: "subscription", icon: <CreditCard className="w-5 h-5 stroke-[1.75]" />, label: tSettings("my-subscription-plan") },
                            { tab: "tv-login",     icon: <Monitor className="w-5 h-5 stroke-[1.75]" />,    label: tSettings("tv-login") },
                            { tab: "settings",     icon: <Settings className="w-5 h-5 stroke-[1.75]" />,   label: tSettings("settings") },
                        ] as { tab: TabType; icon: React.ReactNode; label: string }[]
                    ).map(({ tab, icon, label }) => (
                        <FocusableTabButton
                            key={tab}
                            tab={tab}
                            activeTab={activeTab}
                            icon={icon}
                            label={label}
                            onClick={handleTabChange}
                        />
                    ))}
                </div>
                <div
                    className="hidden md:block w-[2px] self-stretch shrink-0"
                    style={{
                        background: "linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--theme_1) 34%, transparent) 12.98%, color-mix(in srgb, var(--theme_1) 28%, transparent) 70.19%, transparent 100%)"
                    }}
                />
                <div className="flex-1 md:pl-6 lg:pl-10 min-w-0">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                        >
                            {activeTab === "account" && <AccountPart />}
                            {activeTab === "profile" && <ProfilePart />}
                            {activeTab === "subscription" && <SubscriptionPart />}
                            {activeTab === "tv-login" && <TvLoginPart />}
                            {activeTab === "settings" && <SettingsPart />}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import JOJOGoldRowSection from "./jojo-gold-row-section";
import { ROUTES } from "@/lib/constants/routes";
import { JOJOCustomButton } from "@/components/ui/JOJOButton";
import { JOJOCustomCard } from "@/components/ui/JOJOCard";
import { cookiesManager } from "@/lib/cookies/cookies.manager";

import { useFocusable } from "@noriginmedia/norigin-spatial-navigation";
import { cn } from "@/lib/utils";
import type { User } from "@/features/auth/model/types";

function FocusableLoginButton({ onClick, label }: any) {
    const { ref, focused } = useFocusable({
        onEnterPress: onClick,
    });
    return (
        <div
            ref={ref as any}
            onClick={onClick}
            className={cn(
                "w-full sm:flex-1 transition-all text-sm sm:text-base select-none cursor-pointer flex items-center justify-center font-semibold rounded-full h-12",
                focused ? "ring-2 ring-white scale-105 z-10 bg-theme_8 text-theme_1" : "bg-theme_13_samecolour text-theme_1 hover:bg-theme_8"
            )}
        >
            {label}
        </div>
    );
}

export default function AccountPart() {
    const tSettings = useTranslations("tSettings");
    const [phoneCode, setPhoneCode] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [showModal, setShowModal] = useState(false);

    const clearCookies = () => {
        cookiesManager.clearAll();
    };

    const handleClearAndRedirect = (targetRoute: string) => {
        if (typeof window !== "undefined") {
            window.localStorage.clear();
            window.sessionStorage.clear();
            clearCookies();
            window.location.replace(targetRoute);
        }
    };

    useEffect(() => {
        if (typeof window === "undefined") return;

        const storedUser = window.localStorage.getItem("user");
        const token = window.localStorage.getItem("ott_auth_token");

        if (!storedUser || !token) {
            setShowModal(true);
            return;
        }

        try {
            const userObj = JSON.parse(storedUser) as User;

            if (userObj.isGuest) {
                setShowModal(true);
                return;
            }

            let hasCredentials = false;
            if (userObj.phone) {
                setPhone(userObj.phone);
                hasCredentials = true;
            }
            if (userObj.email) {
                setEmail(userObj.email);
                hasCredentials = true;
            }

            // Extract phoneCode if available in any standard format
            const code = (userObj as any).phoneCode || (userObj as any).phone_code;
            if (code) {
                setPhoneCode(code);
            }

            if (!hasCredentials) {
                setShowModal(true);
            } else {
                setShowModal(false);
            }
        } catch {
            setPhoneCode("");
            setPhone("");
            setEmail("");
            setShowModal(true);
        }
    }, []);

    const handleCancleButton = () => {
        setShowModal(false);
    };

    return (
        <div className="space-y-8">
            <JOJOGoldRowSection />
            {phone && (
                <div className="space-y-1">
                    <div className="text-sm sm:text-base text-theme_5 font-normal">
                        {tSettings("phone_number")}
                    </div>
                    <div className="text-base sm:text-lg font-medium text-theme_1">
                        {phoneCode ? `${phoneCode} ${phone}` : phone}
                    </div>
                </div>
            )}
            {email && (
                <div className="space-y-1">
                    <div className="text-sm sm:text-base text-theme_5 font-normal">
                        {tSettings("email")}
                    </div>
                    <div className="text-base sm:text-lg font-medium text-theme_1">
                        {email}
                    </div>
                </div>
            )}

            {/* Logout/Session expired Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
                    <JOJOCustomCard className="w-full max-w-[500px] p-6 sm:p-8 text-center shadow-2xl relative flex flex-col items-center justify-center !bg-theme_10">
                        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 text-center w-full">
                            {tSettings("logout_modal_title")}
                        </h2>
                        <p className="text-theme_1/60 text-sm sm:text-base leading-relaxed mb-8 max-w-sm mx-auto text-center w-full">
                            {tSettings("logout_modal_desc")}
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
                            <FocusableLoginButton
                                onClick={() => handleClearAndRedirect(ROUTES.LOGIN)}
                                label={tSettings("login_btn")}
                            />
                        </div>
                    </JOJOCustomCard>
                </div>
            )}
        </div>
    );
}
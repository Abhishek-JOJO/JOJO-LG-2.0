"use client";

import { JOJOButton, JOJOCustomButton } from "@/components/ui/JOJOButton";
import { useTranslations } from "next-intl";

interface ProfilesErrorFallbackProps {
    onRetry: () => void;
}

/**
 * ProfilesErrorFallback - Error recovery UI for profile loading failures
 * 
 * Provides:
 * - Clear error message
 * - Retry action
 * - User-friendly recovery path
 */
export function ProfilesErrorFallback({ onRetry }: ProfilesErrorFallbackProps) {
    const t = useTranslations("watchingPage");

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="text-center max-w-md">
                <div className="mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-theme_14_18 mb-4">
                        <span className="text-3xl text-theme_14_samecolour">⚠</span>
                    </div>
                    <h1 className="text-2xl font-bold text-theme_1 mb-2">
                        {t("error_load")}
                    </h1>
                    <p className="text-theme_5 text-sm">
                        {t("error_network")}
                    </p>
                </div>

                <JOJOCustomButton
                    size={JOJOButton.Size.M}
                    state={JOJOButton.State.ACTIVE}
                    onClick={onRetry}
                    className="px-8 py-3"
                >
                    {t("retry")}
                </JOJOCustomButton>
            </div>
        </div>
    );
}
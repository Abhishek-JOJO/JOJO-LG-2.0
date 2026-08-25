"use client";

import { useTranslations } from "next-intl";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { useToastStore } from "@/store/useToastStore";
import { JOJOCustomButton, JOJOButton } from "@/components/ui/JOJOButton";
import { JOJOCustomInput } from "@/components/ui/JOJOInput";
import { pairDevice } from "@/lib/api/pair";
import { REGEX } from "@/lib/constants/regex";
import { analyticsService } from "@/shared/analytics";
import { EVENT_NAMES } from "@/shared/analytics/constants/analytics.constants";


export default function TvLoginPart() {
    const tSettings = useTranslations("tSettings");
    const toast = useToastStore();
    const sessionId = useAuthStore(state => state.token);

    const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
    const [activeIndex, setActiveIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        setDigits(Array(6).fill(""));
        setActiveIndex(0);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }, []);

    useEffect(() => {
        inputRefs.current[activeIndex]?.focus();
    }, [activeIndex]);

    const setDigit = (index: number, val: string) => {
        setDigits((prev) => {
            const nextDigits = [...prev];
            nextDigits[index] = val;
            return nextDigits;
        });
    };

    const handleFocus = (index: number) => {
        const firstEmptyIndex = digits.findIndex((d) => d === "");
        if (firstEmptyIndex !== -1 && firstEmptyIndex < index) {
            setActiveIndex(firstEmptyIndex);
        } else {
            setActiveIndex(index);
        }
    };

    const handleChange = (value: string, index: number) => {
        const val = value.toLowerCase().replace(REGEX.NON_ALPHANUMERIC_REGEX, "").toUpperCase();
        if (!val) {
            setDigit(index, "");
            return;
        }

        const char = val.slice(-1);
        setDigit(index, char);

        if (index < 5) {
            setActiveIndex(index + 1);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === "Backspace") {
            e.preventDefault();
            if (digits[index]) {
                setDigit(index, "");
                if (index > 0) {
                    setActiveIndex(index - 1);
                }
            } else if (index > 0) {
                setDigit(index - 1, "");
                setActiveIndex(index - 1);
            }
        }
        if (e.key === "ArrowLeft" && index > 0) {
            e.preventDefault();
            setActiveIndex(index - 1);
        }
        if (e.key === "ArrowRight" && index < 5) {
            e.preventDefault();
            setActiveIndex(index + 1);
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedData = e.clipboardData
            .getData("text")
            .toLowerCase()
            .replace(REGEX.NON_ALPHANUMERIC_REGEX, "")
            .toUpperCase()
            .slice(0, 6);

        if (!pastedData) return;

        const newDigits = [...digits];
        for (let i = 0; i < 6; i++) {
            if (pastedData[i]) {
                newDigits[i] = pastedData[i];
            }
        }
        setDigits(newDigits);

        const focusIndex = Math.min(pastedData.length, 5);
        setActiveIndex(focusIndex);
    };

    const handleProceed = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = digits.join("");
        if (code.length < 6) return;

        setIsLoading(true);
        analyticsService.track(EVENT_NAMES.TV_LOGIN_STARTED, { pairing_code: code });

        try {
            const res = await pairDevice(code, sessionId ?? undefined);
            const successMsg = res?.metaData?.message || "";
            toast.show(successMsg, "success");
            analyticsService.track(EVENT_NAMES.TV_LOGIN_SUCCESS, { pairing_code: code });
            setDigits(Array(6).fill(""));
            setActiveIndex(0);
            setTimeout(() => inputRefs.current[0]?.focus(), 100);
        } catch (error: any) {
            const errorMessage = error?.message || tSettings("tv_login_error");
            toast.show(errorMessage, "error");
            analyticsService.track(EVENT_NAMES.TV_LOGIN_FAILED, {
                pairing_code: code,
                error_message: errorMessage,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const canSubmit = digits.every((d) => d !== "");

    return (
        <div className="flex flex-col items-center justify-center py-10 w-full max-w-lg mx-auto space-y-8">
            <h2 className="text-xl sm:text-2xl font-semibold text-theme_1 text-center font-poppins">
                {tSettings("tv_login_desc")}
            </h2>

            <form onSubmit={handleProceed} className="flex flex-col items-center space-y-8 w-full">
                <div className="flex items-center justify-center gap-2 sm:gap-3.5 w-full max-w-md mx-auto">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <JOJOCustomInput
                            key={i}
                            ref={(el) => {
                                inputRefs.current[i] = el;
                            }}
                            type="text"
                            maxLength={1}
                            value={digits[i]}
                            onChange={(e) => handleChange(e.target.value, i)}
                            onKeyDown={(e) => handleKeyDown(e, i)}
                            onPaste={handlePaste}
                            onFocus={() => handleFocus(i)}
                            className={cn(
                                "flex-1 aspect-square min-w-[36px] max-w-[64px] sm:max-w-[80px] text-center text-xl sm:text-3xl font-bold rounded-[8px] sm:rounded-[16px] outline-none uppercase",
                                "bg-theme_10 text-theme_1 border-0 border-transparent",
                                activeIndex === i
                                    ? "ring-1 ring-theme_13_samecolour bg-theme_10"
                                    : "focus:ring-0 focus:outline-none"
                            )}
                            style={{
                                border: activeIndex === i ? "1px solid var(--theme_13_samecolour)" : "none",
                                transition: "none",
                                fontWeight: "700",
                            }}
                            autoFocus={i === 0}
                        />
                    ))}
                </div>

                <JOJOCustomButton
                    size={JOJOButton.Size.L}
                    state={canSubmit ? JOJOButton.State.ACTIVE : JOJOButton.State.DISABLED}
                    type="submit"
                    disabled={!canSubmit || isLoading}
                    isLoading={isLoading}
                    className="rounded-full px-12 py-3.5 body-md-medium border-none hover:opacity-90 transition-opacity min-w-[140px]"
                >
                    {tSettings("proceed")}
                </JOJOCustomButton>
            </form>
        </div>
    );
}

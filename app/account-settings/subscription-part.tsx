"use client";

import { JOJOFlagEmoji } from "@/components/ui/JOJOFlagEmoji";
import { StorageKey } from "@/enums/storage.enum";
import { useVerifySubscription } from "@/hooks/useVerifySubscription";
import { useBootstrap } from "@/lib/bootstrap/BootstrapContext";
import { appConfig } from "@/lib/config/app.config";
import { ROUTES } from "@/lib/constants/routes";
import { localStorageManager } from "@/lib/localStorage/localStorage.manager";
import { useAuthStore } from "@/store/useAuthStore";
import { AlertTriangle, ArrowRight, Calendar, CheckCircle, CreditCard, MapPin, RefreshCw, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { useEffect, useState } from "react";
import JOJOGoldRowSection from "./jojo-gold-row-section";
import InvoicePart from "./invoice-part";
import { useQuery } from "@tanstack/react-query";
import { InvoiceApiResponse, listInvoices } from "@/lib/api/invoice";

import { useRevokeSpecialUserSubscription } from "@/features/auth/hooks/useOtpLogin";
import { useToastStore } from "@/store/useToastStore";
import { JOJOCustomButton, JOJOButton } from "@/components/ui/JOJOButton";
import { useFocusable } from "@noriginmedia/norigin-spatial-navigation";
import { cn } from "@/lib/utils";

function FocusableActionIcon({ onClick, icon: Icon, isLoading, title }: any) {
    const { ref, focused } = useFocusable({
        onEnterPress: onClick,
    });
    return (
        <div
            ref={ref as any}
            onClick={onClick}
            title={title}
            className={cn(
                "flex items-center justify-center p-2 rounded-full border transition cursor-pointer disabled:opacity-50",
                focused ? "ring-2 ring-white scale-110 z-10 border-theme_1 bg-theme_10" : "border-theme_1/10 bg-theme_12/50 text-theme_5 hover:text-theme_1"
            )}
        >
            <Icon className={cn("w-4 h-4", isLoading ? "animate-spin" : "")} />
        </div>
    );
}

function FocusableCallToAction({ onClick, label, icon: Icon }: any) {
    const { ref, focused } = useFocusable({
        onEnterPress: onClick,
    });
    return (
        <div
            ref={ref as any}
            onClick={onClick}
            className={cn(
                "w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-full text-black font-semibold text-sm transition cursor-pointer",
                focused ? "ring-2 ring-white scale-105 bg-amber-400 z-10" : "bg-theme_13_samecolour hover:bg-amber-500"
            )}
        >
            {label}
            {Icon && <Icon className="w-4 h-4" />}
        </div>
    );
}

function FocusableCancelButton({ onClick, isLoading, label }: any) {
    const { ref, focused } = useFocusable({
        onEnterPress: onClick,
    });
    return (
        <div
            ref={ref as any}
            onClick={onClick}
            className={cn(
                "border border-rose-500/30 rounded-full font-semibold text-xs px-5 py-2.5 transition cursor-pointer",
                focused ? "ring-2 ring-white scale-105 z-10 bg-rose-500/30 text-white" : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400",
                isLoading ? "opacity-50 pointer-events-none" : ""
            )}
        >
            {label}
        </div>
    );
}

const INVOICE_PAGE_SIZE = 5;

export default function SubscriptionPart() {
    const tSettings = useTranslations("tSettings");
    const { isAppReady } = useBootstrap();
    const sessionId = useAuthStore(state => state.token);
    const user = useAuthStore(state => state.user);
    const showToast = useToastStore(state => state.show);
    const revokeSpecialSub = useRevokeSpecialUserSubscription();
    const router = useRouter();

    const isSpecialUser = user?.isSpecialUser || (user as any)?.is_special_user || false;
    const [countryCode, setCountryCode] = useState(appConfig.GEO_DEFAULT_COUNTRY_CODE);
    const [countryName, setCountryName] = useState("India");

    useEffect(() => {
        const geoCache = localStorageManager.get<any>(StorageKey.GEO_CACHE);
        if (geoCache?.geoData?.country_code) {
            setCountryCode(geoCache.geoData.country_code);
        }
        if (geoCache?.geoData?.country_name) {
            setCountryName(geoCache.geoData.country_name);
        }
    }, []);

    const { data, isLoading, isError, refetch, isFetching } = useVerifySubscription(countryCode, sessionId, isAppReady);

    const {
        data: invoiceData,
        isLoading: isInvoiceLoading,
        isError: isInvoiceError,
    } = useQuery<InvoiceApiResponse>({
        queryKey: ["invoice-list", sessionId],
        queryFn: async ({ signal }) => listInvoices(sessionId ?? undefined, signal),
        enabled: !!sessionId,
        staleTime: appConfig.STALE_TIME,
        retry: false,
    });

    if (!sessionId) {
        return (
            <div className="text-theme_5 text-sm py-4">
                Please login to view your subscription details.
            </div>
        );
    }

    const planDetails = data?.data;
    const subscription = planDetails?.subscription;

    // Check if subscription has expired
    const endDate = subscription?.dEndDate;
    const isExpired = endDate ? new Date(endDate).getTime() < Date.now() : false;
    const isActive = subscription && !isExpired;

    const handleRevokeSpecialSubscription = async () => {
        try {
            const payload: any = {};
            if (user?.email) {
                payload.email = user.email;
            } else if (user?.phone) {
                payload.phone = user.phone;
                payload.phone_code = (user as any).phone_code || (user as any).phoneCode || "+91";
            }

            await revokeSpecialSub.mutateAsync(payload);
            showToast("Special User Subscription revoked successfully!", "success");
            refetch();
        } catch (err: any) {
            showToast(err?.message || "Failed to revoke subscription", "error");
        }
    };

    const invoices = Array.isArray(invoiceData?.data?.invoice) ? invoiceData.data.invoice : [];
    const isAnythingLoading = isLoading || isInvoiceLoading;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-semibold text-theme_1">{tSettings("my-subscription-plan")}</h1>
                    <p className="mt-2 text-sm text-theme_5">{tSettings("plan_details")}</p>
                </div>
                {sessionId && (
                    <FocusableActionIcon 
                        onClick={() => refetch()} 
                        icon={RefreshCw} 
                        isLoading={isFetching} 
                        title="Refresh status" 
                    />
                )}
            </div>

            {/* ── Single skeleton for the whole page while either query is loading ── */}
            {isAnythingLoading && (
                <div className="space-y-6">
                    {/* Subscription card skeleton */}
                    <div className="relative rounded-3xl border border-theme_1/10 bg-theme_12/40 backdrop-blur-md p-6 sm:p-8 shadow-xl overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 rounded-full bg-theme_1/10 animate-pulse" />
                                    <div className="h-3 w-28 rounded-md bg-theme_1/10 animate-pulse" />
                                </div>
                                <div className="h-8 w-56 rounded-lg bg-theme_1/10 animate-pulse" />
                            </div>
                            <div className="h-6 w-24 rounded-full bg-theme_1/10 animate-pulse self-start sm:self-center" />
                        </div>
                        <hr className="my-6 border-theme_1/5" />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[1, 2].map((i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="h-5 w-5 rounded-md bg-theme_1/10 animate-pulse shrink-0 mt-0.5" />
                                    <div className="flex flex-col gap-1.5">
                                        <div className="h-3 w-16 rounded-md bg-theme_1/10 animate-pulse" />
                                        <div className="h-4 w-24 rounded-md bg-theme_1/10 animate-pulse" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Invoice skeleton */}
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between items-start">
                            <div className="flex flex-col gap-2">
                                <div className="h-8 w-48 rounded-lg bg-theme_1/10 animate-pulse" />
                                <div className="h-4 w-72 rounded-md bg-theme_1/10 animate-pulse" />
                            </div>
                            <div className="rounded-lg border border-theme_1/10 bg-theme_11/70 px-5 py-4 min-w-[110px]">
                                <div className="h-9 w-10 rounded-md bg-theme_1/10 animate-pulse ml-auto mb-1" />
                                <div className="h-3 w-20 rounded-md bg-theme_1/10 animate-pulse ml-auto" />
                            </div>
                        </div>
                        <div className="overflow-hidden rounded-3xl border border-theme_1/10 bg-theme_12/70">
                            <div className="bg-theme_11/70 px-6 py-4 grid grid-cols-4 gap-4">
                                {[100, 140, 80, 60].map((w, i) => (
                                    <div key={i} className={`h-4 rounded-md bg-theme_1/10 animate-pulse ${i === 3 ? "ml-auto" : ""}`} style={{ width: w }} />
                                ))}
                            </div>
                            {Array.from({ length: INVOICE_PAGE_SIZE }).map((_, rowIndex) => (
                                <div key={rowIndex} className="border-t border-theme_1/10 px-6 py-4 grid grid-cols-4 gap-4 items-center">
                                    <div className="h-4 w-36 rounded-md bg-theme_1/10 animate-pulse" style={{ animationDelay: `${rowIndex * 80}ms` }} />
                                    <div className="h-4 w-28 rounded-md bg-theme_1/10 animate-pulse" style={{ animationDelay: `${rowIndex * 80 + 20}ms` }} />
                                    <div className="h-4 w-20 rounded-md bg-theme_1/10 animate-pulse" style={{ animationDelay: `${rowIndex * 80 + 40}ms` }} />
                                    <div className="h-8 w-24 rounded-lg bg-theme_1/10 animate-pulse ml-auto" style={{ animationDelay: `${rowIndex * 80 + 60}ms` }} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {!isAnythingLoading && isError && (
                <div className="rounded-3xl border border-rose-500/20 bg-rose-500/5 backdrop-blur-md p-8 flex flex-col items-center justify-center gap-3">
                    <AlertTriangle className="w-8 h-8 text-rose-500" />
                    <span className="text-rose-500 text-sm font-medium">{tSettings("subscription_error")}</span>
                    <div
                        onClick={() => refetch()}
                        className="mt-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold rounded-full border border-rose-500/30 transition cursor-pointer"
                    >
                        Retry
                    </div>
                </div>
            )}

            {!isAnythingLoading && !isError && (
                <div className="space-y-6">
                    {isActive ? (
                        <div className="relative rounded-3xl gold-border-gradient bg-gradient-to-br from-theme_12/80 to-theme_11/50 backdrop-blur-md p-6 sm:p-8 shadow-xl">
                            <div className="absolute -right-20 -top-20 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                                        <span className="text-xs font-semibold tracking-wider text-amber-400 uppercase">{tSettings("jojo_gold_premium")}</span>
                                    </div>
                                    <h2 className="text-2xl sm:text-3xl font-bold text-theme_1">
                                        {subscription?.oProductTranslation?.sName || subscription?.sSubProductLabel || tSettings("premium_membership")}
                                    </h2>
                                </div>
                                <span className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    {tSettings("subscription_active")}
                                </span>
                            </div>

                            <hr className="my-6 border-theme_1/5" />

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="flex items-start gap-3">
                                    <Calendar className="w-5 h-5 text-theme_5 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="block text-xs text-theme_5">{tSettings("start_date")}</span>
                                        <span className="text-sm font-semibold text-theme_1">{formatDate(subscription?.dStartDate)}</span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Calendar className="w-5 h-5 text-theme_5 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="block text-xs text-theme_5">{tSettings("valid_until")}</span>
                                        <span className="text-sm font-semibold text-theme_1">{formatDate(subscription?.dEndDate)}</span>
                                    </div>
                                </div>
                            </div>

                            {isSpecialUser && (
                                <div className="mt-6 pt-6 border-t border-theme_1/5 flex justify-end">
                                    <FocusableCancelButton 
                                        onClick={handleRevokeSpecialSubscription}
                                        isLoading={revokeSpecialSub.isPending}
                                        label={revokeSpecialSub.isPending ? "Cancelling..." : "Cancel Special Subscription"}
                                    />
                                </div>
                            )}
                        </div>
                    ) : subscription ? (
                        <div className="space-y-6">
                            <div className="relative overflow-hidden rounded-3xl border border-theme_1/10 bg-theme_12/40 backdrop-blur-md p-6 sm:p-8 shadow-xl">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="space-y-2">
                                        <h2 className="text-2xl font-bold text-theme_1">
                                            {subscription?.oProductTranslation?.sName || subscription?.sSubProductLabel || tSettings("premium_membership")}
                                        </h2>
                                        <p className="text-sm text-theme_5">
                                            {tSettings("expired_on")}: <span className="font-semibold text-theme_1">{formatDate(subscription?.dEndDate)}</span>
                                        </p>
                                    </div>
                                    <span className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/25">
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        {tSettings("subscription_expired")}
                                    </span>
                                </div>

                                <hr className="my-6 border-theme_1/5" />

                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-5 h-5 text-theme_5 shrink-0" />
                                        <span className="text-xs text-theme_5">{tSettings("purchased_in")}:</span>
                                        <div className="flex items-center gap-1.5">
                                            <JOJOFlagEmoji countryCode={countryCode} size={16} />
                                            <span className="text-sm font-semibold text-theme_1">{countryName} ({countryCode})</span>
                                        </div>
                                    </div>

                                    <FocusableCallToAction 
                                        onClick={() => router.push(ROUTES.SUBSCRIPTION)}
                                        label={tSettings("upgrade_now")}
                                        icon={ArrowRight}
                                    />
                                </div>
                            </div>
                            <JOJOGoldRowSection />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="relative overflow-hidden rounded-3xl border border-theme_1/10 bg-theme_12/40 backdrop-blur-md p-6 sm:p-8 shadow-xl">
                                <div className="absolute -right-20 -top-20 w-56 h-56 bg-theme_1/5 rounded-full blur-3xl pointer-events-none" />
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <CreditCard className="w-5 h-5 text-theme_5 shrink-0" />
                                        <h2 className="text-xl font-bold text-theme_1">{tSettings("no_active_subscription")}</h2>
                                    </div>
                                    <p className="text-sm text-theme_5 max-w-xl leading-relaxed">
                                        {tSettings("please_purchase_subscription")}
                                    </p>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-4">
                                        <FocusableCallToAction 
                                            onClick={() => router.push(ROUTES.SUBSCRIPTION)}
                                            label={tSettings("explore_plans")}
                                            icon={ArrowRight}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Invoice section — only shown once both queries are done and invoices exist */}
            {!isAnythingLoading && invoices.length > 0 && (
                <InvoicePart invoices={invoices} isError={isInvoiceError} />
            )}
        </div>
    );
}

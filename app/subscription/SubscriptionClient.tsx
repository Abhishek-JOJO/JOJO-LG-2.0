"use client";

import { JOJOModal } from "@/components/ui/JOJOModal";
import JOJOCommonVideo from "@/components/ui/JOJOCommonVideo";
import { useSubscriptionAllPlans } from "@/features/subscription/hooks/useSubscriptionAllPlans";
import { LOGOS } from "@/lib/constants/assets";
import { analyticsService } from "@/shared/analytics";
import { EVENT_NAMES } from "@/shared/analytics/constants/analytics.constants";
import { useLocaleStore } from "@/store/useLocaleStore";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useMemo, useState, useEffect } from "react";
import QRCode from "qrcode";
import Loading from "./loading";
import { JOJOButton, JOJOCustomButton } from "@/components/ui/JOJOButton";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useVerifySubscription } from "@/hooks/useVerifySubscription";
import { appConfig } from "@/lib/config/app.config";
import { localStorageManager } from "@/lib/localStorage/localStorage.manager";
import { StorageKey } from "@/enums/storage.enum";
import { useToastStore } from "@/store/useToastStore";
import { useBootstrap } from "@/lib/bootstrap/BootstrapContext";
import { ROUTES } from "@/lib/constants/routes";
import { safeNavigate } from "@/lib/webos/safeNavigate";
import JOJOCommonImage, { JOJOImagePreset } from "@/components/ui/JOJOCommonImage";
import { useOverseasDetection } from "@/features/geo/hooks/useOverseasDetection";
import { useFocusable, setFocus, doesFocusableExist } from "@noriginmedia/norigin-spatial-navigation";

const SUBSCRIPTION_QR_URL = "https://jojoapp.in/subscription";

function shouldShowSubscriptionQrPage() {
    if (typeof window === "undefined") return true;
    const userAgent = window.navigator.userAgent;
    const isPhoneOrTablet = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) && !/webOS|SmartTV|TV/i.test(userAgent);
    return !isPhoneOrTablet;
}

// This page never set any initial D-pad focus at all — a TV user landing here
// had nothing focused and no current position for norigin to navigate from, so
// every arrow press did nothing ("navigation not working"). Same
// doesFocusableExist-guarded retry as the rest of this app (see
// app/account-settings/page.tsx, app/watchlist/page.tsx): a single setFocus()
// on mount is a known-fragile race on TV hardware, since the target's own
// useFocusable() registration effect can commit a tick or more later.
function retrySetFocus(focusKey: string, attempts = 8, intervalMs = 100) {
    let tries = 0;
    const attempt = () => {
        tries += 1;
        if (doesFocusableExist(focusKey)) {
            setFocus(focusKey);
            return;
        }
        if (tries < attempts) {
            setTimeout(attempt, intervalMs);
        }
    };
    setTimeout(attempt, intervalMs);
}

function FocusablePlanCard({ onClick, children, isSelected, isMultiMonth, has3OrMorePlans, badge, cardStyleClass, cardRoundingClass, product, focusKey }: any) {
    const handleArrowPress = (direction: string) => {
        if (direction === "down") {
            setFocus("subscription-proceed-btn");
            return false;
        }
        if (direction === "up") {
            setFocus("navbar-get-gold");
            return false;
        }
        return true;
    };

    const { ref, focused } = useFocusable({
        focusKey,
        focusable: true,
        onArrowPress: handleArrowPress,
        onEnterPress: onClick
    });

    return (
        <motion.div
            ref={ref}
            id={`plan-${product?.productId}`}
            data-focuskey={focusKey}
            onClick={onClick}
            className={`z-1
                relative w-full cursor-pointer text-left border-2
                ${has3OrMorePlans ? "flex flex-row items-center justify-between p-4 sm:p-5" : "flex-1 flex flex-col items-start gap-1 p-4 sm:p-4"}
                ${cardRoundingClass}
                ${cardStyleClass}
                ${focused ? "scale-[1.03]" : ""}
            `}
            style={{
                background: isSelected && !isMultiMonth
                    ? "var(--theme_12_15_samecolor, rgba(242, 110, 33, 0.15))"
                    : undefined
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            animate={{ scale: isSelected || focused ? 1.03 : 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
            {children}
        </motion.div>
    );
}

function FocusableProceedButton({ onClick, children, className, style, focusKey, upKey, ...props }: any) {
    const handleArrowPress = (direction: string) => {
        if (direction === "up" && upKey) {
            setFocus(upKey);
            return false;
        }
        return true;
    };

    const { ref, focused } = useFocusable({
        focusKey,
        focusable: true,
        onArrowPress: handleArrowPress,
        onEnterPress: onClick
    });

    return (
        <JOJOCustomButton
            ref={ref}
            data-focuskey={focusKey}
            onClick={onClick}
            className={`${className} border-2 ${focused ? "border-white scale-[1.02] shadow-[0_0_32px_rgba(242,110,33,0.35)]" : "border-transparent"}`}
            style={style}
            {...props}
        >
            {children}
        </JOJOCustomButton>
    );
}

const formatPrice = (val: number | undefined | null): string => {
    if (val === undefined || val === null || isNaN(val)) return "";
    const rounded = Math.round(val * 100) / 100;
    return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(2);
};

function getQrPlanTitle(product: any) {
    if (!product) return "JOJO Gold";
    if (product.validityDays === 365 || product.validityCount === 12) return "12 months";
    if (product.validityDays === 30 || product.validityCount === 1) return "1 Month";
    return product.label || product.name || "JOJO Gold";
}

function PlanFeatureIcon({ src, alt }: { src?: string; alt?: string }) {
    if (!src) return null;
    return (
        <div className="relative h-9 w-9">
            <JOJOCommonImage
                src={src}
                alt={alt || ""}
                fill
                contentMode="contain"
                wrapperClassName="w-full h-full"
            />
        </div>
    );
}

function FocusableQrPlanCard({
    product,
    isSelected,
    onSelect,
    focusKey,
    index,
}: {
    product: any;
    isSelected: boolean;
    onSelect: () => void;
    focusKey: string;
    index: number;
}) {
    const handleArrowPress = (direction: string) => {
        if (direction === "up" && index === 0) {
            setFocus("navbar-get-gold");
            return false;
        }
        return true;
    };

    const { ref, focused } = useFocusable({
        focusKey,
        focusable: true,
        onArrowPress: handleArrowPress,
        onEnterPress: onSelect,
    });

    const sku = product?.skus?.[0];
    if (!sku) return null;
    const title = getQrPlanTitle(product);
    const featureLimit = product.validityCount === 1 ? 3 : 4;

    return (
        <button
            ref={ref as any}
            onClick={onSelect}
            className={`w-full rounded-2xl border px-7 py-6 text-left transition-all outline-none bg-black/28 text-white backdrop-blur-md ${
                focused
                    ? "border-amber-400 ring-4 ring-amber-400/50 scale-[1.03] shadow-xl shadow-amber-500/20"
                    : isSelected
                    ? "border-white/70 bg-white/10"
                    : "border-white/25"
            }`}
        >
            <div className="mb-7 flex items-center justify-between gap-4">
                <span className="text-2xl font-extrabold">{title}</span>
                <span className="text-2xl font-extrabold">
                    {sku.currencySymbol}{formatPrice(sku.price)} / month
                </span>
            </div>

            <div className={`grid gap-4 ${featureLimit >= 4 ? "grid-cols-4" : "grid-cols-3"}`}>
                {product.features?.slice(0, featureLimit).map((feature: any, idx: number) => (
                    <div key={feature.featureId || idx} className="flex min-w-0 flex-col items-center gap-2 text-center">
                        <PlanFeatureIcon src={feature.featureImageUrl} alt={feature.featureName} />
                        <span className="text-sm font-bold leading-tight text-white/90">{String(feature.featureName || "").replace("Upto", "Upto ")}</span>
                    </div>
                ))}
            </div>
        </button>
    );
}

function SubscriptionQrPage({ products, selectedProduct, onSelectProduct }: { products: any[]; selectedProduct: any; onSelectProduct: (productId: string) => void }) {
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const selectedSku = selectedProduct?.skus?.[0];
    const selectedPlanTitle = getQrPlanTitle(selectedProduct);

    useEffect(() => {
        retrySetFocus("qr-plan-0");
    }, []);

    useEffect(() => {
        let cancelled = false;
        QRCode.toDataURL(SUBSCRIPTION_QR_URL, {
            width: 460,
            margin: 1,
            color: { dark: "#000000", light: "#ffffff" },
        })
            .then((dataUrl) => {
                if (!cancelled) setQrDataUrl(dataUrl);
            })
            .catch(() => {
                if (!cancelled) setQrDataUrl(null);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="relative min-h-screen overflow-hidden flex items-center justify-center px-10 pt-2 pb-16">
            <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_25%_25%,_#3d1a08_0%,_#140a04_50%,_#050201_100%)]" />
            <div className="fixed inset-0 z-0 pointer-events-none bg-black/25" />
            <div className="fixed top-[18%] right-0 z-0 h-[560px] w-[760px] rounded-full bg-[var(--theme_13)] opacity-[0.14] blur-[130px] pointer-events-none translate-x-1/3" />
            <div className="fixed bottom-[5%] left-0 z-0 h-[520px] w-[720px] rounded-full bg-[var(--theme_13)] opacity-[0.12] blur-[130px] pointer-events-none -translate-x-1/3" />

            <div className="relative z-10 grid w-full max-w-7xl grid-cols-[0.9fr_1.15fr] items-center gap-10 xl:gap-14">
                <div className="flex flex-col items-center">
                    <div className="relative mb-4 h-14 w-52">
                        <JOJOCommonImage
                            src={LOGOS.JOJO_GOLD}
                            alt="JOJO Gold"
                            fill
                            contentMode="contain"
                            priority
                            preset={JOJOImagePreset.Logo}
                            wrapperClassName="w-full h-full"
                        />
                    </div>
                    <p className="mb-6 text-center text-2xl font-bold text-white">Premium Deals, Unlimited Entertainment!</p>

                    <div className="flex w-full max-w-[560px] flex-col gap-5">
                        {products.map((product, index) => (
                            <FocusableQrPlanCard
                                key={product.productId}
                                product={product}
                                isSelected={product.productId === selectedProduct?.productId}
                                onSelect={() => onSelectProduct(product.productId)}
                                focusKey={`qr-plan-${index}`}
                                index={index}
                            />
                        ))}
                    </div>
                </div>

                <div className="flex flex-col items-center rounded-3xl border border-white/22 bg-white/[0.08] p-9 text-center backdrop-blur-2xl">
                    <h1 className="mb-6 text-center text-4xl font-extrabold leading-tight text-white">Continue Watching on JOJO</h1>

                    <div className="mb-8 flex w-full justify-center">
                        <div className="flex h-[344px] w-[344px] items-center justify-center rounded-2xl bg-white/10 p-3 backdrop-blur-xl">
                            <div className="flex h-full w-full items-center justify-center rounded-xl bg-white p-3">
                                {qrDataUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={qrDataUrl} alt="JOJO Gold subscription QR code" className="h-full w-full object-contain" />
                                ) : (
                                    <span className="text-base font-semibold text-black/60">Generating QR...</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <p className="max-w-[620px] text-center text-3xl font-extrabold leading-tight text-white">
                        Continue with JOJO Gold Plan
                    </p>
                    <p className="mt-5 max-w-[650px] text-center text-base font-semibold leading-snug text-white/82">
                        Use the QR code to open the JOJO app and finish your purchase with the same account as your TV. Restart the app to start watching.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function SubscriptionPage() {
    const t = useTranslations("subscription");
    const locale = useLocaleStore((s) => s.locale);
    const languageId = locale === "gu" ? 2 : 1;

    // Get country code from overseas detection hook
    const { countryCode, isOverseas } = useOverseasDetection();

    // Fetch plans from API with dynamic country code
    const { data: plansData, isLoading, error } = useSubscriptionAllPlans({
        country: countryCode,
        deviceTypeId: 5,
        languageId,
    });

    const router = useRouter();
    const sessionId = useAuthStore(state => state.token);
    const { isAppReady } = useBootstrap();
    const { show: showToast } = useToastStore();


    // Verify existing subscription status
    const { data: subData, isLoading: isSubLoading } = useVerifySubscription(countryCode, sessionId, isAppReady);

    const isGold = useMemo(() => {
        if (!subData?.data) return false;
        const subscription = subData.data.subscription;
        const endDate = subscription?.dEndDate;
        const isExpired = endDate ? new Date(endDate).getTime() < Date.now() : false;
        return !!(subscription && !isExpired);
    }, [subData]);

    // Currency note for overseas users
    const currencyNote = useMemo(() => {
        if (isOverseas && plansData?.groups?.[0]?.products?.[0]?.skus?.[0]) {
            const sku = plansData.groups[0].products[0].skus[0];
            return t("currencyNote", { currency: sku.currency });
        }
        return null;
    }, [isOverseas, plansData, t]);

    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const [showQrPage] = useState(shouldShowSubscriptionQrPage);

    // Extract products under the group (e.g. jojo_gold)
    const activeGroup = plansData?.groups?.[0];
    const products = activeGroup?.products ?? [];

    // Default selection to first product when loaded
    const selectedProduct = useMemo(() => {
        if (!products.length) return null;
        if (selectedProductId) {
            return products.find((p) => p.productId === selectedProductId) ?? products[0];
        }
        return products[0];
    }, [products, selectedProductId]);

    // Land the D-pad somewhere as soon as there's something to land it on — this
    // page previously never set any initial focus at all, so a TV user arriving
    // here had nothing focused and arrow presses did nothing. Both hooks below
    // must run unconditionally before the isGold early return (Rules of Hooks),
    // so each just no-ops internally when its own branch isn't the active one.
    useEffect(() => {
        if (isGold) {
            retrySetFocus("gold-already-proceed-btn");
        }
    }, [isGold]);

    useEffect(() => {
        if (!isGold && selectedProduct) {
            retrySetFocus(`plan-card-${selectedProduct.productId}`);
        }
    }, [isGold, selectedProduct]);

    // Render Modal immediately if Gold (No skeleton)
    if (isGold) {
        const returnWatchAssetId = typeof window !== "undefined" ? sessionStorage.getItem("return_watch_asset_id") : null;
        
        const handleAlreadyGoldClose = () => {
            if (returnWatchAssetId) {
                sessionStorage.removeItem("return_watch_asset_id");
                safeNavigate(router, ROUTES.WATCH(returnWatchAssetId), { replace: true });
            } else {
                safeNavigate(router, ROUTES.HOME, { replace: true });
            }
        };

        return (
            <div className="relative min-h-screen bg-theme_12 flex flex-col items-center justify-center">
                <JOJOModal isOpen={true} onClose={handleAlreadyGoldClose} showCloseButton={true}>
                    <div className="flex flex-col items-center gap-6 py-4">
                        <div className="relative h-12 w-42 sm:h-14 sm:w-50 flex-shrink-0">
                            <JOJOCommonImage
                                src={LOGOS.JOJO_GOLD}
                                alt={t("jojoGoldLogoAlt") || "JOJO Gold"}
                                fill
                                contentMode="contain"
                                priority
                                preset={JOJOImagePreset.Logo}
                                wrapperClassName="w-full h-full"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <h2 className="text-xl sm:text-2xl font-bold text-theme_1 text-center">
                                {t("alreadyGold") || "You are already Gold!"}
                            </h2>
                            <p className="text-theme_5 text-sm sm:text-base text-center max-w-sm mx-auto leading-relaxed">
                                {t("alreadyGoldDesc") || "You already have an active JOJO Gold subscription. Enjoy your premium content!"}
                            </p>
                        </div>
                        <FocusableProceedButton
                            focusKey="gold-already-proceed-btn"
                            onClick={handleAlreadyGoldClose}
                            size={JOJOButton.Size.L}
                            state={JOJOButton.State.ACTIVE}
                            className="mt-2 rounded-full px-10 w-full max-w-[240px]"
                            style={{
                                background: "linear-gradient(135deg, var(--theme_13) 0%, #d4530d 100%)",
                            }}
                        >
                            {returnWatchAssetId ? (t("startWatching") || "Start Watching") : (t("goHome") || "Go to Home")}
                        </FocusableProceedButton>
                    </div>
                </JOJOModal>
            </div>
        );
    }

    if (isSubLoading) {
        return <Loading />;
    }

    if (showQrPage) {
        return (
            <SubscriptionQrPage
                products={products}
                selectedProduct={selectedProduct}
                onSelectProduct={setSelectedProductId}
            />
        );
    }

    if (isLoading) {
        return <Loading />;
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-theme_12 flex flex-col justify-between">
            <div
                id="page-focus-entry"
                data-focuskey={selectedProduct ? `plan-card-${selectedProduct.productId}` : "subscription-proceed-btn"}
                className="relative z-10 flex-1 flex flex-col items-center justify-center pt-32 sm:pt-36 lg:pt-40 px-4 sm:px-6 lg:px-8 py-8 md:py-12 lg:py-16"
            >
                <div className="flex flex-col lg:flex-row items-center justify-center gap-12 xl:gap-20 w-full max-w-full mx-auto">
                    <div className="hidden lg:flex relative w-full max-w-[480px] xl:max-w-[740px] aspect-[4/3] h-[35rem] rounded-3xl overflow-hidden bg-theme_12 border border-theme_1/5 items-center justify-center flex-shrink-0 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
                        {plansData?.headerMediaUrl ? (
                            plansData.headerMediaUrl.endsWith(".mp4") || plansData.headerMediaUrl.includes(".m3u8") ? (
                                <JOJOCommonVideo
                                    src={plansData.headerMediaUrl}
                                    fill
                                    autoPlay
                                    muted
                                    loop
                                    playsInline
                                    contentMode="cover"
                                    wrapperClassName="absolute inset-0 w-full h-full"
                                />
                            ) : (
                                <JOJOCommonImage
                                    src={plansData.headerMediaUrl}
                                    alt="Header Media"
                                    fill
                                    contentMode="cover"
                                    wrapperClassName="absolute inset-0 w-full h-full"
                                />
                            )
                        ) : null}
                    </div>
                    <div className="flex flex-col items-center w-full max-w-[520px] gap-6 sm:gap-8">
                        <div className="relative h-10 w-42 sm:h-14 sm:w-50 md:h-16 md:w-56 flex-shrink-0">
                            <JOJOCommonImage
                                src={LOGOS.JOJO_GOLD}
                                alt={t("jojoGoldLogoAlt")}
                                fill
                                contentMode="contain"
                                priority
                                wrapperClassName="w-full h-full"
                            />
                        </div>
                        <div className="relative w-full h-6 sm:h-8 flex items-center justify-center flex-shrink-0">
                            <JOJOCommonImage
                                src={LOGOS.LIMITED_OFFER}
                                alt={t("limitedOfferAlt")}
                                fill
                                contentMode="contain"
                                priority
                                wrapperClassName="w-full h-full"
                            />
                        </div>

                        {/* Dynamic Feature Icons Row from the selected plan */}
                        <div className="w-full flex justify-between sm:justify-evenly px-2">
                            {selectedProduct?.features?.map((feature, idx) => (
                                <div key={feature.featureId || idx} className="flex flex-col items-center text-center gap-2">
                                    <div className="relative w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
                                        <JOJOCommonImage
                                            src={feature?.featureImageUrl}
                                            alt={feature?.featureName}
                                            fill
                                            contentMode="contain"
                                            wrapperClassName="w-full h-full"
                                        />
                                    </div>
                                    <p className="gold-text-gradient font-medium text-[10px] sm:text-xs leading-snug whitespace-pre-line tracking-wide">
                                        {feature.featureName.replace("Upto", "upto")}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* ── Plan Cards ── */}
                        <div
                            className={`
                                w-full mt-8
                                ${products.length >= 3 ? "flex flex-col gap-4" : "flex gap-4 sm:gap-6"}
                            `}
                        >
                            {products?.map((product) => {
                                const isSelected = product.productId === selectedProduct?.productId;
                                const sku = product.skus?.[0];
                                if (!sku) return null;

                                // Calculate prices dynamically and format floating point savings
                                const originalPrice = Math.round(sku.price * (1 + product.displayMarkupPercent / 100));
                                const savings = Math.max(0, Math.round((originalPrice - sku.price) * 100) / 100);

                                // Extract tag badge details if any (only show if card is selected)
                                const badge = isSelected ? sku.offer?.tagName : null;
                                const isMultiMonth = product.validityCount > 1;
                                const has3OrMorePlans = products.length >= 3;

                                // Custom classes based on selected plan state
                                const cardStyleClass = isSelected
                                    ? isMultiMonth
                                        ? "border-4 border-[#FAAF3F] bg-gradient-to-b from-[#281a0f] to-[#140d07] shadow-[0_12px_40px_rgba(250,175,63,0.2)]"
                                        : "border-4 border-[#f26e21] shadow-[0_12px_40px_rgba(242,110,33,0.2)]"
                                    : isMultiMonth
                                        ? "border border-[#342214] bg-[#1a110a] opacity-80 hover:opacity-100"
                                        : "border border-[#2d190f] bg-[#170d08] opacity-80 hover:opacity-100";

                                // Conditionally flatten card corners when badge is active
                                const cardRoundingClass = badge
                                    ? has3OrMorePlans
                                        ? "rounded-3xl rounded-tr-none"
                                        : "rounded-3xl rounded-tl-none"
                                    : "rounded-3xl";

                                return (
                                    <FocusablePlanCard
                                        key={product?.productId}
                                        focusKey={`plan-card-${product?.productId}`}
                                        product={product}
                                        isSelected={isSelected}
                                        isMultiMonth={isMultiMonth}
                                        has3OrMorePlans={has3OrMorePlans}
                                        badge={badge}
                                        cardStyleClass={cardStyleClass}
                                        cardRoundingClass={cardRoundingClass}
                                        onClick={() => {
                                            setSelectedProductId(product?.productId);
                                            try {
                                                analyticsService.track(EVENT_NAMES.SVOD_PLAN_SELECTED, {
                                                    product_id: product?.productId,
                                                    plan_name: product?.name || product?.label || '',
                                                    price: product?.skus?.[0]?.price,
                                                });
                                            } catch (e) {}
                                        }}
                                    >
                                        {/* Top Badge */}
                                        {badge && (
                                            <motion.span
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                                className={`
                                                    absolute -top-[32px] px-5 py-2 z-10 rounded-t-xl text-[10px] sm:text-xs font-bold premium-badge-bg text-theme_12 tracking-wide uppercase
                                                    ${has3OrMorePlans ? "right-[-2.4px]" : "left-[-4px]"}
                                                `}
                                            >
                                                {badge}
                                            </motion.span>
                                        )}

                                        {has3OrMorePlans ? (
                                            <>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-theme_1 text-base sm:text-lg font-medium tracking-wide">
                                                        {product.label}
                                                    </span>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-theme_7 text-base sm:text-lg line-through font-normal">
                                                            {sku.currencySymbol}{formatPrice(originalPrice)}
                                                        </span>
                                                        <span className="text-theme_1 text-xl sm:text-2xl font-bold tracking-tight">
                                                            {sku.currencySymbol}{formatPrice(sku.price)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex-shrink-0">
                                                    <span
                                                        className={`
                                                            inline-flex px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold
                                                            ${isMultiMonth ? "text-theme_12" : "text-theme_13"}
                                                        `}
                                                        style={{
                                                            background: isMultiMonth
                                                                ? "var(--gold-text-gradient)"
                                                                : "var(--theme_12_15_samecolor, rgba(242, 110, 33, 0.15))"
                                                        }}
                                                    >
                                                        {product.priceDisplayNote} {sku.currencySymbol}{formatPrice(savings)}
                                                    </span>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                {/* Plan Name */}
                                                <span className="text-theme_1 text-base sm:text-lg font-medium tracking-wide">
                                                    {product.validityDays === 365
                                                        ? t("yearlyPlan")
                                                        : product.validityDays === 30
                                                            ? t("monthlyPlan")
                                                            : product.name}
                                                </span>

                                                {/* Pricing Block */}
                                                <div className="flex items-baseline gap-2 w-full">
                                                    <span className="text-theme_7 text-lg sm:text-xl line-through font-normal">
                                                        {sku.currencySymbol}{formatPrice(originalPrice)}
                                                    </span>
                                                    <span className="text-theme_1 text-2xl sm:text-3xl font-bold tracking-tight">
                                                        {sku.currencySymbol}{formatPrice(sku.price)}
                                                    </span>
                                                </div>

                                                {/* Savings Pill */}
                                                <div className="mt-1">
                                                    <span
                                                        className={`
                                                            inline-flex px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold
                                                            ${isMultiMonth ? "text-theme_12" : "text-theme_13"}
                                                        `}
                                                        style={{
                                                            background: isMultiMonth
                                                                ? "var(--gold-text-gradient)"
                                                                : "var(--theme_12_15_samecolor, rgba(242, 110, 33, 0.15))"
                                                        }}
                                                    >
                                                        {product.priceDisplayNote} {sku.currencySymbol}{formatPrice(savings)}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </FocusablePlanCard>
                                );
                            })}
                        </div>

                        {/* ── CTA Button ──────────────────────────────────── */}
                        <FocusableProceedButton
                            id="subscription-proceed-btn"
                            focusKey="subscription-proceed-btn"
                            upKey={selectedProduct ? `plan-card-${selectedProduct.productId}` : undefined}
                            onClick={() => {
                                try {
                                    if (selectedProduct) {
                                        analyticsService.track(EVENT_NAMES.SVOD_PURCHASE_STARTED, {
                                            product_id: selectedProduct.productId,
                                            price: selectedProduct.skus?.[0]?.price,
                                        });

                                        // Save selected plan in sessionStorage and redirect to checkout
                                        sessionStorage.setItem("selected_payment_plan", JSON.stringify(selectedProduct));
                                        safeNavigate(router, ROUTES.PAYMENT);
                                    }
                                } catch (e) { }
                            }}
                            className="
                                w-full
                                h-12 sm:h-13
                                rounded-full
                                body-sm-semibold
                                text-theme_2_same_colour
                                cursor-pointer
                                transition-all duration-300
                                hover:scale-[1.02] hover:shadow-[0_0_32px_rgba(242,110,33,0.35)]
                                active:scale-[0.98]
                            "
                            style={{
                                background:
                                    "linear-gradient(135deg, var(--theme_13) 0%, #d4530d 100%)",
                            }}
                        >
                            {t("proceedToPay", { amount: (selectedProduct?.skus?.[0]?.currencySymbol ?? "₹") + formatPrice(selectedProduct?.skus?.[0]?.price ?? 0) })}
                        </FocusableProceedButton>
                        {currencyNote && (
                            <p className="text-center text-[11px] sm:text-xs text-theme_7 mt-2 tracking-wide">
                                {currencyNote}
                            </p>
                        )}
                    </div>
                </div>
            </div>
            <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-10 lg:px-0 pb-12 flex flex-col gap-3 text-left">

                {plansData?.footerNote && (
                    <p 
                        className="caption-sm-regular text-theme_7 m-0 mt-2 leading-relaxed max-w-5xl whitespace-pre-line"
                        dangerouslySetInnerHTML={{ __html: renderFooterNote(plansData.footerNote) }}
                    />
                )}
            </div>

            <div className="absolute top-[40%] left-0 w-[950px] h-[750px] rounded-full bg-[var(--theme_13)] opacity-[0.14] blur-[130px] pointer-events-none -translate-x-1/2" />
            <div className="absolute bottom-[40%] right-0 w-[1050px] h-[750px] rounded-full bg-[var(--theme_13)] opacity-[0.14] blur-[130px] pointer-events-none translate-x-1/2" />
        </div>
    );
}

function renderFooterNote(text: string): string {
    if (!text) return "";
    
    let formatted = text;
    
    // Replace "Terms of Use"
    formatted = formatted.replace(
        /Terms of Use/gi,
        `<a href="/terms-conditions" target="_blank" class="hover:underline font-semibold" style="color: var(--theme_13_samecolour, #F26E21); font-weight: 600;">Terms of Use</a>`
    );
    
    // Replace "Terms & Conditions"
    formatted = formatted.replace(
        /Terms & Conditions/gi,
        `<a href="/terms-conditions" target="_blank" class="hover:underline font-semibold" style="color: var(--theme_13_samecolour, #F26E21); font-weight: 600;">Terms & Conditions</a>`
    );
    
    // Replace "Privacy Statement"
    formatted = formatted.replace(
        /Privacy Statement/gi,
        `<a href="/privacy-policy" target="_blank" class="hover:underline font-semibold" style="color: var(--theme_13_samecolour, #F26E21); font-weight: 600;">Privacy Statement</a>`
    );

    // Replace "Privacy Policy"
    formatted = formatted.replace(
        /Privacy Policy/gi,
        `<a href="/privacy-policy" target="_blank" class="hover:underline font-semibold" style="color: var(--theme_13_samecolour, #F26E21); font-weight: 600;">Privacy Policy</a>`
    );

    // Replace Gujarati equivalents
    formatted = formatted.replace(
        /નિયમો અને શરતો/gi,
        `<a href="/terms-conditions" target="_blank" class="hover:underline font-semibold" style="color: var(--theme_13_samecolour, #F26E21); font-weight: 600;">નિયમો અને શરતો</a>`
    );

    formatted = formatted.replace(
        /ઉપયોગની શરતો/gi,
        `<a href="/terms-conditions" target="_blank" class="hover:underline font-semibold" style="color: var(--theme_13_samecolour, #F26E21); font-weight: 600;">ઉપયોગની શરતો</a>`
    );

    formatted = formatted.replace(
        /ગોપનીયતા નીતિ/gi,
        `<a href="/privacy-policy" target="_blank" class="hover:underline font-semibold" style="color: var(--theme_13_samecolour, #F26E21); font-weight: 600;">ગોપનીયતા નીતિ</a>`
    );

    formatted = formatted.replace(
        /ગોપનીયતા નિવેદન/gi,
        `<a href="/privacy-policy" target="_blank" class="hover:underline font-semibold" style="color: var(--theme_13_samecolour, #F26E21); font-weight: 600;">ગોપનીયતા નિવેદન</a>`
    );

    return formatted;
}

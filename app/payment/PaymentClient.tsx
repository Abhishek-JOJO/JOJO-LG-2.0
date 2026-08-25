"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { ChevronLeft, ChevronDown, Eye, EyeOff, CreditCard, Smartphone, Check } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useToastStore } from "@/store/useToastStore";
import { useGeoAvailability } from "@/features/geo/hooks/useGeoAvailability";
import {
  usePaymentHandler,
  getPricingData,
  checkCardRecurringEligibility,
} from "@/features/subscription/hooks/usePaymentHandler";
import { useRazorpaySDK } from "@/features/subscription/hooks/useRazorpaySDK";
import PhoneCollectModal from "@/components/payment/PhoneCollectModal";
import PaymentProcessingOverlay from "@/components/payment/PaymentProcessingOverlay";
import UpiIntentOptions from "@/components/payment/UpiIntentOptions";
import { getAssetTypeSlug, slugify } from "@/features/asset/store/useAssetDetailStore";


import { useAsset } from "@/features/content/hooks/useAsset";
import { useAssetPricing } from "@/features/content/hooks/useAssetPricing";
import { transformTVODToPaymentPlan } from "@/lib/utils/tvodPaymentTransformer";
import { useGuestPopupStore } from "@/store/useGuestPopupStore";
import { ASSET_CATEGORY_CODE } from "@/features/content/model/types";
import { ROUTES } from "@/lib/constants/routes";
import { analyticsService, EVENT_NAMES } from "@/shared/analytics";

enum PaymentMethod {
  UPI = "upi",
  CARD = "card",
}

export default function PaymentPage() {
  const router = useRouter();
  const { show: showToast } = useToastStore();
  const { countryCode } = useGeoAvailability();

  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const isGuest = user?.isGuest ?? false;

  const isOverseasUser = countryCode ? countryCode !== "IN" : false;

  // Razorpay SDK & UPI App Detection
  const { supportedUpiApps, isDetecting: isDetectingUpiApps } = useRazorpaySDK();

  const {
    preparePayment,
    executePayment,
    isProcessing,
    isPreparing,
    pollingAttempt,
    showProcessingOverlay,
    overlayError,
    cleanupPaymentState,
  } = usePaymentHandler();

  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);

  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const queryAssetId = searchParams?.get("assetId");

  const shouldFetchTvod = !!queryAssetId && !selectedPlan;

  const { data: assetData, isLoading: isAssetLoading, error: assetError } = useAsset(
    queryAssetId || "",
    shouldFetchTvod
  );

  const { data: pricingDataUrl, isLoading: isPricingLoading, error: pricingError } = useAssetPricing(
    queryAssetId || "",
    countryCode || "IN",
    shouldFetchTvod
  );

  const [activeMethod, setActiveMethod] = useState<PaymentMethod>(PaymentMethod.UPI);

  // UPI Flow Type: "intent" (app deep-link) or "vpa" (manual UPI ID)
  const [upiFlowType, setUpiFlowType] = useState<"intent" | "vpa">("intent");
  const [selectedIntentApp, setSelectedIntentApp] = useState<string | null>(null);
  const [upiId, setUpiId] = useState("");
  const [upiError, setUpiError] = useState("");

  const [card, setCard] = useState({
    number: "",
    month: "",
    year: "",
    cvv: "",
    name: "",
  });
  const [showCvv, setShowCvv] = useState(false);
  const [expiryDisplay, setExpiryDisplay] = useState("");
  const [cardErrors, setCardErrors] = useState({
    number: "",
    expiry: "",
    cvv: "",
    name: "",
  });

  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(true);
  const [intentRedirectApp, setIntentRedirectApp] = useState<string | null>(null);

  // TVOD already-purchased intercept
  const [showTvodAlreadyPurchased, setShowTvodAlreadyPurchased] = useState(false);
  const [tvodPurchaseInfo, setTvodPurchaseInfo] = useState<{
    title: string;
    daysLeft: string;
    landscapeImage: string | null;
    assetId: string;
  } | null>(null);

  useEffect(() => {
    const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : '';
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const isMobile = mobileRegex.test(userAgent);
    setIsMobileDevice(isMobile);

    if (!isMobile) {
      setUpiFlowType("vpa");
    }
  }, []);

  // Initialize selected plan from either sessionStorage or server-loaded TVOD details
  useEffect(() => {
    if (queryAssetId) {
      if (isAssetLoading || isPricingLoading) {
        setLoadingPlan(true);
        return;
      }

      if (assetError || pricingError) {
        console.error("[PaymentClient] Error loading TVOD:", { assetError, pricingError });
        showToast("Failed to load content details. Please try again.", "error");
        router.replace(ROUTES.SUBSCRIPTION);
        setLoadingPlan(false);
        return;
      }

      if (assetData && pricingDataUrl) {
        console.log("[PaymentClient] Loaded TVOD data:", { assetData, pricingDataUrl });
        // Validate if it is actually a TVOD asset (category code 3 is TVOD)
        const isTvod = assetData.assetCategoryCode === ASSET_CATEGORY_CODE.TVOD;
        console.log("[PaymentClient] Category Check:", { isTvod, code: assetData.assetCategoryCode, TVOD: ASSET_CATEGORY_CODE.TVOD });
        if (!isTvod) {
          showToast("Invalid content category.", "error");
          router.replace(ROUTES.SUBSCRIPTION);
          setLoadingPlan(false);
          return;
        }

        // ── Already purchased — intercept before payment form is ever shown ──
        if (pricingDataUrl.isUserPurchased) {
          console.log("[PaymentClient] TVOD already purchased, showing purchased modal", {
            title: assetData.title,
            daysLeft: pricingDataUrl.daysLeft,
          });
          setTvodPurchaseInfo({
            title: assetData.title,
            daysLeft: pricingDataUrl.daysLeft,
            landscapeImage: assetData.landscape?.url ?? assetData.poster?.url ?? null,
            assetId: assetData.assetId,
          });
          setShowTvodAlreadyPurchased(true);
          setLoadingPlan(false);
          return;
        }

        const tvodPlan = transformTVODToPaymentPlan(pricingDataUrl, assetData);
        console.log("[PaymentClient] Transformed plan:", tvodPlan);
        if (tvodPlan) {
          setSelectedPlan(tvodPlan);
        } else {
          showToast("Failed to prepare payment plan.", "error");
          router.replace(ROUTES.SUBSCRIPTION);
        }
        setLoadingPlan(false);
        return;
      }
    }

    try {
      const savedPlan = sessionStorage.getItem("selected_payment_plan");
      if (savedPlan) {
        setSelectedPlan(JSON.parse(savedPlan));
      } else if (!queryAssetId) {
        showToast("Please select a plan first", "error");
        router.replace(ROUTES.SUBSCRIPTION);
      }
    } catch (e) {
      console.error(e);
      if (!queryAssetId) {
        router.replace(ROUTES.SUBSCRIPTION);
      }
    } finally {
      if (!queryAssetId) {
        setLoadingPlan(false);
      }
    }
  }, [
    queryAssetId,
    assetData,
    pricingDataUrl,
    isAssetLoading,
    isPricingLoading,
    assetError,
    pricingError,
    router,
    showToast
  ]);

  // Intercept browser back actions to show exit confirmation popup — only when plan exists
  useEffect(() => {
    if (!selectedPlan) return;

    window.history.pushState(null, "", window.location.href);

    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
      setShowExitConfirm(true);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [selectedPlan]);

  // Overseas users cannot use UPI — default to card
  useEffect(() => {
    if (isOverseasUser) {
      setActiveMethod(PaymentMethod.CARD);
    }
  }, [isOverseasUser]);

  // Warn user before leaving if processing payment
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isProcessing) {
        e.preventDefault();
        e.returnValue = "Payment is currently processing. Leaving now may result in subscription failure.";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isProcessing]);

  const pricingData = getPricingData(selectedPlan);

  // Debug helper
  const DEBUG = process.env.NODE_ENV === 'development';
  const debugLog = (...args: any[]) => {
    if (DEBUG) console.log(...args);
  };

  // Pre-prepare payment order ID in the background to ensure browser gesture compliance
  useEffect(() => {
    if (isGuest) return;
    const storedPhone = typeof window !== 'undefined' ? (localStorage.getItem("user_phone") || user?.phone) : user?.phone;
    if (selectedPlan && storedPhone && activeMethod) {
      debugLog("🔄 Pre-preparing payment in background for gesture compliance...");
      preparePayment(selectedPlan, activeMethod).catch((err) => {
        console.warn("⚠️ Failed to pre-prepare payment:", err);
      });
    }
  }, [selectedPlan, activeMethod, user?.phone, isGuest]);

  // Luhn algorithm for card validation
  const luhnCheck = (num: string) => {
    const digits = num.replace(/\s/g, "").split("").reverse();
    let sum = 0;
    digits.forEach((d, i) => {
      let n = parseInt(d);
      if (i % 2 === 1) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
    });
    return sum % 10 === 0;
  };

  const validateCard = () => {
    const errors = { number: "", expiry: "", cvv: "", name: "" };
    let valid = true;

    const rawNumber = card.number.replace(/\s/g, "");
    if (!rawNumber) {
      errors.number = "Card number is required";
      valid = false;
    } else if (rawNumber.length < 15 || rawNumber.length > 16) {
      errors.number = "Card number must be 15–16 digits";
      valid = false;
    } else if (!luhnCheck(rawNumber)) {
      errors.number = "Invalid card number";
      valid = false;
    }

    if (!card.month || !card.year) {
      errors.expiry = "Expiry date is required";
      valid = false;
    } else {
      const month = parseInt(card.month);
      const year = parseInt("20" + card.year);
      const now = new Date();
      const expiry = new Date(year, month - 1, 1);
      if (month < 1 || month > 12) {
        errors.expiry = "Invalid month (01–12)";
        valid = false;
      } else if (expiry < new Date(now.getFullYear(), now.getMonth(), 1)) {
        errors.expiry = "Card has expired";
        valid = false;
      }
    }

    if (!card.cvv) {
      errors.cvv = "CVV is required";
      valid = false;
    } else if (card.cvv.length < 3) {
      errors.cvv = "CVV must be 3–4 digits";
      valid = false;
    }

    if (!card.name.trim()) {
      errors.name = "Cardholder name is required";
      valid = false;
    } else if (card.name.trim().length < 2) {
      errors.name = "Enter a valid name";
      valid = false;
    }

    setCardErrors(errors);
    return valid;
  };

  const isSVOD = pricingData?.type === "SVOD";
  const planName = isSVOD
    ? selectedPlan?.name || "Premium Plan"
    : selectedPlan?.oProductTranslation?.sTitle || selectedPlan?.name || "Premium Content";

  const durationText =
    selectedPlan?.validityDays === 365
      ? "Yearly Plan"
      : selectedPlan?.validityDays === 30
        ? "Monthly Plan"
        : selectedPlan?.label ||
        (selectedPlan?.validityDays
          ? `${Math.round(selectedPlan.validityDays / 30)} Months`
          : selectedPlan?.name || "Plan");

  const badgeText =
    selectedPlan?.skus?.[0]?.offer?.tagName ||
    (selectedPlan?.displayMarkupPercent > 0
      ? `${selectedPlan.displayMarkupPercent}% OFF`
      : null);

  const price = pricingData?.price ?? 0;
  const currencySymbol = pricingData?.currencySymbol ?? "₹";

  // Calculate duration in months for per month calculation
  let durationInMonths = 1;
  if (selectedPlan?.validityDays) {
    durationInMonths = Math.round(selectedPlan.validityDays / 30) || 1;
  } else if (selectedPlan?.validityCount && selectedPlan?.validityType === "MONTH") {
    durationInMonths = selectedPlan.validityCount;
  }

  const perMonthPrice = Math.round(price / durationInMonths);
  const perMonthText = durationInMonths > 1 ? `${currencySymbol}${perMonthPrice} per month` : `${currencySymbol}${price} per month`;

  const featuresToRender = selectedPlan?.features || [];

  const buildWebPaymentMethodPayload = (intentName: string) => {
    const payload: Record<string, any> = {
      intent_name: intentName,
      payment_method: "upi_intent",
      plan_type: isSVOD ? "SVOD" : "TVOD",
      plan_id: selectedPlan?.id || selectedPlan?._id || selectedPlan?.planId || selectedPlan?.sku,
      plan_name: planName,
      price: pricingData?.price,
      currency: pricingData?.currencySymbol || "₹",
      validity_days: selectedPlan?.validityDays,
    };

    if (!isSVOD) {
      payload.content_id = selectedPlan?.assetMetadata?.assetId || queryAssetId;
      payload.content_title = selectedPlan?.assetMetadata?.title || planName;
      payload.content_type = selectedPlan?.assetMetadata?.assetType;
      payload.release_date = selectedPlan?.assetMetadata?.releaseDate;
      payload.certification = selectedPlan?.assetMetadata?.certification;
      payload.duration_seconds = selectedPlan?.assetMetadata?.durationSeconds;
      payload.tvod_info_items = selectedPlan?.oProductTranslation?.aInfoItems || [];
    }

    return payload;
  };

  const trackPaymentMethodFailure = (basePayload: Record<string, any>, errorMsg: string, errorCode?: string) => {
    try {
      const failurePayload = {
        ...basePayload,
        error_message: errorMsg,
        error_code: errorCode || "PAYMENT_FAILED",
      };
      analyticsService.track(EVENT_NAMES.WEB_PAYMENT_METHOD_FAILURE, failurePayload);
    } catch (e) {
      console.warn("⚠️ Failed to track web_payment_method_failure analytics:", e);
    }
  };

  const trackPaymentMethodSuccess = (basePayload: Record<string, any>, resData?: any) => {
    try {
      const successPayload = {
        ...basePayload,
        transaction_id: resData?.razorpay_payment_id || resData?.payment_id || resData?.sTransactionId,
        order_id: resData?.razorpay_order_id || resData?.order_id,
        payment_id: resData?.razorpay_payment_id || resData?.payment_id,
      };
      analyticsService.track(EVENT_NAMES.WEB_PAYMENT_METHOD_SUCCESS, successPayload);
    } catch (e) {
      console.warn("⚠️ Failed to track web_payment_method_success analytics:", e);
    }
  };

  const handlePaymentClick = async () => {
    if (!pricingData) return;

    if (isGuest) {
      useGuestPopupStore.getState().openGuestPopup();
      return;
    }

    debugLog("💳 Payment initiated with method:", activeMethod);

    if (activeMethod === PaymentMethod.UPI) {
      if (upiFlowType === "vpa") {
        // Traditional VPA validation
        if (!upiId) {
          setUpiError("UPI ID is required");
          return;
        }
        if (!upiId.includes("@")) {
          setUpiError("Enter valid UPI ID (example: name@bank)");
          return;
        }
        setUpiError("");
        debugLog("✅ VPA mode - UPI ID validated:", upiId);
      } else {
        // Intent flow - app must be selected
        if (!selectedIntentApp) {
          setUpiError("Please select a UPI app to proceed");
          return;
        }
        setUpiError("");
        debugLog("✅ Intent mode - Selected app:", selectedIntentApp);
        debugLog("📱 Available apps:", supportedUpiApps.map(a => a.name));
      }
    }

    if (activeMethod === PaymentMethod.CARD) {
      if (!validateCard()) return;

      // Card Mandate Check (SVOD only)
      if (pricingData.type === "SVOD") {
        const eligibility = await checkCardRecurringEligibility(card.number, token);
        if (!eligibility.eligible) {
          setCardErrors((prev) => ({ ...prev, number: eligibility.error ?? "Card not eligible" }));
          return;
        }
      }
    }

    // Phone collect gate check
    const storedPhone = localStorage.getItem("user_phone") || user?.phone;
    if (!storedPhone) {
      setShowPhoneModal(true);
      return;
    }

    const isIntentFlow = activeMethod === PaymentMethod.UPI && upiFlowType === "intent" && selectedIntentApp;
    const intentName = isIntentFlow
      ? supportedUpiApps.find(a => a.name === selectedIntentApp || a.package === selectedIntentApp)?.displayName || selectedIntentApp
      : null;
    const basePayload = intentName ? buildWebPaymentMethodPayload(intentName) : null;

    if (basePayload) {
      try {
        analyticsService.track(EVENT_NAMES.WEB_PAYMENT_METHOD, basePayload);
      } catch (e) {}
    }

    // Start payment process
    let data;
    try {
      data = await preparePayment(selectedPlan, activeMethod);
    } catch (prepErr: any) {
      const errMsg = prepErr?.message || "Failed to prepare payment";
      if (basePayload) trackPaymentMethodFailure(basePayload, errMsg, "PREPARE_PAYMENT_FAILED");
      return;
    }

    if (!data?.oOrderDetails) {
      const errMsg = "Failed to obtain payment order details";
      if (basePayload) trackPaymentMethodFailure(basePayload, errMsg, "MISSING_ORDER_DETAILS");
      return;
    }

    const paymentDetails = {
      upiId: activeMethod === PaymentMethod.UPI && upiFlowType === "vpa" ? upiId : null,
      card: activeMethod === PaymentMethod.CARD ? card : null,
    };

    // Show intent redirect overlay
    const intentAppDisplayName = isIntentFlow
      ? supportedUpiApps.find(a => a.name === selectedIntentApp)?.displayName || "UPI App"
      : null;
    if (isIntentFlow && intentAppDisplayName) {
      setIntentRedirectApp(intentAppDisplayName);
    }

    try {
      const execResult: any = await executePayment(
        selectedPlan,
        activeMethod,
        paymentDetails,
        pricingData,
        data,
        upiFlowType === "intent" ? selectedIntentApp : null // Pass intent app for deep-linking
      );
      if (basePayload) trackPaymentMethodSuccess(basePayload, execResult);
    } catch (err: any) {
      console.error("Razorpay widget execution failed:", err);
      const errMsg = err?.message || err?.error?.description || "Payment failed";
      if (basePayload) trackPaymentMethodFailure(basePayload, errMsg, err?.code || "EXECUTION_FAILED");
    } finally {
      setIntentRedirectApp(null);
    }
  };

  const handleUpiAppSelectAndPay = async (appPackage: string) => {
    setSelectedIntentApp(appPackage);
    setUpiError("");

    // Determine intent display name (e.g., "Google Pay", "PhonePe", etc.)
    const intentName = supportedUpiApps.find(a => a.name === appPackage || a.package === appPackage)?.displayName || appPackage;
    const basePayload = buildWebPaymentMethodPayload(intentName);

    // Track web_payment_method analytics event with intent name & plan/TVOD details
    try {
      analyticsService.track(EVENT_NAMES.WEB_PAYMENT_METHOD, basePayload);
    } catch (err) {
      console.warn("⚠️ Failed to track web_payment_method analytics:", err);
    }

    if (!pricingData) return;

    if (isGuest) {
      useGuestPopupStore.getState().openGuestPopup();
      return;
    }

    // Phone collect gate check
    const storedPhone = typeof window !== 'undefined' ? (localStorage.getItem("user_phone") || user?.phone) : user?.phone;
    if (!storedPhone) {
      setShowPhoneModal(true);
      return;
    }

    // Start payment process
    let data;
    try {
      data = await preparePayment(selectedPlan, activeMethod);
    } catch (prepErr: any) {
      const errMsg = prepErr?.message || "Failed to prepare payment";
      trackPaymentMethodFailure(basePayload, errMsg, "PREPARE_PAYMENT_FAILED");
      return;
    }

    if (!data?.oOrderDetails) {
      const errMsg = "Failed to obtain payment order details";
      trackPaymentMethodFailure(basePayload, errMsg, "MISSING_ORDER_DETAILS");
      return;
    }

    const paymentDetails = {
      upiId: null,
      card: null,
    };

    // Show intent redirect overlay
    const appDisplayName = supportedUpiApps.find(a => a.name === appPackage)?.displayName || "UPI App";
    setIntentRedirectApp(appDisplayName);

    try {
      const execResult: any = await executePayment(
        selectedPlan,
        activeMethod,
        paymentDetails,
        pricingData,
        data,
        appPackage
      );
      trackPaymentMethodSuccess(basePayload, execResult);
    } catch (err: any) {
      console.error("Razorpay widget execution failed:", err);
      const errMsg = err?.message || err?.error?.description || "Payment failed";
      trackPaymentMethodFailure(basePayload, errMsg, err?.code || "EXECUTION_FAILED");
    } finally {
      setIntentRedirectApp(null);
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 16) value = value.slice(0, 16);
    const formatted = value.replace(/(\d{4})/g, "$1 ").trim();
    setCard({ ...card, number: formatted });
    if (cardErrors.number) setCardErrors({ ...cardErrors, number: "" });
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    let digits = raw.replace(/\D/g, "");
    if (digits.length > 4) digits = digits.slice(0, 4);

    let formatted = digits;
    if (digits.length >= 2) {
      formatted = digits.slice(0, 2) + "/" + digits.slice(2);
    }

    setExpiryDisplay(formatted);
    const split = digits.length >= 2 ? [digits.slice(0, 2), digits.slice(2)] : [digits, ""];
    setCard({
      ...card,
      month: split[0] || "",
      year: split[1] || "",
    });
    if (cardErrors.expiry) setCardErrors({ ...cardErrors, expiry: "" });
  };

  // ── TVOD Already Purchased Modal — early return before loading guard ──────
  if (showTvodAlreadyPurchased && tvodPurchaseInfo) {
    return (
      <div className="min-h-screen bg-theme_12 flex items-center justify-center px-4">
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.06] blur-[120px] pointer-events-none" style={{ background: 'var(--theme_13, #F26E21)' }} />

        <div
          className="relative w-full max-w-[440px] rounded-[24px] border-2 border-transparent overflow-hidden shadow-2xl animate-fadeIn"
          style={{
            background: 'linear-gradient(var(--theme_10, #191919), var(--theme_10, #191919)) padding-box, linear-gradient(251.25deg, rgba(255,255,255,0.25) 1.71%, rgba(255,255,255,0.04) 51.72%, rgba(255,255,255,0.25) 101.72%) border-box'
          }}
        >
          {/* Asset landscape thumbnail */}
          {tvodPurchaseInfo.landscapeImage && (
            <div className="relative w-full aspect-video overflow-hidden">
              <img
                src={tvodPurchaseInfo.landscapeImage}
                alt={tvodPurchaseInfo.title}
                className="w-full h-full object-cover"
              />
              {/* Gradient overlay so the card content blends smoothly */}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, var(--theme_10, #191919) 100%)' }} />

              {/* Badge on top of image */}
              <div
                className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
                style={{
                  background: 'rgba(0,0,0,0.55)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'var(--theme_13, #F26E21)',
                }}
              >
                {/* Checkmark icon */}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Purchased
              </div>
            </div>
          )}

          {/* Card body */}
          <div className="flex flex-col items-center gap-5 px-7 pb-8 pt-6">

            {/* Check circle — shown only when no thumbnail (fallback) */}
            {!tvodPurchaseInfo.landscapeImage && (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, var(--theme_13, #F26E21) 0%, #d4530d 100%)' }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}

            {/* Title */}
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mb-2 leading-tight">
                {tvodPurchaseInfo.title}
              </h2>
              <p className="text-sm font-semibold" style={{ color: 'var(--theme_5, #ABABAB)' }}>
                You already have access to this content
              </p>
            </div>

            {/* Days remaining pill */}
            {tvodPurchaseInfo.daysLeft && (
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
                style={{
                  background: 'rgba(242, 110, 33, 0.12)',
                  border: '1px solid rgba(242, 110, 33, 0.3)',
                  color: 'var(--theme_13, #F26E21)',
                }}
              >
                {/* Clock icon */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {tvodPurchaseInfo.daysLeft} remaining
              </div>
            )}

            {/* CTAs */}
            <div className="w-full flex flex-col gap-3 mt-1">
              {/* Primary — Watch Now */}
              <button
                onClick={() => router.push(ROUTES.WATCH(tvodPurchaseInfo.assetId))}
                className="w-full py-3.5 rounded-full font-bold text-base transition-all active:scale-[0.98] hover:brightness-110 cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, var(--theme_13, #F26E21) 0%, #d4530d 100%)',
                  color: '#ffffff',
                }}
              >
                Watch Now
              </button>

              {/* Secondary — Go Home */}
              <button
                onClick={() => router.push(ROUTES.HOME)}
                className="w-full py-3 rounded-full font-semibold text-sm transition-all active:scale-[0.98] cursor-pointer"
                style={{
                  background: 'var(--theme_9, #2B2B2B)',
                  color: 'var(--theme_5, #ABABAB)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loadingPlan || !selectedPlan || !pricingData) {
    return (
      <div className="min-h-screen bg-theme_12 flex items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-theme_13 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }


  return (
    <>
      {/* Razorpay script */}
      <Script src="https://checkout.razorpay.com/v1/razorpay.js" strategy="afterInteractive" />

      {/* Phone modal collect gate */}
      {showPhoneModal && (
        <PhoneCollectModal
          onClose={() => setShowPhoneModal(false)}
          onComplete={() => {
            setShowPhoneModal(false);
            handlePaymentClick();
          }}
        />
      )}

      {/* Non-dismissible full-screen status overlay — hidden during intent redirect */}
      <PaymentProcessingOverlay
        visible={(showProcessingOverlay || isProcessing) && !intentRedirectApp}
        errorMessage={overlayError}
        showError={!!overlayError}
      />

      {/* UPI Intent Redirect Overlay with Cancel */}
      {intentRedirectApp && isProcessing && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-[10000] flex items-center justify-center animate-fadeIn"
          role="dialog"
          aria-label="UPI payment redirect"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="relative mx-4 w-full max-w-[420px] rounded-3xl p-8 shadow-2xl flex flex-col items-center border-2 border-transparent"
            style={{
              background: 'linear-gradient(var(--theme_10, #191919), var(--theme_10, #191919)) padding-box, linear-gradient(251.25deg, rgba(255, 255, 255, 0.3) 1.71%, rgba(255, 255, 255, 0.05) 51.72%, rgba(255, 255, 255, 0.3) 101.72%) border-box'
            }}
          >
            {/* Spinner */}
            <div className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin mb-6"
              style={{ borderColor: 'var(--theme_13_samecolour, #F26E21)', borderTopColor: 'transparent' }}
            />

            {/* Title */}
            <h3 className="text-xl font-bold text-white mb-2 text-center">
              Redirecting to {intentRedirectApp}
            </h3>

            {/* Description */}
            <p className="text-sm text-neutral-400 text-center leading-relaxed mb-6 max-w-[300px]">
              Connecting secure bridge to your mobile app. Please authorize the UPI transaction request.
            </p>

            {/* Warning */}
            <div className="text-xs text-amber-500 font-semibold bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full mb-6">
              Please do not close this tab
            </div>

            {/* Cancel Button */}
            <button
              onClick={() => {
                cleanupPaymentState();
                setIntentRedirectApp(null);
                showToast("Payment cancelled", "info");
              }}
              className="px-8 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-[0.97] cursor-pointer"
              style={{
                background: 'var(--theme_9, #2B2B2B)',
                color: 'var(--theme_5, #ABABAB)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Exit Confirmation Dialog Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 backdrop-blur-md px-4 animate-fadeIn">
          <div
            className="relative w-full max-w-[420px] rounded-[12px] border-2 border-transparent p-8 shadow-2xl flex flex-col items-center"
            style={{
              background: 'linear-gradient(var(--theme_10, #191919), var(--theme_10, #191919)) padding-box, linear-gradient(251.25deg, rgba(255, 255, 255, 0.3) 1.71%, rgba(255, 255, 255, 0.05) 51.72%, rgba(255, 255, 255, 0.3) 101.72%) border-box'
            }}
          >
            <h3 className="text-xl sm:text-2xl font-extrabold text-white mb-3 text-center">
              Leaving us midway?
            </h3>
            <p
              className="text-xs leading-relaxed text-center mb-6 max-w-[340px]"
              style={{ color: "var(--theme_6, #9C9C9C)" }}
            >
              You're just one step away from world's best Gujarati movies, shows on JOJO APP. Do you wish to cancel your payment?
            </p>
            <div className="w-full flex gap-3">
              <button
                onClick={() => {
                  localStorage.removeItem("payment_init_data");
                  localStorage.removeItem("payment_sToken");
                  localStorage.removeItem("payment_sProviderToken");

                  if (!isSVOD && selectedPlan?.assetMetadata) {
                    const { assetId, title, assetType } = selectedPlan.assetMetadata;
                    const typeSlug = getAssetTypeSlug(assetType);
                    const titleSlug = slugify(title);
                    const targetUrl = titleSlug ? `/${typeSlug}/${titleSlug}/${assetId}` : `/${typeSlug}/${assetId}`;
                    router.push(targetUrl);
                  } else {
                    router.push("/subscription");
                  }
                }}
                className="flex-1 py-3 rounded-full text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer"
                style={{
                  background: "var(--theme_9, #2B2B2B)",
                  color: "var(--theme_5, #ABABAB)"
                }}
              >
                Cancel & Go back
              </button>
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-3 rounded-full text-xs font-bold active:scale-[0.98] transition-all cursor-pointer"
                style={{
                  background: "var(--theme_13_samecolour, #F26E21)",
                  color: "var(--theme_2_same-colour, var(--theme_2_same_colour, #FFFFFF))"
                }}
              >
                Proceed to Pay
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative min-h-screen bg-theme_12 text-white flex flex-col pt-28 md:pt-32 px-4 pb-12 overflow-hidden justify-center items-center">
        {/* Glow effects */}
        <div className="absolute top-[30%] left-0 w-[800px] h-[600px] rounded-full bg-[var(--theme_13)] opacity-[0.08] blur-[120px] pointer-events-none -translate-x-1/2" />
        <div className="absolute bottom-[30%] right-0 w-[800px] h-[600px] rounded-full bg-[var(--theme_13)] opacity-[0.08] blur-[120px] pointer-events-none translate-x-1/2" />

        <div className={`relative z-10 w-full ${isSVOD ? "max-w-[500px]" : "max-w-[1000px] grid grid-cols-1 md:grid-cols-2 gap-8 items-start animate-fadeIn"}`}>

          {/* LEFT COLUMN: TVOD Details Card (Only shown if TVOD) */}
          {!isSVOD && (
            <div
              className="w-full rounded-[24px] border-2 border-transparent p-6 sm:p-8 shadow-2xl flex flex-col justify-between"
              style={{
                background: 'linear-gradient(var(--theme_10, #191919), var(--theme_10, #191919)) padding-box, linear-gradient(251.25deg, rgba(255, 255, 255, 0.3) 1.71%, rgba(255, 255, 255, 0.05) 51.72%, rgba(255, 255, 255, 0.3) 101.72%) border-box'
              }}
            >
              <div>
                {/* Asset Cover Image */}
                {selectedPlan?.assetMetadata?.landscapeImage && (
                  <div className="relative w-full aspect-video rounded-[12px] overflow-hidden mb-6">
                    <img
                      src={selectedPlan.assetMetadata.landscapeImage}
                      alt={planName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Category label */}
                <span
                  className="block text-xs font-black uppercase tracking-wider mb-2"
                  style={{
                    backgroundImage: "linear-gradient(44.13deg, #FAAF3F 21.63%, #FFD691 49.52%, #FAAF3F 81.68%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  {selectedPlan?.oProductTranslation?.sName || "FIRST DAY FIRST SHOW"}
                </span>

                {/* Title */}
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
                  {planName}
                </h1>

                {/* Metadata Row */}
                <div className="flex flex-wrap items-center gap-2.5 text-xs text-neutral-400 mb-6">
                  {selectedPlan?.assetMetadata?.durationSeconds > 0 && (
                    <span className="px-2.5 py-1 rounded bg-white/5 border border-white/10 font-semibold text-neutral-300">
                      {formatDuration(selectedPlan.assetMetadata.durationSeconds)}
                    </span>
                  )}
                  {selectedPlan?.assetMetadata?.releaseDate && (
                    <span className="px-2.5 py-1 rounded bg-white/5 border border-white/10 font-semibold text-neutral-300">
                      {selectedPlan.assetMetadata.releaseDate.length === 4
                        ? selectedPlan.assetMetadata.releaseDate
                        : new Date(selectedPlan.assetMetadata.releaseDate).getFullYear() || selectedPlan.assetMetadata.releaseDate}
                    </span>
                  )}
                  {selectedPlan?.assetMetadata?.certification && (
                    <span className="px-2.5 py-1 rounded bg-white/5 border border-white/10 font-semibold text-neutral-300">
                      {selectedPlan.assetMetadata.certification}
                    </span>
                  )}
                  {selectedPlan?.assetMetadata?.genres?.length > 0 && (
                    <span className="font-semibold text-neutral-300 ml-1">
                      {getGenreNames(selectedPlan.assetMetadata.genres).join(" • ")}
                    </span>
                  )}
                </div>

                {/* Info Items List */}
                <div className="space-y-4">
                  {selectedPlan?.oProductTranslation?.aInfoItems?.map((info: any, index: number) => (
                    <div
                      key={index}
                      className="rounded-[12px] p-4 flex flex-col justify-between border border-transparent"
                      style={{
                        background: 'linear-gradient(#141414, #141414) padding-box, linear-gradient(251.25deg, rgba(255, 255, 255, 0.15) 1.71%, rgba(255, 255, 255, 0.02) 51.72%, rgba(255, 255, 255, 0.15) 101.72%) border-box'
                      }}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-bold text-white tracking-wide">
                          {info.sTitle}
                        </span>
                        <span className="text-sm font-semibold text-neutral-300">
                          {info.sValue}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 font-medium">
                        {info.sDescription}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Disclaimer */}
              <p className="text-[10px] text-neutral-500 font-medium mt-8 text-center">
                By proceeding you agree to our <a href="/terms-conditions" target="_blank" className="hover:underline">Terms of Use</a>
              </p>
            </div>
          )}

          {/* RIGHT COLUMN / CHECKOUT BOX */}
          <div className="w-full bg-[var(--theme_10,#191919)] border border-white/5 rounded-[16px] p-6 sm:p-8 shadow-2xl">
            {/* Header */}
            <button
              onClick={() => {
                setShowExitConfirm(true);
              }}
              className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity mb-6 cursor-pointer text-xl font-bold"
            >
              <ChevronLeft size={24} />
              <span>Payment</span>
            </button>

            {/* Plan Summary Card (Gradient Card) - Only shown if SVOD */}
            {isSVOD && (
              <div
                className="relative rounded-[12px] p-5 mb-6 text-black"
                style={{
                  background: 'linear-gradient(44.13deg, #FAAF3F 21.63%, #FFD691 49.52%, #FAAF3F 81.68%)'
                }}
              >
                {/* Top Row: Duration */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-lg sm:text-xl font-bold text-black">{durationText}</span>
                    {badgeText && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-black text-[#FFD691] uppercase">
                        {badgeText}
                      </span>
                    )}
                  </div>
                </div>

                {/* Divider */}
                {featuresToRender.length > 0 && <div className="border-t border-black/15 my-4" />}

                {/* Features Row */}
                {featuresToRender.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {featuresToRender.map((feature: any, idx: number) => (
                      <div key={feature.featureId || idx} className="flex flex-col items-center text-center gap-2">
                        <div className="w-8 h-8 relative flex items-center justify-center">
                          {feature.featureImageUrl ? (
                            <img
                              src={feature.featureImageUrl}
                              alt={feature.featureName}
                              className="w-full h-full object-contain animate-fadeIn"
                              style={{ filter: 'brightness(0)' }}
                            />
                          ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-black">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          )}
                        </div>
                        <span className="text-[9px] sm:text-[10px] font-semibold leading-tight text-black break-words max-w-[80px]">
                          {feature.featureName?.replace("Upto", "upto")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Payment Methods */}
            <div className="space-y-4">
              {/* UPI - India Only */}
              {!isOverseasUser && (
                <div className="border-b border-white/5 pb-2">
                  <div
                    className="rounded-[12px]"
                    style={{
                      background: activeMethod === PaymentMethod.UPI ? "var(--theme_9, #2B2B2B)" : "transparent",
                      paddingLeft: activeMethod === PaymentMethod.UPI ? "1rem" : "0",
                      paddingRight: activeMethod === PaymentMethod.UPI ? "1rem" : "0",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveMethod(
                        activeMethod === PaymentMethod.UPI ? null as any : PaymentMethod.UPI
                      )}
                      className="w-full flex items-center justify-between py-4 cursor-pointer text-left focus:outline-none"
                    >
                      <div className="flex items-center gap-4">
                        {/* UPI Icon */}
                        <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                          <img src="/payment-icon/UPI.svg" alt="UPI" className="w-full h-full object-contain" />
                        </div>
                        <span className="font-bold text-white text-base">UPI</span>
                      </div>
                      <ChevronDown
                        size={20}
                        className={`text-neutral-400 ${activeMethod === PaymentMethod.UPI ? "rotate-180" : "rotate-0"
                          }`}
                      />
                    </button>

                    {activeMethod === PaymentMethod.UPI && (
                      <div className="pb-4 pt-1 space-y-4">
                        {/* Intent / VPA Toggle */}
                        {isMobileDevice && (
                          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                            <button
                              type="button"
                              onClick={() => {
                                setUpiFlowType("intent");
                                setUpiError("");
                                setUpiId("");
                              }}
                              className={`flex-1 py-2.5 px-4 rounded-full text-sm font-semibold transition-all cursor-pointer ${upiFlowType === "intent"
                                ? "bg-theme_13 text-white shadow-md"
                                : "bg-theme_9 text-theme_5 hover:text-white hover:bg-theme_9/80"
                                }`}
                            >
                              <div className="flex items-center justify-center gap-2">
                                <Smartphone size={16} />
                                <span>UPI Apps</span>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setUpiFlowType("vpa");
                                setSelectedIntentApp(null);
                                setUpiError("");
                              }}
                              className={`flex-1 py-2.5 px-4 rounded-full text-sm font-semibold transition-all cursor-pointer ${upiFlowType === "vpa"
                                ? "bg-theme_13 text-white shadow-md"
                                : "bg-theme_9 text-theme_5 hover:text-white hover:bg-theme_9/80"
                                }`}
                            >
                              UPI ID
                            </button>
                          </div>
                        )}

                        {/* Intent Apps Grid */}
                        {isMobileDevice && upiFlowType === "intent" && (
                          <div>
                            {isDetectingUpiApps ? (
                              <div className="text-center py-8">
                                <div className="w-8 h-8 border-3 border-theme_13 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                                <p className="text-xs text-theme_5">Detecting UPI apps...</p>
                              </div>
                            ) : (
                              <UpiIntentOptions
                                apps={supportedUpiApps}
                                selectedApp={selectedIntentApp}
                                onSelectApp={handleUpiAppSelectAndPay}
                                isLoading={isProcessing || isPreparing}
                              />
                            )}
                          </div>
                        )}

                        {/* Traditional VPA Input */}
                        {upiFlowType === "vpa" && (
                          <div>
                            <input
                              type="text"
                              placeholder="Enter Virtual Payment Address (e.g. name@upi)"
                              className={`w-full px-4 py-3 rounded-[8px] border ${upiError ? "border-red-500" : "border-white/10 focus:border-theme_13"
                                } text-white font-medium text-sm outline-none transition-colors bg-transparent`}
                              value={upiId}
                              onChange={(e) => {
                                setUpiId(e.target.value);
                                if (upiError) setUpiError("");
                              }}
                            />
                            <p className="text-xs text-theme_5 mt-2 px-1">
                              Example: yourname@paytm, mobile@oksbi
                            </p>
                          </div>
                        )}

                        {upiError && <p className="text-xs text-red-500 font-semibold mt-1.5 px-1">{upiError}</p>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Credit / Debit Card */}
              <div className="border-b border-white/5 pb-2">
                <div
                  className="rounded-[12px]"
                  style={{
                    background: activeMethod === PaymentMethod.CARD ? "var(--theme_9, #2B2B2B)" : "transparent",
                    paddingLeft: activeMethod === PaymentMethod.CARD ? "1rem" : "0",
                    paddingRight: activeMethod === PaymentMethod.CARD ? "1rem" : "0",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setActiveMethod(
                      activeMethod === PaymentMethod.CARD ? null as any : PaymentMethod.CARD
                    )}
                    className="w-full flex items-center justify-between py-4 cursor-pointer text-left focus:outline-none"
                  >
                    <div className="flex items-center gap-4">
                      {/* Card Icon */}
                      <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                        <img src="/payment-icon/CC.svg" alt="Credit/Debit Card" className="w-full h-full object-contain" />
                      </div>
                      <span className="font-bold text-white text-base">Credit/Debit Card</span>
                    </div>
                    <ChevronDown
                      size={20}
                      className={`text-neutral-400 ${activeMethod === PaymentMethod.CARD ? "rotate-180" : "rotate-0"
                        }`}
                    />
                  </button>

                  {activeMethod === PaymentMethod.CARD && (
                    <div className="pb-4 pt-1 space-y-3.5">
                      <div>
                        <input
                          type="text"
                          placeholder="Card Number"
                          autoComplete="off"
                          className={`w-full px-4 py-3 rounded-[8px] border ${cardErrors.number ? "border-red-500" : "border-white/10 focus:border-theme_13"
                            } text-white font-medium text-sm outline-none transition-colors bg-transparent-forced`}
                          value={card.number}
                          onChange={handleCardNumberChange}
                        />
                        {cardErrors.number && (
                          <p className="text-xs text-red-500 font-semibold mt-1 px-1">{cardErrors.number}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <input
                            type="text"
                            placeholder="MM/YY"
                            autoComplete="off"
                            className={`w-full px-4 py-3 rounded-[8px] border ${cardErrors.expiry ? "border-red-500" : "border-white/10 focus:border-theme_13"
                              } text-white font-medium text-sm outline-none transition-colors text-center bg-transparent-forced`}
                            value={expiryDisplay}
                            onChange={handleExpiryChange}
                          />
                          {cardErrors.expiry && (
                            <p className="text-xs text-red-500 font-semibold mt-1 px-1">{cardErrors.expiry}</p>
                          )}
                        </div>

                        <div>
                          <div className="relative">
                            <input
                              type={showCvv ? "text" : "password"}
                              placeholder="CVV"
                              maxLength={4}
                              autoComplete="new-password"
                              className={`w-full pl-4 pr-10 py-3 rounded-[8px] border ${cardErrors.cvv ? "border-red-500" : "border-white/10 focus:border-theme_13"
                                } text-white font-medium text-sm outline-none transition-colors text-center bg-transparent-forced`}
                              value={card.cvv}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, "");
                                setCard({ ...card, cvv: val });
                                if (cardErrors.cvv) setCardErrors({ ...cardErrors, cvv: "" });
                              }}
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                              onClick={() => setShowCvv((v) => !v)}
                              tabIndex={-1}
                            >
                              {showCvv ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                          {cardErrors.cvv && (
                            <p className="text-xs text-red-500 font-semibold mt-1 px-1">{cardErrors.cvv}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <input
                          type="text"
                          placeholder="Cardholder Name"
                          autoComplete="off"
                          className={`w-full px-4 py-3 rounded-[8px] border ${cardErrors.name ? "border-red-500" : "border-white/10 focus:border-theme_13"
                            } text-white font-medium text-sm outline-none transition-colors bg-transparent-forced`}
                          value={card.name}
                          onChange={(e) => {
                            setCard({ ...card, name: e.target.value });
                            if (cardErrors.name) setCardErrors({ ...cardErrors, name: "" });
                          }}
                        />
                        {cardErrors.name && (
                          <p className="text-xs text-red-500 font-semibold mt-1 px-1">{cardErrors.name}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action button */}
            <button
              onClick={handlePaymentClick}
              disabled={isProcessing || isPreparing}
              className="w-full mt-8 py-4 rounded-full font-semibold text-base transition-all active:scale-[0.98] cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center hover:brightness-110"
              style={{
                background: activeMethod
                  ? "var(--theme_13_samecolour, #F26E21)"
                  : "var(--theme_9, #2B2B2B)",
                color: activeMethod
                  ? "var(--theme_2_same-colour, var(--theme_2_same_colour, #FFFFFF))"
                  : "var(--theme_5, #ABABAB)"
              }}
            >
              {isPreparing ? (
                <span>Preparing Checkout...</span>
              ) : isProcessing ? (
                <span>Processing Payment...</span>
              ) : (
                `Proceed to Pay ${pricingData.currencySymbol}${pricingData.price}`
              )}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}

function formatDuration(seconds: number): string {
  if (!seconds) return "";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m`;
}

function getGenreNames(genres: any[]): string[] {
  if (!Array.isArray(genres)) return [];
  return genres.map((g: any) => {
    if (typeof g === "string") return g;
    if (g && typeof g === "object") return g.name || g.sName || g.title || "";
    return "";
  }).filter(Boolean);
}

"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useProfileStore } from "@/store/useProfileStore";
import { useToastStore } from "@/store/useToastStore";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { ApiEndpoint } from "@/enums/api.enum";
import { updateEntitlement } from "@/features/content/api/updateEntitlement";
import { logger } from "@/lib/logger/logger";
import { analyticsService } from "@/shared/analytics";
import { EVENT_NAMES } from "@/shared/analytics/constants/analytics.constants";

export interface PricingData {
  price: number;
  currency: string;
  currencySymbol: string;
  type: "SVOD" | "TVOD";
  skuId: string;
  pricing: any;
  billingCycle: string;
  duration: number;
  maxAmount?: number;
}

export const getPricingData = (selectedPlan: any): PricingData | null => {
  if (!selectedPlan) return null;

  // TVOD transformed structure or legacy TVOD structures
  if (selectedPlan?.paymentType === "TVOD" || selectedPlan?.pricing) {
    const providerSku = selectedPlan?.aProviderSkus?.[0];
    const skuId = providerSku?.sUniqueSkuId || providerSku?.uniqueSkuId;

    if (!skuId) {
      console.warn("TVOD Pricing: SKU ID not found");
      return null;
    }

    const price = selectedPlan.pricing.nPrice ?? selectedPlan.pricing.price;
    const currency = selectedPlan.pricing.sCurrency ?? selectedPlan.pricing.currency;
    const currencySymbol = selectedPlan.pricing.sCurrencySymbol ?? selectedPlan.pricing.currencySymbol;

    return {
      price,
      currency,
      currencySymbol,
      type: "TVOD",
      skuId,
      pricing: selectedPlan.pricing,
      billingCycle: "one_time",
      duration: 1,
    };
  }

  // Mapped SVOD Plan structure (SubscriptionProduct)
  if (selectedPlan?.skus && selectedPlan.skus.length > 0) {
    const sku = selectedPlan.skus[0];
    return {
      price: sku.price,
      currency: sku.currency,
      currencySymbol: sku.currencySymbol,
      type: "SVOD",
      skuId: sku.uniqueSkuId,
      pricing: {
        nPrice: sku.price,
        sCurrency: sku.currency,
        sCurrencySymbol: sku.currencySymbol,
      },
      billingCycle: "monthly", // Default billing cycle
      duration: 1,
      maxAmount: sku.price * 12,
    };
  }

  // Compatibility with old raw structure containing providerSku
  if (selectedPlan?.providerSku?.oPricing) {
    const providerSku = selectedPlan.providerSku;
    return {
      price: providerSku.oPricing.nPrice,
      currency: providerSku.oPricing.sCurrency,
      currencySymbol: providerSku.oPricing.sCurrencySymbol,
      type: "SVOD",
      skuId: providerSku.sUniqueSkuId,
      pricing: providerSku.oPricing,
      billingCycle: providerSku.sBillingCycle || "monthly",
      duration: providerSku.nDuration || 1,
      maxAmount: providerSku.nMaxAmount || providerSku.oPricing.nPrice * 12,
    };
  }

  console.warn("No valid pricing structure found in selectedPlan", selectedPlan);
  return null;
};

export const usePaymentHandler = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { show: showToast } = useToastStore();

  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const selectedProfile = useProfileStore((state) => state.selectedProfile);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [preparedData, setPreparedData] = useState<any>(null);
  const [pollingAttempt, setPollingAttempt] = useState(0);
  const [showProcessingOverlay, setShowProcessingOverlay] = useState(false);
  const [overlayError, setOverlayError] = useState<string | null>(null);

  const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY;
  const DEBUG = process.env.NODE_ENV === 'development';

  const POLLING_CONFIG = {
    MAX_ATTEMPTS: 10,
    RETRY_DELAY_MS: 2000,
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Debug helper
  const debugLog = (...args: any[]) => {
    if (DEBUG) console.log(...args);
  };

  const setPaymentInitData = (data: any) => {
    try {
      if (data) {
        const dataWithExpiry = {
          ...data,
          expiresAt: Date.now() + 30 * 60 * 1000,
          createdAt: Date.now(),
          version: "1.0",
        };
        localStorage.setItem("payment_init_data", JSON.stringify(dataWithExpiry));
      } else {
        localStorage.removeItem("payment_init_data");
      }
    } catch (error) {
      console.error("Failed to store payment data:", error);
    }
  };

  const getPaymentInitData = () => {
    try {
      const data = localStorage.getItem("payment_init_data");
      if (!data) return null;

      const parsed = JSON.parse(data);

      if (!parsed.ePaymentGateway || !parsed.sToken) {
        localStorage.removeItem("payment_init_data");
        return null;
      }

      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        localStorage.removeItem("payment_init_data");
        return null;
      }

      return parsed;
    } catch (error) {
      console.error("Failed to retrieve payment data:", error);
      localStorage.removeItem("payment_init_data");
      return null;
    }
  };

  const cleanupPaymentState = useCallback(() => {
    try {
      setPaymentInitData(null);
      localStorage.removeItem("payment_sToken");
      localStorage.removeItem("payment_sProviderToken");
      sessionStorage.removeItem("payment_status");
      sessionStorage.removeItem("payment_razorpay_id");
      sessionStorage.removeItem("payment_subscription_id");
      sessionStorage.removeItem("payment_order_id");
    } catch (error) {
      console.error("Error during payment state cleanup:", error);
    }

    setIsProcessing(false);
    setIsPreparing(false);
    setPreparedData(null);
    setPollingAttempt(0);
    setShowProcessingOverlay(false);
    setOverlayError(null);
  }, []);

  const pollVerifyPayment = async (
    verifyPayload: any,
    maxAttempts = POLLING_CONFIG.MAX_ATTEMPTS,
    delayMs = POLLING_CONFIG.RETRY_DELAY_MS
  ) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      setPollingAttempt(attempt);

      try {
        const response = await apiClient.post<any>(
          ApiEndpoint.VERIFY_PAYMENT,
          verifyPayload,
          {
            headers: token ? { sessionid: token } : {},
            encrypt: true,
          }
        );

        const verificationData = response?.data;
        const metaStatus = response?.metaData?.status;
        const sStatus = verificationData?.sStatus;

        if (sStatus === "SUCCESS" && metaStatus === 200) {
          setPollingAttempt(0);
          return { success: true, data: response };
        }

        if (sStatus === "FAILED") {
          setPollingAttempt(0);
          return { success: false, error: "Payment failed" };
        }

        if (sStatus === "CANCELLED") {
          setPollingAttempt(0);
          return { success: false, error: "Payment was cancelled" };
        }

        if (sStatus === "INITIATED" || sStatus === "PENDING") {
          if (attempt < maxAttempts) {
            await sleep(delayMs);
            continue;
          } else {
            setPollingAttempt(0);
            return { success: false, timeout: true, error: "Payment verification timeout" };
          }
        }

        if (attempt < maxAttempts) {
          await sleep(delayMs);
          continue;
        } else {
          setPollingAttempt(0);
          return { success: false, timeout: true, error: "Payment verification timeout" };
        }
      } catch (error: any) {
        console.error(`Polling attempt ${attempt} failed:`, error);
        if (attempt < maxAttempts) {
          await sleep(delayMs);
          continue;
        } else {
          setPollingAttempt(0);
          return { success: false, error: "Payment verification failed" };
        }
      }
    }

    setPollingAttempt(0);
    return { success: false, timeout: true, error: "Payment verification timeout" };
  };

  const handlePaymentSuccess = async (razorpayResponse: any, selectedPlan: any, pricingData: PricingData) => {
    const isSvodPayment = pricingData.type === "SVOD";

    if (isSvodPayment) {
      setShowProcessingOverlay(true);
      setOverlayError(null);
    }

    setPaymentInitData(null);
    sessionStorage.setItem("payment_status", "PENDING");

    const paymentId = razorpayResponse.razorpay_payment_id;
    const orderId = razorpayResponse.razorpay_order_id;

    sessionStorage.setItem("payment_razorpay_id", paymentId);
    sessionStorage.setItem("payment_order_id", orderId);

    try {
      const sToken = localStorage.getItem("payment_sToken");
      const sProviderToken = localStorage.getItem("payment_sProviderToken");

      if (!sToken || !sProviderToken) {
        throw new Error("Missing payment tokens");
      }

      const verifyPayload = {
        ePaymentProvider: "RZP",
        sOrderId: paymentId,
        sProviderToken: sProviderToken,
        sToken: sToken,
      };

      const result = await pollVerifyPayment(verifyPayload);

      if (result.success) {
        const verificationData = result.data?.data;
        sessionStorage.setItem("payment_status", "SUCCESS");

        if (isSvodPayment) {
          setShowProcessingOverlay(false);
        }

        let matchedType = pricingData.type;
        let matchedRecord = null;

        if (verificationData && sToken) {
          if (verificationData.subscription?.sToken === sToken) {
            matchedType = "SVOD";
            matchedRecord = verificationData.subscription;
          } else if (Array.isArray(verificationData.oneTime)) {
            const tvodMatch = verificationData.oneTime.find(
              (item: any) => item.sToken === sToken
            );
            if (tvodMatch) {
              matchedType = "TVOD";
              matchedRecord = tvodMatch;
            }
          }

          if (!matchedRecord) {
            matchedType = verificationData.planType || pricingData.type;
            matchedRecord = matchedType === "TVOD"
              ? verificationData.oneTime?.[0] || null
              : verificationData.subscription || null;
          }
        }

        // Handle Entitlements Synchronization via React Query
        if (matchedType === "SVOD") {
          // Invalidate verify-subscription cache
          queryClient.invalidateQueries({ queryKey: ["verify-subscription"] });
        } else if (matchedType === "TVOD" && selectedPlan?.assetId) {
          try {
            const countryCode = localStorage.getItem("user_country_code") || "IN";

            // Optimistic unlock in cache
            queryClient.setQueryData(
              ["asset-pricing", String(selectedPlan.assetId), countryCode],
              (oldData: any) => {
                if (!oldData) return oldData;
                return {
                  ...oldData,
                  isUserPurchased: true,
                };
              }
            );

            // Sync with backend
            await updateEntitlement(selectedPlan.assetId, countryCode, token ?? undefined);

            // Final Refetch
            queryClient.invalidateQueries({
              queryKey: ["asset-pricing", String(selectedPlan.assetId)],
            });
            // Global fallback invalidation just in case
            queryClient.invalidateQueries({
              queryKey: ["asset-pricing"],
            });
          } catch (error) {
            console.warn("TVOD entitlement confirmation failed:", error);
          }
        }

        // Track Analytics
        try {
          if (matchedType === "SVOD") {
            analyticsService.track(EVENT_NAMES.SVOD_PURCHASE_SUCCESS, {
              product_id: selectedPlan.productId,
              price: pricingData.price,
              payment_gateway: "RAZORPAY",
            });
          } else {
            analyticsService.track(EVENT_NAMES.TVOD_PURCHASE_SUCCESS, {
              asset_id: selectedPlan.assetId,
              price: pricingData.price,
              payment_gateway: "RAZORPAY",
              content_name: selectedPlan.assetMetadata?.title || selectedPlan.oProductTranslation?.sName || '',
            });
          }
        } catch (error) {
          console.warn("Analytics error:", error);
        }

        localStorage.removeItem("payment_sToken");
        localStorage.removeItem("payment_sProviderToken");

        // Redirect with state in Session Storage
        sessionStorage.setItem("payment_success_state", JSON.stringify({
          planModel: selectedPlan,
          paymentType: matchedType,
          matchedType,
          matchedRecord,
          verificationData,
          sToken,
        }));
        router.push("/");

        return { success: true };
      }

      sessionStorage.setItem("payment_status", "FAILED");
      const errorMessage = result.error || "Payment verification failed";

      try {
        if (isSvodPayment) {
          analyticsService.track(EVENT_NAMES.SVOD_PURCHASE_FAILURE, {
            product_id: selectedPlan?.productId,
            error_message: errorMessage,
          });
        } else {
          analyticsService.track(EVENT_NAMES.TVOD_PURCHASE_FAILURE, {
            product_id: selectedPlan?.productId,
            asset_id: selectedPlan?.assetId,
            content_name: selectedPlan?.assetMetadata?.title || selectedPlan?.oProductTranslation?.sName || '',
            error_message: errorMessage,
          });
        }
      } catch (e) { }

      if (isSvodPayment) {
        setOverlayError(errorMessage);
        setTimeout(() => {
          setShowProcessingOverlay(false);
          setOverlayError(null);
          sessionStorage.setItem("payment_failed_state", JSON.stringify({
            error: errorMessage,
            planModel: selectedPlan,
          }));
          router.push("/payment-failed");
        }, 2000);
      } else {
        sessionStorage.setItem("payment_failed_state", JSON.stringify({
          error: errorMessage,
          planModel: selectedPlan,
        }));
        router.push("/payment-failed");
      }

      return { success: false, error: errorMessage };
    } catch (error: any) {
      console.error("Payment handling error:", error);
      sessionStorage.setItem("payment_status", "ERROR");

      const errorMessage = error.message || "Payment verification failed";

      try {
        if (isSvodPayment) {
          analyticsService.track(EVENT_NAMES.SVOD_PURCHASE_FAILURE, {
            product_id: selectedPlan?.productId,
            error_message: errorMessage,
          });
        } else {
          analyticsService.track(EVENT_NAMES.TVOD_PURCHASE_FAILURE, {
            product_id: selectedPlan?.productId,
            asset_id: selectedPlan?.assetId,
            content_name: selectedPlan?.assetMetadata?.title || selectedPlan?.oProductTranslation?.sName || '',
            error_message: errorMessage,
          });
        }
      } catch (e) { }

      if (isSvodPayment) {
        setOverlayError(errorMessage);
        setTimeout(() => {
          setShowProcessingOverlay(false);
          setOverlayError(null);
          showToast(errorMessage, "error");
          sessionStorage.setItem("payment_failed_state", JSON.stringify({
            error: errorMessage,
            planModel: selectedPlan,
          }));
          router.push("/payment-failed");
        }, 2000);
      } else {
        showToast(errorMessage, "error");
        sessionStorage.setItem("payment_failed_state", JSON.stringify({
          error: errorMessage,
          planModel: selectedPlan,
        }));
        router.push("/payment-failed");
      }

      return { success: false, error: errorMessage };
    }
  };

  const preparePayment = async (selectedPlan: any, paymentMethod: string) => {
    try {
      setIsPreparing(true);

      const pricingData = getPricingData(selectedPlan);
      if (!pricingData) {
        throw new Error("Invalid pricing");
      }

      const cached = getPaymentInitData();
      if (cached?.oOrderDetails && cached?.skuId === pricingData.skuId) {
        setPreparedData(cached);
        setIsPreparing(false);
        return cached;
      }

      setPaymentInitData(null);

      const userPhone = localStorage.getItem("user_phone") || user?.phone || "";
      const userPhoneCode = localStorage.getItem("user_phone_code") || "+91";

      const currentGeoData = (() => {
        try {
          const cachedGeo = localStorage.getItem("jojo_geo_cache");
          return cachedGeo ? JSON.parse(cachedGeo)?.geoData : null;
        } catch {
          return null;
        }
      })();

      const detectedCountryCode = currentGeoData?.country_code || "IN";

      // Currency validation for overseas users
      const isOverseas = detectedCountryCode !== "IN";
      if (isOverseas && pricingData.currency === "INR") {
        const errorMessage = "Pricing error: Currency mismatch for overseas user. Please contact support.";
        logger.error("[PaymentHandler] Currency mismatch for overseas user", {
          countryCode: detectedCountryCode,
          expectedCurrency: "USD/GBP/AED/etc",
          receivedCurrency: "INR",
        });
        showToast(errorMessage, "error");
        setIsPreparing(false);
        return null;
      }

      const payload = {
        iProviderSkuId: pricingData.skuId,
        nAmount: pricingData.price,
        sCity: currentGeoData?.city || "",
        sCountryCode2: detectedCountryCode,
        sCurrencyCode: pricingData.currency || "INR",
        sState: currentGeoData?.region || "",
        sUserId: user?.id,
        sPaymentMethod: paymentMethod,
        sPhone: userPhone,
        sPhoneCode: userPhoneCode,
        sOfferId: selectedPlan?.providerSku?.oOfferDetails?.sOfferId || selectedPlan?.skus?.[0]?.offer?.offerId || null,
        sEmail: localStorage.getItem("user_email") || user?.email || null,
      };

      const response = await apiClient.post<any>(
        ApiEndpoint.INITIATE_PAYMENT,
        payload,
        {
          headers: token ? { sessionid: token } : {},
          encrypt: true,
        }
      );

      const newInitiateData = response?.data?.initiateData;
      if (!newInitiateData) throw new Error("Invalid initiate response");

      localStorage.setItem("payment_sToken", newInitiateData.sToken);
      localStorage.setItem("payment_sProviderToken", newInitiateData.sProviderToken);

      const data = {
        ePaymentGateway: newInitiateData?.ePaymentProvider,
        sToken: newInitiateData?.sToken,
        oOrderDetails: newInitiateData?.oOrderDetails,
        skuId: pricingData.skuId,
      };

      setPaymentInitData(data);
      setPreparedData(data);
      setIsPreparing(false);
      return data;
    } catch (error: any) {
      console.error("preparePayment failed:", error);
      setIsPreparing(false);
      showToast(error?.message || "Failed to prepare payment. Please try again.", "error");
      return null;
    }
  };

  const executePayment = (
    selectedPlan: any,
    paymentMethod: string,
    paymentDetails: any,
    pricingData: PricingData,
    initiateData: any,
    intentApp?: string | null // NEW: UPI Intent app name (e.g., "google_pay", "phonepe")
  ) => {
    setIsProcessing(true);
    return new Promise((resolve, reject) => {
      try {
        const orderDetails = initiateData.oOrderDetails;
        const notes = orderDetails?.notes || {};
        const contact = notes.contact || "";
        const email = notes.email || "customer@razorpay.com";

        const isRecurring = pricingData.type === "SVOD";

        const options: any = {
          amount: orderDetails.amount,
          currency: orderDetails.currency || "INR",
          order_id: orderDetails.order_id,
          email: email,
          contact: contact,
        };

        if (orderDetails.customer_id) {
          options.customer_id = orderDetails.customer_id;
        }

        if (isRecurring) {
          options.recurring = 1;
        }

        if (paymentMethod === "upi") {
          options.method = "upi";

          // UPI Intent Flow - Deep link to specific app
          if (intentApp) {
            // CRITICAL: Custom Checkout createPayment() uses flat _[flow] key,
            // NOT the nested options.upi = { flow: "intent" } which is Standard Checkout syntax.
            // The nested format is silently ignored by createPayment(), causing intent to never fire.
            options["_[flow]"] = "intent";
            // VPA not needed for intent flow
          } else {
            // Traditional VPA Flow - Manual UPI ID input
            options.vpa = paymentDetails.upiId;
          }
        } else if (paymentMethod === "card") {
          options.method = "card";
          options["card[number]"] = paymentDetails.card.number.replace(/\s/g, "");
          options["card[expiry_month]"] = paymentDetails.card.month;
          options["card[expiry_year]"] = paymentDetails.card.year;
          options["card[cvv]"] = paymentDetails.card.cvv;
          options["card[name]"] = paymentDetails.card.name;
        }

        const RazorpayClass = (window as any).Razorpay;
        if (!RazorpayClass) {
          reject(new Error("Razorpay SDK not loaded"));
          return;
        }

        if (!RAZORPAY_KEY) {
          reject(new Error("Razorpay Key ID is undefined. Make sure NEXT_PUBLIC_RAZORPAY_KEY_ID is configured."));
          return;
        }

        // Create Razorpay instance
        const rzp = new RazorpayClass({
          key: RAZORPAY_KEY,
          id: orderDetails.order_id,
        });

        if (typeof rzp.createPayment !== "function") {
          reject(new Error("Razorpay createPayment not available"));
          return;
        }

        // Track UPI Intent analytics
        if (intentApp) {
          try {
            analyticsService.track((EVENT_NAMES as any).PAYMENT_INITIATED, {
              payment_method: "upi_intent",
              upi_app: intentApp,
              amount: pricingData.price,
              plan_type: pricingData.type,
            });
          } catch (e) {
            console.warn("Analytics tracking failed:", e);
          }
        }

        // CRITICAL FIX: Pass app parameter to createPayment, not constructor
        // The second parameter is for options like { app: "google_pay" }

        // Validate and map intent app format
        if (intentApp) {
          // Map package names or alternative short names to standard Web JS SDK short names
          const packageToWebShortName: Record<string, string> = {
            'com.google.android.apps.nbu.paisa.user': 'google_pay',
            'com.phonepe.app': 'phonepe',
            'net.one97.paytm': 'paytm',
            'in.org.npci.upiapp': 'bhim',
            'com.dreamplug.androidapp': 'cred',
            'in.amazon.mShop.android.shopping': 'amazon',
            'com.mobikwik_new': 'mobikwik',
            'com.freecharge.android': 'freecharge',
            'com.csam.icici.bank.imobile': 'icici',
            'money.jupiter': 'jupiter',
            'com.enstage.wibmo.hdfc': 'payzapp',
            'com.navi.app': 'navi',
            'com.moneyview': 'moneyview',
            'com.supermoney.app': 'super_money',
            'com.popclub.app': 'popclubapp',
          };

          const normalizedApp = intentApp.toLowerCase();

          if (packageToWebShortName[intentApp]) {
            const mapped = packageToWebShortName[intentApp];
            debugLog(`🔄 Mapped package name to web short name: ${intentApp} → ${mapped}`);
            intentApp = mapped;
          } else if (packageToWebShortName[normalizedApp]) {
            const mapped = packageToWebShortName[normalizedApp];
            debugLog(`🔄 Mapped package name to web short name: ${intentApp} → ${mapped}`);
            intentApp = mapped;
          } else {
            const shortNameMap: Record<string, string> = {
              'gpay': 'google_pay',
              'google_pay': 'google_pay',
              'phonepe': 'phonepe',
              'paytm': 'paytm',
              'bhim': 'bhim',
              'cred': 'cred',
              'amazon': 'amazon',
              'mobikwik': 'mobikwik',
              'freecharge': 'freecharge',
              'icici': 'icici',
              'jupiter': 'jupiter',
              'payzapp': 'payzapp',
              'navi': 'navi',
              'moneyview': 'moneyview',
              'super_money': 'super_money',
              'popclubapp': 'popclubapp',
              'any': 'phonepe',
            };
            if (shortNameMap[normalizedApp]) {
              const mapped = shortNameMap[normalizedApp];
              debugLog(`🔄 Mapped short name to web short name: ${intentApp} → ${mapped}`);
              intentApp = mapped;
            }
          }

          // Validation - must be a valid non-empty string and not a package name anymore (as JS SDK expects short names)
          if (!intentApp || intentApp.length < 3) {
            console.error("❌ Invalid intent app format:", intentApp);
            reject(new Error("Invalid UPI app selection. Please try again."));
            return;
          }
        }

        // Debug logging
        debugLog("🔍 Payment Debug Info:");
        debugLog("- Payment Method:", paymentMethod);
        debugLog("- Intent App:", intentApp);
        debugLog("- Options:", JSON.stringify(options, null, 2));

        // ──────────────────────────────────────────────────────────────
        // UPI Intent Strategy:
        // 1. Try TARGETED intent first (specific app like google_pay)
        //    → Works in native WebViews, may fail in Chrome browser
        // 2. On intent_no_apps_error → silently retry with GENERIC intent
        //    (no app param). Generic uses upi:// deep links which Chrome
        //    supports. OS shows app chooser → user picks GPay → works.
        // 3. If generic also fails → show error, suggest VPA mode
        // ──────────────────────────────────────────────────────────────

        let hasRetriedWithGenericIntent = false;

        const launchPayment = (targetedApp: string | null) => {
          if (targetedApp) {
            options["_[app]"] = targetedApp;
            debugLog("🚀 Attempting TARGETED intent for app:", targetedApp);
            rzp.createPayment(options, { app: targetedApp });
          } else {
            // Generic intent — remove app targeting, let OS handle
            delete options["_[app]"];
            debugLog("🚀 Attempting GENERIC UPI intent (OS app chooser)");
            rzp.createPayment(options);
          }
        };

        if (!intentApp) {
          debugLog("📝 Creating payment without Intent (VPA mode or Card)");
          rzp.createPayment(options);
        } else {
          debugLog("✅ Starting UPI intent flow for app:", intentApp);
          debugLog("📋 Options:", JSON.stringify({ method: options.method, '_[flow]': options['_[flow]'], order_id: options.order_id }, null, 2));
          launchPayment(intentApp);
        }

        rzp.on("payment.success", async (response: any) => {
          showToast("Payment successful! Verifying...", "success");
          const razorpayResponse = {
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          };
          await handlePaymentSuccess(razorpayResponse, selectedPlan, pricingData);
          resolve({ success: true });
        });

        rzp.on("payment.error", (error: any) => {
          console.error("❌ Payment error:", error);
          console.error("❌ Error details:", JSON.stringify({
            code: error.error?.code,
            reason: error.error?.reason,
            description: error.error?.description,
            source: error.error?.source,
            step: error.error?.step,
            metadata: error.error?.metadata,
            intentApp,
            paymentMethod,
            hasRetriedWithGenericIntent,
          }));

          // Special handling for Intent app not found error
          if (error.error?.reason === 'intent_no_apps_error') {

            // ── FALLBACK: Retry with generic UPI intent ──
            // Chrome blocks targeted intent:// URIs (with specific package name).
            // Generic intent uses upi:// deep links which Chrome supports.
            // This shows the OS app chooser where user can pick GPay/PhonePe.
            if (!hasRetriedWithGenericIntent && intentApp) {
              hasRetriedWithGenericIntent = true;
              debugLog("⚠️ Targeted intent failed — retrying with GENERIC UPI intent...");
              debugLog("   (This uses upi:// deep links which Chrome supports)");
              showToast("Opening UPI apps...", "info");

              // Create a new Razorpay instance for the retry
              // (reusing the same order_id is fine — the first attempt failed, no payment was created)
              const rzpRetry = new RazorpayClass({
                key: RAZORPAY_KEY,
                id: orderDetails.order_id,
              });

              const retryOptions = { ...options };
              delete retryOptions["_[app]"];
              // Keep _[flow] as "intent" — just remove the app targeting

              rzpRetry.createPayment(retryOptions);

              rzpRetry.on("payment.success", async (retryResponse: any) => {
                showToast("Payment successful! Verifying...", "success");
                const razorpayResponse = {
                  razorpay_payment_id: retryResponse.razorpay_payment_id,
                  razorpay_order_id: retryResponse.razorpay_order_id,
                  razorpay_signature: retryResponse.razorpay_signature,
                };
                await handlePaymentSuccess(razorpayResponse, selectedPlan, pricingData);
                resolve({ success: true });
              });

              rzpRetry.on("payment.error", (retryError: any) => {
                console.error("❌ Generic intent also failed:", retryError);
                const msg = "Could not open UPI app. Please use the UPI ID option instead.";
                showToast(msg, "error");
                setIsProcessing(false);
                reject(new Error(msg));
              });

              return; // Don't reject — fallback is running
            }

            // Both targeted and generic intent failed
            const msg = "Could not open UPI app. Please use the UPI ID option instead.";
            showToast(msg, "error");
            setIsProcessing(false);
            reject(new Error(msg));
            return;
          }

          const msg = error.error?.description || error.error?.reason || "Payment failed. Please try again.";
          showToast(msg, "error");
          setIsProcessing(false);

          // Track failed intent for analytics
          if (intentApp && error.code === 'PAYMENT_CANCELLED') {
            debugLog("ℹ️ Hint: App might not have opened. User can try UPI ID instead.");
          }

          reject(new Error(msg));
        });
      } catch (error) {
        console.error("executePayment error:", error);
        reject(error);
      }
    });
  };

  const initiatePayment = async (selectedPlan: any, options: any = {}) => {
    try {
      setIsProcessing(true);

      const pricingData = getPricingData(selectedPlan);
      if (!pricingData) {
        showToast("Invalid pricing", "error");
        setIsProcessing(false);
        return { success: false, error: "Invalid pricing" };
      }

      let initiateData = preparedData || getPaymentInitData();
      if (!initiateData?.oOrderDetails) {
        initiateData = await preparePayment(selectedPlan, options?.paymentMethod);
        if (!initiateData) {
          setIsProcessing(false);
          return { success: false, error: "Failed to prepare payment" };
        }
      }

      const paymentMethod = options?.paymentMethod;
      const paymentDetails = { upiId: options?.upiId, card: options?.card };
      const intentApp = options?.intentApp || null;

      const result = await executePayment(
        selectedPlan,
        paymentMethod,
        paymentDetails,
        pricingData,
        initiateData,
        intentApp
      );
      return result;
    } catch (error: any) {
      console.error("Payment initiation failed:", error);
      showToast(error?.message || "Payment failed", "error");
      setIsProcessing(false);
      return { success: false, error: error?.message || "Payment failed" };
    }
  };

  return {
    preparePayment,
    executePayment,
    initiatePayment,
    isProcessing,
    isPreparing,
    preparedData,
    pollingAttempt,
    cleanupPaymentState,
    showProcessingOverlay,
    overlayError,
  };
};

export const checkCardRecurringEligibility = async (cardNumber: string, sessionId: string | null) => {
  try {
    const rawNumber = (cardNumber || "").replace(/\s/g, "");
    const iin = rawNumber.slice(0, 6);

    if (iin.length < 6) {
      return {
        eligible: false,
        error: "Please enter a valid card number",
        cardDetails: null,
      };
    }

    if (!sessionId) {
      return { eligible: true, error: null, cardDetails: null };
    }

    const response = await apiClient.post<any>(
      ApiEndpoint.CHECK_CARD_RECURRING_ELIGIBILITY,
      { iin },
      { headers: { sessionid: sessionId }, encrypt: true }
    );

    const cardDetails = response?.data?.oCardDetails || response?.oCardDetails || null;

    if (!cardDetails) {
      return { eligible: true, error: null, cardDetails: null };
    }

    const isRecurringEligible = cardDetails?.recurring?.available === true;

    if (!isRecurringEligible) {
      return {
        eligible: false,
        error: "This card does not support recurring payments. Please use a different card.",
        cardDetails,
      };
    }

    return { eligible: true, error: null, cardDetails };
  } catch (err: any) {
    console.warn("Card eligibility check failed, proceeding with payment:", err?.message);
    return { eligible: true, error: null, cardDetails: null };
  }
};

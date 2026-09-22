"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useFocusable } from "@noriginmedia/norigin-spatial-navigation";
import { generateQrCode, verifyQrCode } from "@/lib/api/pair";
import { deepLinkManager } from "@/lib/deeplink/deepLinkManager";
import { ROUTES } from "@/lib/constants/routes";
import { tvNavigate } from "@/src/navigation/tvNavigate";
import { useAuthStore } from "@/store/useAuthStore";
import { useProfileStore } from "@/store/useProfileStore";
import { logger } from "@/lib/logger/logger";
import { cn } from "@/lib/utils";
import { useBootstrap } from "@/lib/bootstrap/BootstrapContext";

const POLL_INTERVAL_MS = 3000;
const CODE_LIFETIME_MS = 10 * 60 * 1000; // 10 minutes

export function QrPairingPanel() {
  const t = useTranslations("loginPage");
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearSelectedProfile = useProfileStore((state) => state.clearSelectedProfile);
  const { isAppReady } = useBootstrap();

  const [code, setCode] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [genError, setGenError] = useState(false);
  const generationRef = useRef(0);
  const retryCountRef = useRef(0);

  const generateCode = async () => {
    const myGeneration = ++generationRef.current;
    setExpired(false);
    setGenError(false);
    setCode(null);
    setQrDataUrl(null);

    // Code must come from the backend, not be invented client-side — a code
    // the backend has never heard of can never be claimed by a phone, which
    // is why this silently never completed before (see generateQrCode's own
    // comment + USE_PHONE_FEATURE.md for the confirmed contract).
    const result = await generateQrCode();
    if (generationRef.current !== myGeneration) return;
    if (!result?.code) {
      logger.error("[QrPairingPanel] Failed to get a pairing code from the backend");
      if (retryCountRef.current < 1) {
        retryCountRef.current += 1;
        setTimeout(generateCode, 600);
        return;
      }
      setGenError(true);
      return;
    }
    retryCountRef.current = 0;
    setCode(result.code);

    // Always the real public domain (https://jojoapp.in), never the TV's own
    // current origin — see generatePairingQrUrl's own comment.
    const qrUrl = await deepLinkManager.generatePairingQrUrl(result.code);
    if (!qrUrl) {
      logger.error("[QrPairingPanel] Failed to generate pairing deep link URL");
      setGenError(true);
      return;
    }
    if (generationRef.current !== myGeneration) return;

    QRCode.toDataURL(qrUrl, { width: 420, margin: 0, color: { dark: "#000000", light: "#ffffff" } })
      .then((dataUrl) => {
        if (generationRef.current === myGeneration) setQrDataUrl(dataUrl);
      })
      .catch((err) => {
        logger.error("[QrPairingPanel] Failed to render QR code", err);
        if (generationRef.current === myGeneration) setGenError(true);
      });
  };

  useEffect(() => {
    if (!isAppReady) return;
    generateCode();
  }, [isAppReady]);

  // Poll for pairing status while a code is active and not expired
  useEffect(() => {
    if (!code || expired) return;

    const startedAt = Date.now();
    let cancelled = false;
    const controller = new AbortController();

    const poll = async () => {
      if (cancelled) return;

      if (Date.now() - startedAt > CODE_LIFETIME_MS) {
        setExpired(true);
        return;
      }

      const result = await verifyQrCode(code, undefined, controller.signal);
      if (cancelled) return;

      if (result.verified && result.sessionId && result.userId) {
        clearSelectedProfile();
        setAuth(
          {
            id: result.userId,
            phone: result.phone || "",
            isGuest: false,
            createdAt: new Date().toISOString(),
          },
          result.sessionId,
          result.token || ""
        );
        logger.info("[QrPairingPanel] TV pairing successful via polling");
        tvNavigate(ROUTES.WATCHING, router, { replace: true });
        return;
      }

      timer = setTimeout(poll, POLL_INTERVAL_MS);
    };

    let timer = setTimeout(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [clearSelectedProfile, code, expired, router, setAuth]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center w-full max-w-7xl mx-auto px-4 py-2">
      {/* Left Column: Instructions + QR Code (Right-aligned to OR line) */}
      <div className="flex flex-col items-start gap-6 shrink-0 justify-self-end sm:pr-8 md:pr-14 lg:pr-20">
        <h2 className="max-w-[400px] text-left text-3xl sm:text-[34px] font-bold text-white leading-[1.25] tracking-tight">
          {t("scan_qr_instruction") || "Scan the QR Code using your phone or tablet's camera"}
        </h2>
        <div className="relative flex h-[280px] w-[280px] sm:h-[310px] sm:w-[310px] items-center justify-center rounded-2xl bg-white p-3 shadow-2xl border border-white/20">
          {qrDataUrl && !expired && !genError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="Pairing QR Code" className="h-full w-full object-contain" />
          ) : expired ? (
            <FocusableRefreshButton onClick={generateCode} label={t("qr_get_new_code") || "Get New Code"} />
          ) : genError ? (
            <div className="flex flex-col items-center gap-3 px-4 text-center">
              <span className="text-sm font-medium text-red-400">
                {t("qr_generation_failed") || "Couldn't generate a code. Please try again."}
              </span>
              <FocusableRefreshButton onClick={generateCode} label={t("qr_get_new_code") || "Get New Code"} />
            </div>
          ) : (
            <span className="text-base font-medium text-neutral-400">{t("qr_generating_code") || "Generating code..."}</span>
          )}
        </div>
      </div>

      {/* Center Divider: Fixed at exact 50% screen center */}
      <div className="relative hidden self-stretch sm:flex sm:items-center sm:justify-center px-4 justify-self-center">
        <div className="h-[380px] w-px bg-white/20" />
        <span className="absolute text-[#aaaaaa] font-medium text-2xl tracking-widest uppercase bg-[#140a04] px-4">
          {t("qr_or") || "OR"}
        </span>
      </div>

      <div className="flex items-center gap-4 sm:hidden my-4 justify-self-center">
        <div className="h-px w-24 bg-white/20" />
        <span className="text-base font-medium text-[#aaaaaa] tracking-widest uppercase">{t("qr_or") || "OR"}</span>
        <div className="h-px w-24 bg-white/20" />
      </div>

      {/* Right Column: Step Instructions + TV Pairing Code Badge (Left-aligned to OR line) */}
      <div className="flex flex-col gap-8 shrink-0 items-start justify-self-start sm:pl-8 md:pl-14 lg:pl-20">
        <ol className="flex flex-col gap-6 text-2xl sm:text-[28px] font-bold text-white leading-snug max-w-[460px]">
          <li className="flex flex-wrap items-center gap-x-2">
            <span>1. {t("qr_step_open_app") || "Open the JOJO app on your mobile phone"}</span>
          </li>
          <li className="flex items-center gap-3 flex-wrap">
            <span>2. {t("qr_step_go_to") || "Go to Profile"}</span>
            <span
              className="text-2xl leading-none select-none inline-flex items-center"
              style={{ fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' }}
            >
              👤
            </span>
          </li>
          <li className="flex items-center gap-3 flex-wrap">
            <span>3. {t("qr_step_click_on") || "Click on TV Login"}</span>
            <span
              className="text-2xl leading-none select-none inline-flex items-center"
              style={{ fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' }}
            >
              📺
            </span>
          </li>
          <li className="flex flex-wrap items-center gap-x-2">
            <span>4. {t("qr_step_enter_code") || "Enter this unique code to continue"}</span>
          </li>
        </ol>

        {/* Pairing Code Pill Badge */}
        <div className="inline-flex items-center justify-center rounded-full bg-[#18110b] border border-white/15 px-12 py-4 shadow-2xl min-w-[280px] mt-2">
          <span className="text-4xl sm:text-5xl font-black tracking-[0.45em] text-white font-mono">
            {code ?? "……"}
          </span>
        </div>
      </div>
    </div>
  );
}

function FocusableRefreshButton({ onClick, label }: { onClick: () => void; label: string }) {
  const { ref, focused } = useFocusable({ focusKey: "qr-refresh-btn", onEnterPress: onClick });
  return (
    <button
      ref={ref as any}
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full bg-theme_13_samecolour px-5 py-2.5 text-sm font-semibold text-theme_1 outline-none cursor-pointer transition-all",
        focused ? "ring-2 ring-theme_12 scale-105" : ""
      )}
    >
      {label}
    </button>
  );
}

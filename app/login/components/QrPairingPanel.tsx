"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useFocusable } from "@noriginmedia/norigin-spatial-navigation";
import { checkPairStatus, generatePairingCode } from "@/lib/api/pair";
import { deepLinkManager } from "@/lib/deeplink/deepLinkManager";
import { ROUTES } from "@/lib/constants/routes";
import { useAuthStore } from "@/store/useAuthStore";
import { logger } from "@/lib/logger/logger";
import { cn } from "@/lib/utils";
import { CircleUser, Tv } from "lucide-react";

const POLL_INTERVAL_MS = 3000;
const CODE_LIFETIME_MS = 10 * 60 * 1000; // 10 minutes

export function QrPairingPanel() {
  const t = useTranslations("loginPage");
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [code, setCode] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const generationRef = useRef(0);

  const generateCode = () => {
    const myGeneration = ++generationRef.current;
    const nextCode = generatePairingCode();
    setExpired(false);
    setCode(nextCode);
    setQrDataUrl(null);

    if (typeof window === "undefined") return;
    const qrUrl = deepLinkManager.generatePairingQrUrl(nextCode, window.location.origin);
    if (!qrUrl) return;

    QRCode.toDataURL(qrUrl, { width: 340, margin: 1, color: { dark: "#1a1006", light: "#ffffff" } })
      .then((dataUrl) => {
        if (generationRef.current === myGeneration) setQrDataUrl(dataUrl);
      })
      .catch((err) => logger.error("[QrPairingPanel] Failed to render QR code", err));
  };

  useEffect(() => {
    generateCode();
  }, []);

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

      const result = await checkPairStatus(code, controller.signal);
      if (cancelled) return;

      if (result.paired && result.sessionId && result.userId) {
        setAuth(
          {
            id: result.userId,
            phone: result.phone || "",
            isGuest: false,
            createdAt: new Date().toISOString(),
          },
          result.sessionId,
          ""
        );
        logger.info("[QrPairingPanel] TV pairing successful via polling");
        router.replace(ROUTES.WATCHING);
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
  }, [code, expired, router, setAuth]);

  return (
    <div className="flex flex-col items-center gap-10 px-4 py-8 sm:flex-row sm:items-start sm:justify-center sm:gap-16">
      <div className="flex flex-col items-center gap-4 sm:items-start">
        <p className="max-w-[280px] text-center text-base text-theme_1/90 sm:text-left">
          {t("scan_qr_instruction")}
        </p>
        <div className="relative flex h-[220px] w-[220px] items-center justify-center rounded-2xl bg-white p-3 sm:h-[280px] sm:w-[280px]">
          {qrDataUrl && !expired ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="" className="h-full w-full" />
          ) : expired ? (
            <FocusableRefreshButton onClick={generateCode} label={t("qr_get_new_code")} />
          ) : (
            <span className="text-sm text-theme_12/60">{t("qr_generating_code")}</span>
          )}
        </div>
      </div>

      <div className="relative hidden self-stretch sm:block">
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-theme_1/15" />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md bg-theme_10 px-3 py-1.5 text-sm text-theme_5">
          {t("qr_or")}
        </span>
      </div>
      <div className="flex items-center gap-3 sm:hidden">
        <div className="h-px w-16 bg-theme_1/15" />
        <span className="text-sm text-theme_5">{t("qr_or")}</span>
        <div className="h-px w-16 bg-theme_1/15" />
      </div>

      <div className="flex flex-col gap-6">
        <ol className="flex flex-col gap-5 text-base text-theme_1 sm:text-lg">
          <li>1. {t("qr_step_open_app")}</li>
          <li className="flex items-center gap-2">
            2. {t("qr_step_go_to")}
            <CircleUser className="h-5 w-5 text-theme_13_samecolour" />
            <span className="font-bold text-theme_13_samecolour">{t("qr_step_profile")}</span>
          </li>
          <li className="flex items-center gap-2">
            3. {t("qr_step_click_on")}
            <Tv className="h-5 w-5" />
            <span className="font-bold">{t("qr_step_tv_login")}</span>
          </li>
          <li>4. {t("qr_step_enter_code")}</li>
        </ol>

        <div className="flex items-center gap-2 rounded-full bg-theme_10 px-6 py-4">
          {(code ?? "……").split("").map((char, idx) => (
            <span key={idx} className="text-2xl font-bold tracking-widest text-theme_1 sm:text-3xl">
              {char}
            </span>
          ))}
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

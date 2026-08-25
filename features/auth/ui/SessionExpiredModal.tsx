"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ShieldAlert } from "lucide-react";
import { JOJOButton, JOJOCustomButton } from "@/components/ui/JOJOButton";
import { useSessionExpiredStore } from "@/store/useSessionExpiredStore";
import { useAuthStore } from "@/store/useAuthStore";
import { ROUTES } from "@/lib/constants/routes";

/**
 * SessionExpiredModal
 *
 * Shown whenever any API call returns a 401 Unauthorized.
 * This modal is intentionally NON-DISMISSIBLE:
 *  - No close button
 *  - Backdrop click does nothing
 *  - ESC key is blocked
 *  - The only exit is the "Login" button
 *
 * When the user clicks Login:
 *  1. Auth state is cleared (token + cookies + localStorage)
 *  2. Modal is dismissed
 *  3. User is sent to /login with the current page as returnUrl
 */
export function SessionExpiredModal() {
  const t = useTranslations("sessionExpiredModal");
  const isVisible = useSessionExpiredStore((s) => s.isVisible);
  const dismiss = useSessionExpiredStore((s) => s._dismiss);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  // Block ESC key while the modal is open
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isVisible]);

  // Lock body scroll while the modal is open
  useEffect(() => {
    if (!isVisible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isVisible]);

  if (!isVisible) return null;

  const handleLogin = () => {
    // 1. Clear Zustand auth state + auth-presence cookie (via store)
    clearAuth();

    // 2. Wipe localStorage completely
    try {
      localStorage.clear();
    } catch {}

    // 3. Wipe sessionStorage completely
    try {
      sessionStorage.clear();
    } catch {}

    // 4. Expire every cookie the browser holds for this origin
    try {
      document.cookie.split(";").forEach((cookie) => {
        const name = cookie.split("=")[0].trim();
        if (!name) return;
        // Expire on root path
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        // Also expire on current path (covers path-scoped cookies)
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${window.location.pathname}`;
      });
    } catch {}

    // 5. Dismiss modal
    dismiss();

    // 6. Hard-navigate directly to login without returnUrl query parameter so the page fully re-initialises with clean state.
    //    Using window.location.href instead of router.push to guarantee a full
    //    page reload — this clears any in-memory React/Zustand state that
    //    localStorage.clear() alone wouldn't touch.
    window.location.href = ROUTES.LOGIN;
  };

  return (
    /**
     * Backdrop — pointer events are intentionally NOT blocked with a click
     * handler that could dismiss the modal. Clicking the backdrop does nothing.
     * z-[9999999] ensures this is always on top of every other overlay.
     */
    <div
      className="fixed inset-0 z-[9999999] flex items-center justify-center bg-black/75 backdrop-blur-sm"
      // Swallow all pointer events on the backdrop — clicking it does NOTHING
      onClick={(e) => e.stopPropagation()}
    >
      {/* Modal panel */}
      <div
        className="relative mx-4 w-full max-w-[380px] rounded-2xl bg-neutral-950 border border-neutral-800/60 p-6 shadow-2xl"
        // Prevent clicks inside the panel from bubbling to the backdrop
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <ShieldAlert size={30} className="text-red-400" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-theme_1 text-center mb-2">
          {t("title")}
        </h3>

        {/* Description */}
        <p className="text-sm text-neutral-400 text-center leading-relaxed mb-6">
          {t("description")}
        </p>

        {/* Login button — the ONLY way to dismiss this modal */}
        <JOJOCustomButton
          id="session-expired-login-btn"
          state={JOJOButton.State.ACTIVE}
          size={JOJOButton.Size.M}
          onClick={handleLogin}
          className="w-full justify-center text-theme_1 body-sm-medium font-bold h-11 active:scale-95 transition-all shadow-lg shadow-theme_13_samecolour/20"
          hoverColor="theme_13_80"
        >
          {t("login")}
        </JOJOCustomButton>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { JOJOModal } from "@/components/ui/JOJOModal";
import { useLogout } from "@/features/auth/hooks/useLogout";
import { useTranslations } from "next-intl";
import { useFocusable, setFocus, doesFocusableExist } from "@noriginmedia/norigin-spatial-navigation";

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// JOJOModalContent (the shared modal chrome) sets focus to its own container
// boundary on open, not to any button inside it — on TV hardware that leaves
// focus sitting on a non-leaf node arrows can freely escape from, straight into
// the page behind the modal. A single setTimeout(() => setFocus(...), N) to
// correct that is a known-fragile race (see retrySetFocus in
// app/account-settings/page.tsx and the identical fix in ExitConfirmModal.tsx):
// the target button's own useFocusable() registration effect can commit a tick
// or more after this fires on slower TV hardware, so setFocus() on a
// still-unregistered key is a silent no-op. Retrying until doesFocusableExist()
// confirms it's actually registered is what makes this reliable.
function retrySetFocus(focusKey: string, attempts = 8, intervalMs = 80) {
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

export function LogoutModal({ isOpen, onClose }: LogoutModalProps) {
  const { logout } = useLogout();
  const t = useTranslations("profile-dropdown");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    setIsLoggingOut(true);
    logout();
  };

  useEffect(() => {
    if (isOpen) {
      retrySetFocus("logout-modal-cancel-btn");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <JOJOModal
      isOpen={isOpen}
      onClose={isLoggingOut ? () => { } : onClose}
    >
      <div className="space-y-3 text-center">
        <h3 className="text-[22px] sm:text-2xl font-bold text-theme_1 tracking-tight leading-snug">
          {t("logout_confirm")}
        </h3>
        <p className="text-[14px] sm:text-[15px] text-theme_6 font-normal leading-relaxed">
          {t("logout_desc")}
        </p>
      </div>

      <LogoutModalButtons
        isLoggingOut={isLoggingOut}
        onLogout={handleLogout}
        onCancel={onClose}
      />
    </JOJOModal>
  );
}

/**
 * Deliberately its own component, not inline useFocusable() calls inside
 * LogoutModal itself: a component's hook calls read FocusContext from its OWN
 * position in the render tree (wherever LogoutModal itself sits — under
 * ProfileDropdown, near the navbar), never from a <FocusContext.Provider> that
 * same component later renders inside its own returned JSX. Passing children to
 * <JOJOModal> doesn't re-parent the component that created them for context
 * purposes — only a component whose own function body actually executes inside
 * JOJOModalContent's subtree resolves FocusContext to the modal's boundary.
 * Keeping the buttons inline here registered them as if they were direct
 * children of the navbar instead of the modal — outside JOJO_MODAL_CONTAINER's
 * isFocusBoundary entirely — so arrow presses could walk straight past the
 * modal into the page behind it. Same pitfall, same fix, as ExitConfirmModal.tsx.
 */
function LogoutModalButtons({
  isLoggingOut,
  onLogout,
  onCancel,
}: {
  isLoggingOut: boolean;
  onLogout: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("profile-dropdown");

  const { ref: logoutBtnRef, focused: logoutFocused } = useFocusable({
    focusKey: "logout-modal-confirm-btn",
    onEnterPress: () => {
      if (!isLoggingOut) onLogout();
    },
  });

  const { ref: cancelBtnRef, focused: cancelFocused } = useFocusable({
    focusKey: "logout-modal-cancel-btn",
    onEnterPress: () => {
      if (!isLoggingOut) onCancel();
    },
  });

  return (
    <div className="flex w-full items-center justify-center gap-4 mt-4">
      {/* Logout Button */}
      <button
        ref={logoutBtnRef as any}
        data-focuskey="logout-modal-confirm-btn"
        onClick={onLogout}
        disabled={isLoggingOut}
        className={`flex-1 py-3 px-6 rounded-full font-bold text-sm sm:text-base transition-all cursor-pointer outline-none ${
          logoutFocused
            ? "bg-red-600 text-white scale-105 shadow-xl ring-4 ring-white z-50"
            : "bg-neutral-800 text-white/80 hover:bg-neutral-700 hover:text-white"
        }`}
      >
        {isLoggingOut ? t("logging_out") || "Logging out..." : t("logout")}
      </button>

      {/* Cancel Button */}
      <button
        ref={cancelBtnRef as any}
        data-focuskey="logout-modal-cancel-btn"
        onClick={onCancel}
        disabled={isLoggingOut}
        // Same resting/focused pair as ExitConfirmModal's two buttons — one
        // neutral resting color, one "this is focused" color (theme orange),
        // so focus is always unambiguous. This used to rest at solid
        // bg-theme_13_samecolour (orange) by default, the same color Logout
        // turns red *away* from on focus — with Logout unfocused (neutral)
        // and Cancel always orange, it read backwards: the un-highlighted
        // button looked like the active one.
        className={`flex-1 py-3 px-6 rounded-full font-bold text-sm sm:text-base transition-all cursor-pointer outline-none ${
          cancelFocused
            ? "bg-theme_13_samecolour text-white scale-105 shadow-xl ring-4 ring-white z-50"
            : "bg-neutral-800 text-white/80 hover:bg-neutral-700 hover:text-white"
        }`}
      >
        {t("cancel")}
      </button>
    </div>
  );
}

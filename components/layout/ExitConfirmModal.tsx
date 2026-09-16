"use client";

import { useEffect } from "react";
import { flushSync } from "react-dom";
import { useTranslations } from "next-intl";
import { useFocusable, setFocus, doesFocusableExist } from "@noriginmedia/norigin-spatial-navigation";
import { JOJOModal } from "@/components/ui/JOJOModal";
import { useExitConfirmStore } from "@/store/useExitConfirmStore";
import { exitWebOSApp } from "@/lib/webos";

// JOJOModalContent (the shared modal chrome) sets focus to its own container
// boundary on open, not to any button inside it — on TV hardware that leaves
// focus sitting on a non-leaf node arrows can freely escape from, straight into
// the page behind the modal. A single setTimeout(() => setFocus(...), N) to
// correct that is a known-fragile race elsewhere in this app too (see
// retrySetFocus in app/account-settings/page.tsx): the target button's own
// useFocusable() registration effect can commit a tick or more after this
// fires on slower TV hardware, so setFocus() on a still-unregistered key is a
// silent no-op. Retrying until doesFocusableExist() confirms it's actually
// registered is what makes this reliable.
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

/**
 * "Exit JOJO?" confirmation shown on Back at the home root — see RemoteManager.ts,
 * which opens this instead of calling exitWebOSApp() directly.
 */
export function ExitConfirmModal() {
  const isOpen = useExitConfirmStore((s) => s.isOpen);
  const close = useExitConfirmStore((s) => s.close);
  const t = useTranslations("common");

  useEffect(() => {
    if (isOpen) {
      retrySetFocus("exit-confirm-cancel-btn");
    }
  }, [isOpen]);

  // webOS's home screen shows a cached screenshot of this app's last-painted
  // frame as a placeholder while the real webview resumes from PalmSystem's
  // deactivate() — it isn't reading our live DOM at that moment, it's reading
  // whatever the compositor last actually painted to the screen. flushSync()
  // only guarantees the DOM mutation itself happens synchronously; it says
  // nothing about whether the browser's own paint pass (which runs on its own,
  // synchronized with requestAnimationFrame, not with React's commit) has
  // actually reached the screen yet. If deactivate() fires before that paint
  // lands, the OS can snapshot a frame that still shows this popup — so on
  // reopen it briefly shows a stale screenshot of the closed popup until the
  // live (already-correct) webview finishes resuming and swaps in for real.
  // Forcing the state change through synchronously, then waiting two full
  // animation frames (one for styles to recalculate, one for the actual paint
  // to land) before backgrounding, ensures the frame webOS captures is the
  // popup-free one.
  const handleExit = () => {
    flushSync(() => {
      close();
    });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        exitWebOSApp();
      });
    });
  };

  if (!isOpen) return null;

  return (
    <JOJOModal isOpen={isOpen} onClose={close}>
      <div className="space-y-3 text-center">
        <h3 className="text-[22px] sm:text-2xl font-bold text-theme_1 tracking-tight leading-snug">
          {t("exit_app_title")}
        </h3>
        <p className="text-[14px] sm:text-[15px] text-theme_6 font-normal leading-relaxed">
          {t("exit_app_desc")}
        </p>
      </div>

      <ExitConfirmButtons onCancel={close} onExit={handleExit} />
    </JOJOModal>
  );
}

/**
 * Deliberately its own component, not inline useFocusable() calls inside
 * ExitConfirmModal itself: a component's hook calls read FocusContext from its
 * OWN position in the render tree (wherever ExitConfirmModal itself sits — under
 * LayoutClientWrapper, near the app root), never from a <FocusContext.Provider>
 * that same component later renders inside its own returned JSX. Passing
 * children to <JOJOModal> doesn't re-parent the component that created them for
 * context purposes — only a component whose own function body actually executes
 * inside JOJOModalContent's subtree resolves FocusContext to the modal's
 * boundary. Keeping the buttons inline here registered them as if they were
 * direct children of the app root instead of the modal — outside
 * JOJO_MODAL_CONTAINER's isFocusBoundary entirely — so arrow presses could (and
 * did) walk straight past the modal into the navbar behind it. This exact
 * pitfall is already documented for the same reason on SearchCloseButton in
 * components/search/SearchModal.tsx.
 */
function ExitConfirmButtons({ onCancel, onExit }: { onCancel: () => void; onExit: () => void }) {
  const t = useTranslations("common");

  const { ref: cancelBtnRef, focused: cancelFocused } = useFocusable({
    focusKey: "exit-confirm-cancel-btn",
    onEnterPress: onCancel,
  });

  const { ref: exitBtnRef, focused: exitFocused } = useFocusable({
    focusKey: "exit-confirm-exit-btn",
    onEnterPress: onExit,
  });

  return (
    <div className="flex w-full items-center justify-center gap-4 mt-4">
      <button
        ref={cancelBtnRef as any}
        data-focuskey="exit-confirm-cancel-btn"
        onClick={onCancel}
        className={`flex-1 py-3 px-6 rounded-full font-bold text-sm sm:text-base transition-all cursor-pointer outline-none ${cancelFocused
            ? "bg-white text-black scale-105 shadow-xl ring-4 ring-white z-50"
            : "bg-theme_13_samecolour text-white hover:opacity-90"
          }`}
      >
        {t("cancel")}
      </button>

      <button
        ref={exitBtnRef as any}
        data-focuskey="exit-confirm-exit-btn"
        onClick={onExit}
        className={`flex-1 py-3 px-6 rounded-full font-bold text-sm sm:text-base transition-all cursor-pointer outline-none ${exitFocused
            ? "bg-red-600 text-white scale-105 shadow-xl ring-4 ring-white z-50"
            : "bg-neutral-800 text-white/80 hover:bg-neutral-700 hover:text-white"
          }`}
      >
        {t("exit_app_confirm")}
      </button>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useFocusable, setFocus, doesFocusableExist } from "@noriginmedia/norigin-spatial-navigation";
import { JOJOModal } from "@/components/ui/JOJOModal";
import { useAppUpdateStore } from "@/store/useAppUpdateStore";
import { LG_APP_ID } from "@/lib/constants/version";

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
 * Launches the native LG Content Store on webOS TV directly to the JOJO application page
 */
export function launchLGContentStore(appId = LG_APP_ID) {
  if (typeof window !== "undefined" && (window as any).webOS?.service) {
    try {
      (window as any).webOS.service.request("luna://com.webos.applicationManager", {
        method: "launch",
        parameters: {
          id: "com.webos.app.discovery",
          params: {
            category: "APPSPODS",
            id: appId,
          },
        },
        onSuccess: () => {
          console.log("[webOS] Launched LG Content Store for", appId);
        },
        onFailure: (err: any) => {
          console.warn("[webOS] Luna launch failed, opening fallback link", err);
          window.location.href = `https://in.lgappstv.com/main/tvapp/detail?appId=${appId}`;
        },
      });
      return;
    } catch (e) {
      console.error("[webOS] Exception calling applicationManager", e);
    }
  }

  // Browser/local fallback
  if (typeof window !== "undefined") {
    window.open(`https://in.lgappstv.com/main/tvapp/detail?appId=${appId}`, "_blank");
  }
}

/**
 * AppUpdateModal
 *
 * Uses the exact same JOJOModal structure and button styles as ExitConfirmModal and LogoutModal.
 */
export function AppUpdateModal() {
  const isOpen = useAppUpdateStore((s) => s.isOpen);
  const updateInfo = useAppUpdateStore((s) => s.updateInfo);
  const close = useAppUpdateStore((s) => s.closeUpdateModal);

  const isForceUpdate = updateInfo?.forceUpdate ?? false;
  const newVersion = updateInfo?.latestVersion || "";

  useEffect(() => {
    if (isOpen) {
      retrySetFocus("app-update-confirm-btn");
    }
  }, [isOpen]);

  const handleClose = () => {
    if (isForceUpdate) return;
    close();
  };

  const handleUpdate = () => {
    launchLGContentStore();
  };

  if (!isOpen) return null;

  return (
    <JOJOModal isOpen={isOpen} onClose={handleClose} showCloseButton={false}>
      <div className="space-y-3 text-center">
        <h3 className="text-[22px] sm:text-2xl font-bold text-theme_1 tracking-tight leading-snug">
          {updateInfo?.title || (newVersion ? `Update Available (v${newVersion})` : "Update Available")}
        </h3>
        <p className="text-[14px] sm:text-[15px] text-theme_6 font-normal leading-relaxed">
          {updateInfo?.message || "A new update is available on the LG Content Store. Please update the app to continue enjoying uninterrupted entertainment."}
        </p>
      </div>

      <AppUpdateButtons
        isForceUpdate={isForceUpdate}
        onCancel={handleClose}
        onUpdate={handleUpdate}
      />
    </JOJOModal>
  );
}

function AppUpdateButtons({
  isForceUpdate,
  onCancel,
  onUpdate,
}: {
  isForceUpdate: boolean;
  onCancel: () => void;
  onUpdate: () => void;
}) {
  const { ref: cancelBtnRef, focused: cancelFocused } = useFocusable({
    focusKey: "app-update-cancel-btn",
    onEnterPress: onCancel,
  });

  const { ref: updateBtnRef, focused: updateFocused } = useFocusable({
    focusKey: "app-update-confirm-btn",
    onEnterPress: onUpdate,
  });

  return (
    <div className="flex w-full items-center justify-center gap-4 mt-4">
      {!isForceUpdate && (
        <button
          ref={cancelBtnRef as any}
          data-focuskey="app-update-cancel-btn"
          onClick={onCancel}
          className={`flex-1 py-3 px-6 rounded-full font-bold text-sm sm:text-base transition-all cursor-pointer outline-none ${
            cancelFocused
              ? "bg-theme_13_samecolour text-white scale-105 shadow-xl ring-4 ring-white z-50"
              : "bg-neutral-800 text-white/80 hover:bg-neutral-700 hover:text-white"
          }`}
        >
          Later
        </button>
      )}

      <button
        ref={updateBtnRef as any}
        data-focuskey="app-update-confirm-btn"
        onClick={onUpdate}
        className={`flex-1 py-3 px-6 rounded-full font-bold text-sm sm:text-base transition-all cursor-pointer outline-none ${
          updateFocused
            ? "bg-theme_13_samecolour text-white scale-105 shadow-xl ring-4 ring-white z-50"
            : "bg-neutral-800 text-white/80 hover:bg-neutral-700 hover:text-white"
        }`}
      >
        Update Now
      </button>
    </div>
  );
}

export default AppUpdateModal;

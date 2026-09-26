"use client";

import { useEffect } from "react";
import { useFocusable, setFocus, doesFocusableExist } from "@noriginmedia/norigin-spatial-navigation";
import { JOJOModal } from "@/components/ui/JOJOModal";
import { useAppUpdateStore } from "@/store/useAppUpdateStore";
import { APP_VERSION, LG_APP_ID } from "@/lib/constants/version";
import { exitWebOSApp } from "@/lib/webos";

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
 * - When forceUpdate is TRUE: Renders an immersive, TV-optimised update view that locks the app.
 * - When forceUpdate is FALSE: Renders the standard non-blocking JOJOModal with Later / Update Now.
 */
export function AppUpdateModal() {
  const isOpen = useAppUpdateStore((s) => s.isOpen);
  const updateInfo = useAppUpdateStore((s) => s.updateInfo);
  const close = useAppUpdateStore((s) => s.closeUpdateModal);

  const isForceUpdate = updateInfo?.forceUpdate ?? false;
  const newVersion = updateInfo?.latestVersion || "";

  useEffect(() => {
    if (isOpen) {
      if (isForceUpdate) {
        retrySetFocus("force-update-confirm-btn");
      } else {
        retrySetFocus("app-update-confirm-btn");
      }
    }
  }, [isOpen, isForceUpdate]);

  const handleClose = () => {
    if (isForceUpdate) return;
    close();
  };

  const handleUpdate = () => {
    launchLGContentStore();
  };

  const handleExit = () => {
    exitWebOSApp();
  };

  if (!isOpen) return null;

  // ── FULL SCREEN FORCE UPDATE VIEW ──────────────────────────────────────────
  if (isForceUpdate) {
    return (
      <FullScreenForceUpdateView
        updateInfo={updateInfo}
        newVersion={newVersion}
        onUpdate={handleUpdate}
        onExit={handleExit}
      />
    );
  }

  // ── SOFT / OPTIONAL UPDATE MODAL ───────────────────────────────────────────
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

      <SoftUpdateButtons
        onCancel={handleClose}
        onUpdate={handleUpdate}
      />
    </JOJOModal>
  );
}

/**
 * FullScreenForceUpdateView
 *
 * Full-screen TV page built around a static artwork background. The update screen deliberately
 * avoids a full-screen SVG/Lottie render: it competes with the app start-up work and can drop
 * frames on webOS hardware.
 */
function FullScreenForceUpdateView({
  updateInfo,
  newVersion,
  onUpdate,
  onExit,
}: {
  updateInfo: any;
  newVersion: string;
  onUpdate: () => void;
  onExit: () => void;
}) {
  // Trap remote Back button on webOS: cleanly exit app rather than bypassing force update
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.keyCode === 461 || e.key === "Escape" || e.keyCode === 27) {
        e.preventDefault();
        e.stopPropagation();
        onExit();
      }
    };
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [onExit]);

  const appBase = (typeof window !== "undefined" && (window as any).__WEBOS_APP_BASE__) || "";
  const logoSrc = appBase ? `${appBase}logos/JOJO_LOGO.png` : "/logos/JOJO_LOGO.png";
  const bgImageSrc = appBase ? `${appBase}images/NEW_AUTH_BACKGROUND_IMG.webp` : "/images/NEW_AUTH_BACKGROUND_IMG.webp";

  return (
    <div
      id="jojo-force-update-fullscreen"
      className="fixed inset-0 z-[2147483646] w-screen h-screen overflow-hidden flex flex-col items-center justify-center bg-[#0a0a0c]"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "#0a0a0c",
        zIndex: 2147483646,
      }}
    >
      {/* A single image and opaque gradients are substantially smoother than a full-screen Lottie on webOS. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-center bg-cover"
        style={{
          backgroundImage: `url(${bgImageSrc})`,
          opacity: 1,
        }}
      />
      {/* One composed overlay keeps the artwork visible while preserving text contrast. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 62% 100% at 92% 48%, rgba(242, 110, 33, 0.20), transparent 70%), linear-gradient(90deg, rgba(7, 7, 11, 0.94) 0%, rgba(7, 7, 11, 0.77) 43%, rgba(7, 7, 11, 0.34) 100%), linear-gradient(0deg, rgba(7, 7, 11, 0.48) 0%, transparent 45%)",
        }}
      />

      <main className="relative z-10 grid w-[min(1100px,calc(100vw-128px))] grid-cols-[1.08fr_0.92fr] overflow-hidden rounded-[28px] border border-white/15 bg-[#121218]/95 shadow-[0_32px_100px_rgba(0,0,0,0.7)] select-none">
        <section className="flex min-h-[560px] flex-col justify-between border-r border-white/10 px-14 py-12">
          <div>
            <img
              src={logoSrc}
              alt="JOJO"
              className="h-11 w-auto object-contain"
            />
            <div className="mt-12 inline-flex items-center gap-2 rounded-full border border-theme_13_samecolour/45 bg-theme_13_samecolour/15 px-4 py-2 text-sm font-semibold tracking-[0.12em] text-[#ffb27d]">
              <span className="h-2 w-2 rounded-full bg-theme_13_samecolour" />
              UPDATE REQUIRED
            </div>
            <h1 className="mt-6 max-w-[520px] text-[42px] font-bold leading-[1.12] tracking-[-0.03em] text-white">
              {updateInfo?.title || "A new version is ready"}
            </h1>
            <p className="mt-5 max-w-[510px] text-[18px] leading-8 text-white/65">
              {updateInfo?.message || "Update JOJO from the LG Content Store to keep watching your favourite entertainment."}
            </p>
          </div>

          <div className="mt-10 flex items-center gap-3 text-sm text-white/45">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/15 text-base text-white/70">↵</span>
            Use your remote to select an action
          </div>
        </section>

        <aside className="flex min-h-[560px] flex-col justify-center px-12 py-12">
          <div className="mb-9">
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-white/45">Version update</p>
            <div className="mt-4 flex items-center gap-3">
              <span className="rounded-lg bg-white/[0.07] px-4 py-2.5 font-mono text-lg text-white/55">v{APP_VERSION}</span>
              <span className="text-xl text-theme_13_samecolour">→</span>
              <span className="rounded-lg bg-theme_13_samecolour/15 px-4 py-2.5 font-mono text-lg font-semibold text-white">v{newVersion || "Latest"}</span>
            </div>
          </div>

          <ForceUpdateButtons onUpdate={onUpdate} onExit={onExit} />
        </aside>
      </main>
    </div>
  );
}

function ForceUpdateButtons({
  onUpdate,
  onExit,
}: {
  onUpdate: () => void;
  onExit: () => void;
}) {
  const { ref: exitBtnRef, focused: exitFocused } = useFocusable({
    focusKey: "force-update-exit-btn",
    onEnterPress: onExit,
  });

  const { ref: updateBtnRef, focused: updateFocused } = useFocusable({
    focusKey: "force-update-confirm-btn",
    onEnterPress: onUpdate,
  });

  return (
    <div className="flex w-full flex-col gap-4">
      <button
        ref={updateBtnRef as any}
        data-focuskey="force-update-confirm-btn"
        tabIndex={0}
        onClick={onUpdate}
        className={`h-[62px] rounded-xl font-bold text-[17px] transition-all cursor-pointer outline-none flex items-center justify-center gap-3 ${
          updateFocused
            ? "bg-theme_13_samecolour text-white scale-[1.035] ring-4 ring-white ring-offset-4 ring-offset-[#121218] shadow-[0_16px_32px_rgba(242,110,33,0.38)]"
            : "bg-theme_13_samecolour text-white hover:brightness-110"
        }`}
      >
        Update in LG Content Store
      </button>

      <button
        ref={exitBtnRef as any}
        data-focuskey="force-update-exit-btn"
        tabIndex={0}
        onClick={onExit}
        className={`h-[54px] rounded-xl border font-semibold text-[16px] transition-all cursor-pointer outline-none flex items-center justify-center ${
          exitFocused
            ? "border-white bg-white text-[#121218] scale-[1.035] shadow-[0_0_0_4px_rgba(242,110,33,0.8)]"
            : "border-white/20 bg-white/[0.04] text-white/75 hover:bg-white/[0.1] hover:text-white"
        }`}
      >
        Exit app
      </button>
    </div>
  );
}

function SoftUpdateButtons({
  onCancel,
  onUpdate,
}: {
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

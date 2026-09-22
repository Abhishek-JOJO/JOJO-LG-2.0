"use client";

import { cn } from "@/lib/utils";
import { useFocusable, FocusContext, setFocus } from "@noriginmedia/norigin-spatial-navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

export type LoginMode = "phone" | "remote";

interface LoginModeToggleProps {
  mode: LoginMode;
  onChange: (mode: LoginMode) => void;
}

export function LoginModeToggle({ mode, onChange }: LoginModeToggleProps) {
  const t = useTranslations("loginPage");
  const { ref, focusKey } = useFocusable({
    focusKey: "LOGIN_MODE_TOGGLE_CONTAINER",
    trackChildren: true,
  });

  return (
    <FocusContext.Provider value={focusKey}>
      <div
        ref={ref as any}
        className="relative flex items-center gap-2 rounded-full bg-[#27211e] border border-white/10 p-2 shadow-2xl overflow-visible"
      >
        <ToggleOption
          focusKey="login-mode-phone"
          active={mode === "phone"}
          label={t("use_phone") || "Use Phone"}
          onSelect={() => onChange("phone")}
        />
        <ToggleOption
          focusKey="login-mode-remote"
          active={mode === "remote"}
          label={t("use_remote") || "Use Remote"}
          onSelect={() => onChange("remote")}
        />
      </div>
    </FocusContext.Provider>
  );
}

function ToggleOption({
  focusKey,
  active,
  label,
  onSelect,
}: {
  focusKey: string;
  active: boolean;
  label: string;
  onSelect: () => void;
}) {
  const { ref, focused } = useFocusable({
    focusKey,
    onFocus: onSelect,
    onEnterPress: () => {
      onSelect();
      if (focusKey === "login-mode-remote") {
        setFocus("login-input");
        const el = document.getElementById("login-input-field");
        if (el) el.focus();
      }
    },
    onArrowPress: (direction) => {
      if (direction === "up") {
        return false;
      }
      if (direction === "left") {
        if (focusKey === "login-mode-remote") {
          setFocus("login-mode-phone");
          return false;
        }
        return false;
      }
      if (direction === "right") {
        if (focusKey === "login-mode-phone") {
          setFocus("login-mode-remote");
          return false;
        }
        return false;
      }
      if (direction === "down") {
        if (focusKey === "login-mode-remote") {
          setFocus("login-input");
          const el = document.getElementById("login-input-field");
          if (el) el.focus();
          return false;
        }
        if (focusKey === "login-mode-phone") {
          const refreshBtn = document.querySelector('[data-focuskey="qr-refresh-btn"]');
          if (refreshBtn) {
            setFocus("qr-refresh-btn");
            return false;
          }
          return false;
        }
      }
      return true;
    },
  });

  return (
    <motion.button
      ref={ref as any}
      type="button"
      onClick={() => {
        onSelect();
        if (focusKey === "login-mode-remote") {
          setFocus("login-input");
          const el = document.getElementById("login-input-field");
          if (el) el.focus();
        }
      }}
      animate={{ scale: focused ? 1.05 : 1 }}
      transition={{ type: "spring", stiffness: 450, damping: 30 }}
      className="relative rounded-full px-8 py-3 text-lg font-bold outline-none cursor-pointer select-none whitespace-nowrap z-10 transition-all duration-200"
    >
      {/* Netflix-style smooth sliding active tab pill */}
      {active && (
        <motion.div
          layoutId="loginModePill"
          className="absolute inset-0 bg-white rounded-full z-0"
          transition={{ type: "spring", stiffness: 450, damping: 32 }}
        />
      )}

      {/* Clean solid crisp focus ring with no shadow or glow */}
      {focused && (
        <span
          className="absolute -inset-[5px] rounded-full pointer-events-none z-20"
          style={{
            border: "3px solid #ffffff",
          }}
        />
      )}

      <span
        className={cn(
          "relative z-10 transition-colors duration-200",
          active ? "text-black font-extrabold" : "text-white/80"
        )}
      >
        {label}
      </span>
    </motion.button>
  );
}

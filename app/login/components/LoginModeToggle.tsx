"use client";

import { cn } from "@/lib/utils";
import { useFocusable, FocusContext } from "@noriginmedia/norigin-spatial-navigation";
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
        className="relative flex items-center gap-1.5 rounded-full bg-[#27211e] border border-white/10 p-1.5 shadow-2xl overflow-hidden"
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
    onEnterPress: onSelect,
    onFocus: onSelect,
  });

  return (
    <motion.button
      ref={ref as any}
      type="button"
      onClick={onSelect}
      animate={{ scale: focused ? 1.05 : 1 }}
      transition={{ type: "spring", stiffness: 450, damping: 30 }}
      className="relative rounded-full px-8 py-3 text-lg font-bold outline-none cursor-pointer select-none whitespace-nowrap z-10"
    >
      {/* Netflix-style smooth sliding active tab pill */}
      {active && (
        <motion.div
          layoutId="loginModePill"
          className="absolute inset-0 bg-white rounded-full shadow-lg z-0"
          transition={{ type: "spring", stiffness: 450, damping: 32 }}
        />
      )}

      {/* Dark fallback pill for inactive item */}
      {!active && (
        <div className="absolute inset-0 bg-[#3a3330] rounded-full z-0 hover:bg-[#443c39]" />
      )}

      <span
        className={cn(
          "relative z-10 transition-colors duration-200",
          active ? "text-black font-extrabold" : "text-white/90",
          focused && active ? "ring-4 ring-white rounded-full" : ""
        )}
      >
        {label}
      </span>
    </motion.button>
  );
}

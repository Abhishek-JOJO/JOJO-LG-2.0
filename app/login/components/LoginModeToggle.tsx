"use client";

import { cn } from "@/lib/utils";
import { useFocusable } from "@noriginmedia/norigin-spatial-navigation";
import { useTranslations } from "next-intl";

export type LoginMode = "phone" | "remote";

interface LoginModeToggleProps {
  mode: LoginMode;
  onChange: (mode: LoginMode) => void;
}

export function LoginModeToggle({ mode, onChange }: LoginModeToggleProps) {
  const t = useTranslations("loginPage");

  return (
    <div className="flex items-center gap-1 rounded-full bg-theme_10_50 p-1">
      <ToggleOption
        focusKey="login-mode-phone"
        active={mode === "phone"}
        label={t("use_phone")}
        onSelect={() => onChange("phone")}
      />
      <ToggleOption
        focusKey="login-mode-remote"
        active={mode === "remote"}
        label={t("use_remote")}
        onSelect={() => onChange("remote")}
      />
    </div>
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
  const { ref, focused } = useFocusable({ focusKey, onEnterPress: onSelect });

  return (
    <button
      ref={ref as any}
      type="button"
      onClick={onSelect}
      className={cn(
        "rounded-full px-6 py-2.5 body-sm-medium transition-all outline-none cursor-pointer",
        active ? "bg-theme_1 text-theme_12" : "text-theme_1/80 hover:text-theme_1",
        focused ? "ring-2 ring-theme_13_samecolour scale-105" : ""
      )}
    >
      {label}
    </button>
  );
}

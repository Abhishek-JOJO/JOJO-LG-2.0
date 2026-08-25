"use client";

import { useThemeStore } from "@store/useThemeStore";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";

interface DarkLightToggleProps {
  className?: string;
  disabled?: boolean;
}

export function DarkLightToggle({ className, disabled }: DarkLightToggleProps) {
  const { theme, setTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <div className={cn("text-theme_5 opacity-50 select-none", className)}>
        Dark
      </div>
    );
  }

  const handleThemeChange = (value: string) => {
    setTheme(value as "dark" | "light");
  };

  return (
    <Select value={theme} onValueChange={handleThemeChange} disabled={disabled}>
      <SelectTrigger
        aria-label="Select theme"
        className={cn(
          "bg-transparent hover:bg-transparent px-0 h-auto gap-1 border-none min-w-0 shadow-none ring-0 select-none cursor-pointer text-theme_13",
          className
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="z-1002 bg-theme_10 border border-theme_9">
        <SelectGroup>
          <SelectItem value="dark">Dark</SelectItem>
          <SelectItem value="light">Light</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

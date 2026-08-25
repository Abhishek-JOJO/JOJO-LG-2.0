"use client";

import { useProductionSecurity, ProductionSecurityOptions } from "@/hooks/useProductionSecurity";

export interface ProductionSecurityGuardProps extends ProductionSecurityOptions {
  children?: React.ReactNode;
}

/**
 * Production Security Guard Component
 * Enforces strict right-click restriction, DevTools shortcut blocking, console log suppression,
 * and anti-debugging protection in Next.js.
 */
export function ProductionSecurityGuard({
  children,
  enabled = true,
  suppressConsoleLogs = true,
  enableDebuggerTrap = true,
}: ProductionSecurityGuardProps) {
  useProductionSecurity({
    enabled,
    suppressConsoleLogs,
    enableDebuggerTrap,
  });

  return <>{children}</>;
}

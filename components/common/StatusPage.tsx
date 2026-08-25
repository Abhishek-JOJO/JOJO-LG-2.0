"use client";

import { StatusPageProps } from "@/types/global.types";
import { useTranslations } from "next-intl";

export function StatusPage({ codeKey, titleKey, descKey, codeColor }: StatusPageProps) {
  const t = useTranslations("statusPages");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className={`text-6xl font-black ${codeColor}`}>{t(codeKey)}</h1>
      <h2 className="text-2xl font-semibold">{t(titleKey)}</h2>
      <p className="text-muted-foreground text-center max-w-md">{t(descKey)}</p>
    </main>
  );
}

"use client";

import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-theme_12 text-theme_1 text-center px-6">
      <h1 className="text-7xl font-black text-theme_13_samecolour m-0">404</h1>
      <h2 className="text-2xl font-semibold m-0">Page Not Found</h2>
      <p className="text-theme_5 m-0">The page you were looking for doesn&apos;t exist.</p>
      <Link
        href={ROUTES.HOME}
        className="mt-2 px-8 py-3 rounded-full bg-theme_13_samecolour text-theme_1 font-semibold no-underline transition-opacity hover:opacity-90"
      >
        Go Home
      </Link>
    </div>
  );
}

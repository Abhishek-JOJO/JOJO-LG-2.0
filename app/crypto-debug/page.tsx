"use client";

import { Suspense } from "react";
import { CryptoDebugClient } from "./CryptoDebugClient";
import { Loader } from "@/components/common/Loader";

export default function CryptoDebugPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black">
          <Loader />
        </div>
      }
    >
      <CryptoDebugClient />
    </Suspense>
  );
}

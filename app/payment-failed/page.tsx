"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { XCircle, RefreshCw, Home } from "lucide-react";
import { useToastStore } from "@/store/useToastStore";

export default function PaymentFailedPage() {
  const router = useRouter();
  const { show: showToast } = useToastStore();
  
  const [errorState, setErrorState] = useState<any>(null);

  // Retrieve error payload from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("payment_failed_state");
      if (saved) {
        setErrorState(JSON.parse(saved));
        // Clear immediately so it doesn't linger
        sessionStorage.removeItem("payment_failed_state");
      } else {
        showToast("No failed transaction records found.", "info");
        router.replace("/");
      }
    } catch (e) {
      router.replace("/");
    }
  }, [router, showToast]);

  if (!errorState) {
    return (
      <div className="min-h-screen bg-theme_12 flex items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-theme_13 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const { error } = errorState;

  return (
    <div className="relative min-h-screen bg-theme_12 text-white flex flex-col items-center justify-center px-4 py-16 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-red-500/5 blur-[130px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-neutral-950/75 border border-neutral-900 backdrop-blur-md rounded-3xl p-8 sm:p-10 shadow-2xl text-center flex flex-col items-center">
        {/* Error Icon */}
        <div className="w-20 h-20 rounded-full bg-red-500/15 flex items-center justify-center border border-red-500/30 mb-6 text-red-500">
          <XCircle size={44} strokeWidth={1.5} />
        </div>

        <h1 className="text-2xl font-black text-white mb-2">Payment Failed</h1>
        
        <p className="text-neutral-400 text-sm mb-8 leading-relaxed max-w-xs mx-auto">
          {error || "Unfortunately, your payment could not be processed. Please verify your payment details and try again."}
        </p>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={() => router.replace("/subscription")}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-theme_13 to-orange-600 text-white font-black text-sm flex items-center justify-center gap-2 hover:brightness-105 active:scale-98 transition-all"
          >
            <RefreshCw size={16} />
            <span>Try Again</span>
          </button>
          
          <button
            onClick={() => router.replace("/")}
            className="w-full py-3.5 rounded-2xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-300 font-bold text-sm flex items-center justify-center gap-2 active:scale-98 transition-all"
          >
            <Home size={16} />
            <span>Back to Home</span>
          </button>
        </div>
      </div>
    </div>
  );
}

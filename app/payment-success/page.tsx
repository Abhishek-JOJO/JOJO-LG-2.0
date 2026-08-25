"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CheckCircle, Home, Play, Calendar, DollarSign, Clock } from "lucide-react";
import { useToastStore } from "@/store/useToastStore";
import { LOGOS } from "@/lib/constants/assets";
import { ROUTES } from "@/lib/constants/routes";
import { MainLoader } from "@/components/common/Loader";
import dynamic from "next/dynamic";
import confettiAnimation from "@/public/lottie/CONFETTI.json";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

function formatDateToDDMMYYYY(dateStr?: string) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function PaymentSuccessPage() {
  const router = useRouter();
  const { show: showToast } = useToastStore();
  
  const [successState, setSuccessState] = useState<any>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Retrieve success payload from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("payment_success_state");
      if (saved) {
        setSuccessState(JSON.parse(saved));
        setShowConfetti(true);
        // Clear immediately so it doesn't linger
        sessionStorage.removeItem("payment_success_state");
      } else {
        showToast("No active checkout found.", "info");
        router.replace("/");
      }
    } catch (e) {
      router.replace("/");
    }
  }, [router, showToast]);

  if (!successState) {
    return <MainLoader />;
  }

  const {
    matchedType,
    matchedRecord,
    verificationData,
    planModel,
  } = successState;

  const isSVOD = matchedType === "SVOD";

  // SVOD parsing
  const svodRecord = matchedRecord || {};
  const planName = svodRecord.oProductTranslation?.sName || svodRecord.sSubProductLabel || planModel?.name || "Premium Plan";
  const groupName = svodRecord.oGroupTranslation?.sName || planModel?.title || "JOJO Gold";
  const rawFeatures = svodRecord.aFeatures || planModel?.features || planModel?.aFeatures || [];
  const features = rawFeatures.map((f: any) => ({
    id: f.sFeatureId || f.featureId || Math.random().toString(),
    name: f.sFeatureName || f.featureName || f.sTitle || "",
    imageUrl: f.sFeatureImageUrl || f.featureImageUrl || f.sIcon || "",
  }));

  // TVOD parsing
  const tvodRecord = matchedRecord || {};
  const assetName = tvodRecord.oProductTranslation?.sTitle || tvodRecord.oProductTranslation?.sName || planModel?.oProductTranslation?.sTitle || planModel?.name || "Premium Content";
  const amountPaid = tvodRecord.nAmount || planModel?.pricing?.nPrice || 0;
  const currencySymbol = planModel?.pricing?.sCurrencySymbol || "₹";
  const rentalDays = tvodRecord.nRentalValidityDays || tvodRecord.nInitialValidityDays || planModel?.nRentalValidityDays || 30;
  
  const assetIds = tvodRecord.aAssetIds || [];
  
  const returnWatchAssetId = typeof window !== "undefined" ? sessionStorage.getItem("return_watch_asset_id") : null;
  const targetAssetId = assetIds[0] || planModel?.assetId || planModel?.assetMetadata?.assetId || returnWatchAssetId;

  const landscapeImage = planModel?.assetMetadata?.landscapeImage || planModel?.landscapeImage || planModel?.sLandscapeImage || tvodRecord.sLandscapeImage || tvodRecord.assetMetadata?.landscapeImage || "";

  const handleStartWatching = () => {
    if (targetAssetId) {
      try {
        const cached = sessionStorage.getItem(`play_metadata_${targetAssetId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          // Always mark TVOD as purchased — this covers both non-SVOD and SVOD+TVOD users.
          // Without this, SVOD subscribers who also rent a TVOD asset would see ads.
          parsed.isTvodPurchased = true;
          sessionStorage.setItem(`play_metadata_${targetAssetId}`, JSON.stringify(parsed));
        }
      } catch (e) {
        console.error("Failed to update play metadata", e);
      }
      
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("return_watch_asset_id");
      }
      
      router.push(ROUTES.WATCH(targetAssetId));
    } else {
      router.push("/");
    }
  };

  return (
    <div className="relative min-h-screen bg-theme_12 text-white flex flex-col items-center justify-center px-4 py-16 overflow-hidden">
      {/* Lottie Confetti Effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-[100] overflow-hidden">
          <Lottie 
            animationData={confettiAnimation} 
            loop={false}
            autoplay={true}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      )}

      {/* Background decoration */}
      <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-emerald-500/10 blur-[130px] pointer-events-none" />

      <div
        className={`relative z-10 w-full max-w-[440px] backdrop-blur-md rounded-[28px] p-6 sm:p-8 text-center flex flex-col items-center transition-all duration-300 ${
          isSVOD
            ? "bg-neutral-950/75 border border-neutral-900 shadow-2xl"
            : "border-[2px] border-transparent"
        }`}
        style={
          isSVOD
            ? {}
            : {
                background:
                  "linear-gradient(180deg, #1C120A 0%, #100D08 100%) padding-box, linear-gradient(191.09deg, #FAAF3F 0%, rgba(250, 175, 63, 0.16) 25%, rgba(250, 175, 63, 0) 50%, rgba(250, 175, 63, 0.16) 75%, #FAAF3F 100%) border-box",
                boxShadow: "0 0 40px rgba(250, 175, 63, 0.15)",
              }
        }
      >
        {isSVOD ? (
          <>
            {/* Success Icon */}
            <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center border border-emerald-500/30 mb-6 text-emerald-400">
              <CheckCircle size={44} strokeWidth={1.5} />
            </div>

            <h1 className="text-3xl font-black text-white mb-2">Congratulations!</h1>

            <p className="text-neutral-400 text-sm mb-6 max-w-sm">
              Your account has been successfully upgraded to Premium.
            </p>

            {/* JOJO Gold card */}
            <div className="w-full p-6 rounded-2xl bg-gradient-to-b from-[#25150a] to-[#120a05] border border-orange-500/20 shadow-xl mb-6 relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl" />
              <div className="relative h-8 w-32 mx-auto mb-4">
                <Image
                  src={LOGOS.JOJO_GOLD}
                  alt="JOJO Gold"
                  fill
                  style={{ objectFit: "contain" }}
                />
              </div>
              <p className="text-xs text-orange-400 font-semibold mb-2 uppercase tracking-widest">
                Active Member
              </p>
              <h3 className="text-lg font-bold text-white mb-1">
                {planName} ({groupName})
              </h3>
              {svodRecord.dEndDate && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[11px] font-bold text-orange-400 mt-2">
                  <Calendar size={12} />
                  <span>Valid Till: {formatDateToDDMMYYYY(svodRecord.dEndDate)}</span>
                </div>
              )}
            </div>

            {/* Premium Features List */}
            {features.length > 0 && (
              <div className="w-full mb-8">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest text-left mb-3 px-1">
                  Features unlocked
                </h4>
                <div className="grid grid-cols-2 gap-3 text-left">
                  {features.map((feature: any) => (
                    <div
                      key={feature.id}
                      className="flex items-center gap-2.5 p-2 rounded-xl bg-neutral-900/40 border border-neutral-900/60"
                    >
                      {feature.imageUrl ? (
                        <div className="relative w-8 h-8 flex-shrink-0">
                          <Image
                            src={feature.imageUrl}
                            alt={feature.name}
                            fill
                            style={{ objectFit: "contain" }}
                            className="brightness-110 filter"
                          />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center text-orange-500">
                          <CheckCircle size={16} />
                        </div>
                      )}
                      <span className="text-xs font-semibold text-neutral-200 leading-snug">
                        {feature.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Cover Image/Poster */}
            {landscapeImage ? (
              <div className="relative w-full aspect-[16/9] rounded-[20px] overflow-hidden mb-6 border border-white/5">
                <Image
                  src={landscapeImage}
                  alt={assetName}
                  fill
                  className="object-cover"
                  sizes="(max-width: 440px) 100vw, 440px"
                  priority
                />
              </div>
            ) : (
              <div className="relative w-full aspect-[16/9] rounded-[20px] bg-neutral-900/60 flex items-center justify-center mb-6 border border-white/5">
                <span className="text-neutral-500 text-sm font-semibold">{assetName}</span>
              </div>
            )}

            {/* Ready to Watch Title flanked by Dashed Lines */}
            <div className="flex items-center w-full mb-2">
              <div className="flex-1 border-t border-dashed border-[#FAAF3F]/20"></div>
              <h2 className="px-4 text-[#FAAF3F] text-xl font-bold tracking-wide whitespace-nowrap">
                Ready to Watch!
              </h2>
              <div className="flex-1 border-t border-dashed border-[#FAAF3F]/20"></div>
            </div>

            {/* Subtitle */}
            <p className="text-sm text-[#FAAF3F]/90 text-center font-semibold mb-4">
              Successfully added to your rented titles.
            </p>

            {/* Description */}
            <p className="text-sm text-neutral-300/90 text-center leading-relaxed mb-8 max-w-[340px]">
              This video is now available in your library.
              <br />
              You have {rentalDays} days to finish it once started.
            </p>
          </>
        )}

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-3">
          {isSVOD ? (
            <div className="w-full flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleStartWatching}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-theme_13 to-orange-600 text-white font-black text-sm flex items-center justify-center gap-2 hover:brightness-105 active:scale-98 transition-all animate-fadeIn"
              >
                <Play size={16} fill="currentColor" />
                <span>Start Watching</span>
              </button>
              
              <button
                onClick={() => router.push("/")}
                className="flex-1 py-3.5 rounded-2xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-300 font-bold text-sm flex items-center justify-center gap-2 active:scale-98 transition-all animate-fadeIn"
              >
                <Home size={16} />
                <span>Go to Home</span>
              </button>
            </div>
          ) : (
            <>
              {/* Start Watching Button */}
              <button
                onClick={handleStartWatching}
                className="w-full py-4 rounded-full text-black font-extrabold text-sm hover:brightness-110 active:scale-98 transition-all shadow-xl shadow-orange-500/5 cursor-pointer text-center"
                style={{
                  background: "linear-gradient(44.13deg, #FAAF3F 21.63%, #FFD691 49.52%, #FAAF3F 81.68%)",
                }}
              >
                Start Watching
              </button>

              {/* Later Button */}
              <button
                onClick={() => router.push("/")}
                className="w-full py-4 rounded-full font-bold text-sm hover:brightness-110 active:scale-98 transition-all border border-[#FAAF3F]/15 cursor-pointer text-center"
                style={{
                  background: "#1C120A",
                  color: "#FAAF3F",
                }}
              >
                Later
              </button>
            </>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(-10px) rotate(0deg);
            opacity: 0.85;
          }
          100% {
            transform: translateY(105vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confettiFall {
          animation-name: confettiFall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
      `}</style>
    </div>
  );
}

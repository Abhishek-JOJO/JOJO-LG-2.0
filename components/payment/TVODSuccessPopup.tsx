"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ROUTES } from "@/lib/constants/routes";

interface TVODSuccessPopupProps {
  successData: any;
  onClose: () => void;
}

export default function TVODSuccessPopup({ successData, onClose }: TVODSuccessPopupProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!mounted || !successData) return null;

  const { matchedRecord, planModel } = successData;
  const tvodRecord = matchedRecord || {};

  // Extract TVOD Details
  const assetName =
    tvodRecord.oProductTranslation?.sTitle ||
    tvodRecord.oProductTranslation?.sName ||
    planModel?.oProductTranslation?.sTitle ||
    planModel?.name ||
    "Premium Content";

  const rentalDays =
    tvodRecord.nRentalValidityDays ||
    tvodRecord.nInitialValidityDays ||
    planModel?.nRentalValidityDays ||
    planModel?.validityDays ||
    7;

  const assetId =
    planModel?.assetId ||
    planModel?.assetMetadata?.assetId ||
    tvodRecord.aAssetIds?.[0] ||
    tvodRecord.assetId ||
    "";

  const landscapeImage =
    planModel?.assetMetadata?.landscapeImage ||
    planModel?.landscapeImage ||
    planModel?.sLandscapeImage ||
    tvodRecord.sLandscapeImage ||
    tvodRecord.assetMetadata?.landscapeImage ||
    "";

  const handleStartWatching = () => {
    onClose();
    if (assetId) {
      router.push(ROUTES.WATCH(assetId));
    } else {
      router.push("/");
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 backdrop-blur-md px-4 animate-fadeIn">
      <div
        className="relative w-full max-w-[440px] rounded-[28px] p-6 sm:p-8 flex flex-col items-center border-[2px] border-transparent transition-all duration-300"
        style={{
          background:
            "linear-gradient(180deg, #1C120A 0%, #100D08 100%) padding-box, linear-gradient(191.09deg, #FAAF3F 0%, rgba(250, 175, 63, 0.16) 25%, rgba(250, 175, 63, 0) 50%, rgba(250, 175, 63, 0.16) 75%, #FAAF3F 100%) border-box",
          boxShadow: "0 0 40px rgba(250, 175, 63, 0.15)",
        }}
      >
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

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-3">
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
            onClick={onClose}
            className="w-full py-4 rounded-full font-bold text-sm hover:brightness-110 active:scale-98 transition-all border border-[#FAAF3F]/15 cursor-pointer text-center"
            style={{
              background: "#1C120A",
              color: "#FAAF3F",
            }}
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}

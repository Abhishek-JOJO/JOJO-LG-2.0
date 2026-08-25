"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Monitor, Tv, Gem, Hourglass } from "lucide-react";
import { LOGOS } from "@/lib/constants/assets";

interface SubscriptionSuccessPopupProps {
  successData: any;
  onClose: () => void;
}

function formatSuccessDate(dateStr?: string) {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    const day = date.getDate();
    const year = date.getFullYear();
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const month = months[date.getMonth()];

    // Add ordinal suffix (st, nd, rd, th)
    const getOrdinal = (n: number) => {
      if (n > 3 && n < 21) return "th";
      switch (n % 10) {
        case 1:
          return "st";
        case 2:
          return "nd";
        case 3:
          return "rd";
        default:
          return "th";
      }
    };

    return `${day}${getOrdinal(day)} ${month}, ${year}`;
  } catch {
    return dateStr || "";
  }
}

const getValidityText = (record: any, model: any) => {
  const days = record?.nValidityDays || model?.validityDays || 0;
  if (days === 365 || days === 366) return "12 Months";
  if (days === 30) return "1 Month";
  if (days === 90) return "3 Months";
  if (days === 180) return "6 Months";

  // Fallbacks
  const count = record?.nValidityCount || model?.validityCount;
  const duration = record?.sValidityDuration || model?.validityDuration;
  if (count && duration) {
    const unit = duration.toLowerCase().includes("month")
      ? "Month"
      : duration.toLowerCase().includes("year")
      ? "Year"
      : "Day";
    return `${count} ${unit}${count > 1 ? "s" : ""}`;
  }

  return "12 Months"; // default fallback matching mock
};

export default function SubscriptionSuccessPopup({ successData, onClose }: SubscriptionSuccessPopupProps) {
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
  const svodRecord = matchedRecord || {};

  const validityText = getValidityText(svodRecord, planModel);
  const expiryDateFormatted = formatSuccessDate(svodRecord.dEndDate);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 backdrop-blur-md px-4 animate-fadeIn">
      <div 
        className="relative w-full max-w-[460px] rounded-[24px] p-8 sm:p-9 shadow-2xl flex flex-col items-center border-[2px] border-transparent"
        style={{
          background: "linear-gradient(var(--theme_10, #191919), var(--theme_10, #191919)) padding-box, linear-gradient(251.25deg, rgba(255, 255, 255, 0.3) 1.71%, rgba(255, 255, 255, 0.05) 51.72%, rgba(255, 255, 255, 0.3) 101.72%) border-box",
        }}
      >
        {/* Title */}
        <h2 
          className="text-2xl sm:text-3xl font-black tracking-wide text-center"
          style={{
            backgroundImage: "linear-gradient(44.13deg, #FAAF3F 21.63%, #FFD691 49.52%, #FAAF3F 81.68%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Congratulations!
        </h2>
        <p className="text-sm text-neutral-300 mt-2.5 text-center font-medium">
          You are successfully upgraded to
        </p>

        {/* JOJO Gold Logo */}
        <div className="relative h-14 w-40 sm:w-44 my-4 flex-shrink-0">
          <Image
            src={LOGOS.JOJO_GOLD}
            alt="JOJO Gold"
            fill
            style={{ objectFit: "contain" }}
            priority
          />
        </div>

        {/* Separator line */}
        <div 
          className="w-full h-[1px] mb-6" 
          style={{
            background: "linear-gradient(90deg, rgba(250, 175, 63, 0) 0%, rgba(250, 175, 63, 0.35) 50%, rgba(250, 175, 63, 0) 100%)"
          }}
        />

        {/* Features list (4 Columns) */}
        <div className="w-full grid grid-cols-4 gap-2 mb-8 text-center">
          {/* Feature 1 */}
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 flex items-center justify-center text-white mb-2">
              <Tv size={24} strokeWidth={1.5} />
            </div>
            <span className="text-[10px] text-neutral-300 font-medium leading-tight max-w-[80px]">
              No In-Video Ads
            </span>
          </div>

          {/* Feature 2 */}
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 flex items-center justify-center text-white mb-2">
              <Monitor size={24} strokeWidth={1.5} />
            </div>
            <span className="text-[10px] text-neutral-300 font-medium leading-tight max-w-[80px]">
              Watch on upto 4 Devices
            </span>
          </div>

          {/* Feature 3 */}
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 flex items-center justify-center text-white mb-2">
              <Gem size={22} strokeWidth={1.5} />
            </div>
            <span className="text-[10px] text-neutral-300 font-medium leading-tight max-w-[80px]">
              Exclusive Content
            </span>
          </div>

          {/* Feature 4 */}
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 flex items-center justify-center text-white mb-2">
              <Hourglass size={22} strokeWidth={1.5} />
            </div>
            <span className="text-[10px] text-neutral-300 font-medium leading-tight max-w-[80px]">
              Early Bird Access
            </span>
          </div>
        </div>

        {/* Validity Box */}
        <div 
          className="w-full rounded-[16px] p-5 mb-6 border border-transparent"
          style={{
            background: "linear-gradient(#191919, #191919) padding-box, linear-gradient(251.25deg, rgba(255, 255, 255, 0.15) 1.71%, rgba(255, 255, 255, 0.02) 51.72%, rgba(255, 255, 255, 0.15) 101.72%) border-box"
          }}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-white tracking-wide">
              Validity
            </span>
            <span className="text-sm font-bold text-white">
              {validityText}
            </span>
          </div>
          {expiryDateFormatted && (
            <div className="w-full h-[1px] bg-white/5 my-2.5" />
          )}
          {expiryDateFormatted && (
            <p className="text-xs text-neutral-400 text-left font-medium">
              Your subscription ends on {expiryDateFormatted}.
            </p>
          )}
        </div>

        {/* Terms line */}
        <p className="text-[10px] text-neutral-500 font-medium mb-6 text-center">
          By proceeding you agree to our Terms of Use
        </p>

        {/* CTA Button */}
        <button
          onClick={onClose}
          className="w-full max-w-[240px] py-4 rounded-full text-black font-extrabold text-sm hover:brightness-110 active:scale-98 transition-all shadow-xl shadow-orange-500/5 cursor-pointer text-center"
          style={{
            background: "linear-gradient(44.13deg, #FAAF3F 21.63%, #FFD691 49.52%, #FAAF3F 81.68%)"
          }}
        >
          Start Streaming
        </button>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { cn, GOLD_CARD_FEATURES } from "@/lib/utils";
import { JOJOCustomCard } from "@/components/ui/JOJOCard";
import JOJOCommonImage from "@/components/ui/JOJOCommonImage";

export interface JOJOGoldCardProps extends React.HTMLAttributes<HTMLDivElement> { }

export const JOJOGoldCard = React.forwardRef<HTMLDivElement, JOJOGoldCardProps>(
  function JOJOGoldCard({ className, style, ...props }, ref) {
    return (
      <JOJOCustomCard
        ref={ref}
        bgColor="var(--gold-card-bg-gradient)"
        borderGradient="#FFD691"
        cardConfig={{
          borderWidth: 2,
          borderRadius: "24px",
          gap: "0px",
        }}
        className={cn(
          "w-full max-w-[500px] mx-auto select-none relative overflow-hidden p-8 sm:p-12 md:p-16",
          className
        )}
        style={{
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          ...style,
        }}
        {...props}
      >
        {/* Header section with horizontal lines */}
        <div className="flex items-center justify-center w-full gap-3 sm:gap-6 mb-10 md:mb-5">
          {/* Logo container */}
          <div className="relative h-14 w-64 sm:h-16 sm:w-84 md:h-20 md:w-94 flex-shrink-0">
            <JOJOCommonImage
              src="/logos/JOJO-GOLD-LOGO.png"
              alt="JOJO Gold Logo"
              fill
              contentMode="contain"
              priority
              wrapperClassName="w-full h-full"
            />
          </div>
        </div>

        {/* Features section */}
        <div className="w-full flex justify-evenly">
          {GOLD_CARD_FEATURES.map((feature, idx) => (
            <div key={idx} className="flex flex-col items-center text-center">
              {/* Icon Container with hover animation */}
              <div className="relative w-14 h-14 sm:w-15 sm:h-15 mb-3 flex items-center justify-center">
                <JOJOCommonImage
                  src={feature.icon}
                  alt={feature.alt}
                  fill
                  contentMode="contain"
                  wrapperClassName="w-full h-full"
                />
              </div>

              {/* Feature Text */}
              <p className="gold-text-gradient font-medium text-xs leading-snug whitespace-pre-line tracking-wide mt-2">
                {feature.text}
              </p>
            </div>
          ))}
        </div>
      </JOJOCustomCard>
    );
  }
);

JOJOGoldCard.displayName = "JOJOGoldCard";


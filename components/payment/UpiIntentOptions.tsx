"use client";

import { useState } from "react";
import { Check } from "lucide-react";

interface UpiApp {
  name: string;
  displayName: string;
  icon: string;
}

interface UpiIntentOptionsProps {
  apps: UpiApp[];
  selectedApp: string | null;
  onSelectApp: (appName: string) => void;
  isLoading?: boolean;
}

export default function UpiIntentOptions({ 
  apps, 
  selectedApp,
  onSelectApp, 
  isLoading 
}: UpiIntentOptionsProps) {
  if (!apps || apps.length === 0) {
    return (
      <div className="text-center py-6 text-theme_5 text-sm">
        <p className="mb-2">No UPI apps detected on your device</p>
        <p className="text-xs opacity-70">Please use UPI ID option instead</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 pt-1 pb-2">
      <div className="flex flex-row items-start gap-5 overflow-x-auto pb-2 pt-1 scrollbar-none justify-start">
        {apps.map((app) => (
          <button
            key={app.name}
            type="button"
            onClick={() => onSelectApp(app.name)}
            disabled={isLoading}
            className="flex flex-col items-center gap-1.5 focus:outline-none cursor-pointer hover:scale-105 active:scale-95 transition-all flex-shrink-0"
          >
            <div className="w-12 h-12 rounded-[12px] overflow-hidden shadow-md flex items-center justify-center bg-transparent">
              <img 
                src={app.icon} 
                alt={app.displayName} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src !== "/payment-icon/UPI.svg") {
                    console.warn("⚠️ Icon load failed for:", app.name);
                    target.src = "/payment-icon/UPI.svg";
                  }
                }}
              />
            </div>
            
            <span className="text-[11px] font-medium text-neutral-300 text-center leading-normal max-w-[64px] truncate">
              {app.displayName}
            </span>
          </button>
        ))}
      </div>
      
      {isLoading && (
        <div className="text-center text-xs text-theme_5 pt-1">
          Redirecting to app...
        </div>
      )}
    </div>
  );
}

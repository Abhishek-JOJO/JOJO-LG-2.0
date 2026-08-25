"use client";

import { useState, useEffect } from "react";
import { decrypt } from "@/lib/crypto/decrypt";
import { X, Search, Check } from "lucide-react";

interface Country {
  country_code: string;
  country_name: string;
  phone_code: string;
}

interface PhoneCollectModalProps {
  onComplete: (phone: string, phoneCode: string) => void;
  onClose?: () => void;
}

function getFlagEmoji(countryCode: string) {
  if (!countryCode) return "";
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

export default function PhoneCollectModal({ onComplete, onClose }: PhoneCollectModalProps) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Load countries from localStorage cache
  useEffect(() => {
    const loadCountries = () => {
      try {
        const encryptedLocalData = localStorage.getItem("countries");
        const dataVersion = localStorage.getItem("countries_version");

        if (encryptedLocalData && dataVersion === "v1") {
          const decryptedStr = decrypt(encryptedLocalData, true);
          const decryptedObj = JSON.parse(decryptedStr);
          const list = decryptedObj?.data || [];
          if (Array.isArray(list) && list.length > 0) {
            setCountries(list);
            // Default to India (+91) or first entry
            const india = list.find((c: Country) => c.country_code === "IN") || list[0];
            setSelectedCountry(india);
            return;
          }
        }
      } catch (err) {
        console.error("PhoneCollectModal: failed to load countries", err);
      }
      
      // Fallback if local storage config is missing
      const fallbackCountries: Country[] = [
        { country_code: "IN", country_name: "India", phone_code: "+91" }
      ];
      setCountries(fallbackCountries);
      setSelectedCountry(fallbackCountries[0]);
    };

    loadCountries();
  }, []);

  const filteredCountries = countries.filter((c) =>
    c.country_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone_code?.includes(searchQuery)
  );

  const handleContinue = () => {
    const digitsOnly = phone.replace(/\D/g, "");
    if (!phone.trim()) {
      setPhoneError("Phone number is required");
      return;
    }
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      setPhoneError("Enter a valid phone number (7–15 digits)");
      return;
    }
    setPhoneError("");

    const phoneCode = selectedCountry?.phone_code || "+91";
    localStorage.setItem("user_phone", digitsOnly);
    localStorage.setItem("user_phone_code", phoneCode);

    onComplete(digitsOnly, phoneCode);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative mx-4 w-full max-w-[420px] rounded-3xl bg-neutral-950 border border-neutral-800/80 p-8 shadow-2xl">
        
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-neutral-900 text-neutral-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        )}

        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 text-center">
          Enter Mobile Number
        </h2>
        <p className="text-sm text-neutral-400 mb-6 text-center leading-relaxed">
          Required to process your payment securely via Razorpay
        </p>

        <div className="relative flex items-stretch gap-2 mb-2">
          {/* Country code selector */}
          <button
            type="button"
            className="flex items-center gap-1.5 px-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-white transition-colors"
            onClick={() => setIsDropdownOpen((v) => !v)}
          >
            <span className="text-lg">{getFlagEmoji(selectedCountry?.country_code || "IN")}</span>
            <span className="font-semibold text-sm">{selectedCountry?.phone_code || "+91"}</span>
            <svg
              className={`w-4 h-4 text-neutral-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Phone Input */}
          <input
            type="tel"
            className={`flex-1 min-w-0 px-4 py-3.5 rounded-2xl bg-neutral-900 border ${
              phoneError ? "border-red-500" : "border-neutral-800 focus:border-theme_13_samecolour"
            } text-white font-medium text-base outline-none transition-colors`}
            placeholder="Phone number"
            value={phone}
            maxLength={15}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              setPhone(val);
              if (phoneError) setPhoneError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleContinue()}
          />

          {/* Country Dropdown Popup */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-full z-20 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl p-3 flex flex-col max-h-[260px]">
              <div className="relative mb-2">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search country..."
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-neutral-950 border border-neutral-850 text-white placeholder-neutral-500 outline-none focus:border-neutral-700"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex-1 overflow-y-auto space-y-0.5 custom-scrollbar">
                {filteredCountries.length === 0 ? (
                  <p className="text-xs text-neutral-500 text-center py-4">No countries found</p>
                ) : (
                  filteredCountries.map((country, idx) => {
                    const isSelected = selectedCountry?.country_code === country.country_code;
                    return (
                      <button
                        key={idx}
                        type="button"
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors ${
                          isSelected ? "bg-neutral-800 text-white" : "hover:bg-neutral-800/40 text-neutral-300"
                        }`}
                        onClick={() => {
                          setSelectedCountry(country);
                          setIsDropdownOpen(false);
                          setSearchQuery("");
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{getFlagEmoji(country.country_code)}</span>
                          <span className="text-sm font-medium line-clamp-1">{country.country_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-neutral-400">{country.phone_code}</span>
                          {isSelected && <Check size={14} className="text-theme_13_samecolour" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {phoneError && <p className="text-xs text-red-500 font-semibold px-1 mt-1">{phoneError}</p>}

        <button
          onClick={handleContinue}
          className="w-full mt-6 py-3.5 rounded-2xl bg-gradient-to-r from-theme_13 to-orange-600 text-white font-bold hover:opacity-95 active:scale-98 transition-all shadow-lg shadow-theme_13/20"
        >
          Continue to Payment
        </button>
      </div>
    </div>
  );
}

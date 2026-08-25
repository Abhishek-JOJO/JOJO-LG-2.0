import { validate } from "@/app/login/validate";
import { ErrorKey, LoginIdentifierType } from "@/enums/ui.enum";
import { LoginState, NormalizedPhoneNumber } from "@/types/global.types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { appConfig } from "./config/app.config";
import { IMAGES, LOGOS, STORE_BUTTONS } from "./constants/assets";
import { REGEX } from "./constants/regex";
import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

export const TIME_ZONE = "Asia/Kolkata"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getChangeError(
  value: string,
  touched: boolean
): ErrorKey | null {
  return touched ? validate(value) : null;
}

export const COUNTRY_CODES = [
  { code: "+91", country: "India" },
  { code: "+1", country: "United States" },
  { code: "+44", country: "United Kingdom" },
  { code: "+971", country: "UAE" },
  { code: "+61", country: "Australia" },
  { code: "+65", country: "Singapore" },
];

export function canSubmitForm(value: string): boolean {
  return value.trim() !== "" && validate(value) === null;
}

export const INITIAL_LOGIN: Pick<LoginState, "value" | "error" | "touched" | "countryCode" | "dropdownOpen" | "canSubmit"> = {
  value: "",
  error: null,
  touched: false,
  countryCode: "+91",
  dropdownOpen: false,
  canSubmit: false,
};

export const INITIAL_FOR_OTP = {
  digits: Array(appConfig.OTP_LENGTH).fill(""),
  activeIndex: 0,
  error: null,
  touched: false,
  countdown: appConfig.RESEND_SECONDS,
  canSubmit: false,
};

export const formatTime = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(
    2,
    "0"
  )}`;

export const CREATE_ACCOUNT_INITIAL = {
  name: "",
  avatar_id: null,
  selectedAvatar: null,
  age: null,
  gender: null,
  nameTouched: false,
  ageTouched: false,
  genderTouched: false,
  nameError: null,
  ageError: null,
  genderError: null,
  canSubmit: false,
};

export const REGISTER_INITIAL = {
  value: "",
  error: null,
  touched: false,
  countryCode: LoginIdentifierType.PHONE_CODE_NUMBER_DEFAULT,
  dropdownOpen: false,
  canSubmit: false,
  selectedAvatar: null,
};

export const AVATARS = Array.from({ length: 32 }, (_, i) => ({
  id: i + 1,
  src: IMAGES[`AVTAR_${i + 1}` as keyof typeof IMAGES],
}));


export const footerLinks = [
  "FAQ",
  "Help Centre",
  "Account",
  "Media Centre",
  "Investor Relations",
  "Jobs",
  "Cookie Preferences",
  "Privacy",
  "Terms of Use",
  "Contact Us",
  "Legal Notices",
  "Corporate Information"
];

export const STORE_IMAGE_MAP: Record<string, string> = {
  GOOGLE_PLAY: STORE_BUTTONS.GOOGLE_PLAY,
  APPLE_STORE: STORE_BUTTONS.APPLE_STORE,
};

// Get flag emoji from country code
export const getFlagEmoji = (countryCode: string) => {
  if (!countryCode || countryCode.length !== 2) return "🌍";
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

export const handleLoginKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  const allowedControlKeys = [
    "Backspace",
    "Delete",
    "Tab",
    "Enter",
    "Escape",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Home",
    "End",
  ];

  if (allowedControlKeys.includes(e.key)) return;
  // Allow copy, paste, select all, cut
  if (e.ctrlKey || e.metaKey) return;

  // Block special characters from keyboard typing
  if (!REGEX.ALLOW_LOGIN_KEY.test(e.key)) {
    e.preventDefault();
  }
};



export function normalizePhoneNumber(
  phone: string,
  defaultCountry: string = appConfig?.DEFAULT_COUNTRY_NAME
): NormalizedPhoneNumber {
  const cleanPhone = phone.trim();

  const parsed = parsePhoneNumberFromString(
    cleanPhone,
    defaultCountry.toUpperCase() as CountryCode
  );

  if (!parsed || !parsed.isValid()) {
    throw new Error(ErrorKey.INVALID_PHONE);
  }

  return {
    international: parsed.number,
    national: parsed.nationalNumber,
    countryCode: parsed.countryCallingCode,
    country: parsed.country ?? defaultCountry.toUpperCase(),
  };
}

export function isPossiblePhoneInput(value: string): boolean {
  if (!value.trim()) return false;
  return REGEX.CONTACT_NUMBER_REGEX.test(value);
}

export function tryNormalizePhoneNumber(
  phone: string,
  defaultCountry: string = appConfig?.DEFAULT_COUNTRY_NAME
): NormalizedPhoneNumber | null {
  try {
    return normalizePhoneNumber(phone, defaultCountry);
  } catch {
    return null;
  }
}


// Map footer.data.json link labels to translation keys
export const COL1_LABEL_KEY: Record<string, string> = {
  'FAQs': 'col1_faqs',
  'Terms & Conditions': 'col1_terms',
  'Privacy Policy': 'col1_privacy',
};

export const COL2_LABEL_KEY: Record<string, string> = {
  'Advertise with us': 'col2_advertise',
  'Contact Us': 'col2_contact',
  'Help & Support': 'col2_help',
  'Assets': 'col2_assets',
  'Careers': 'col2_careers',
};

export const getGenreBackground = (title?: string) => {
  const t = (title || "").trim().toLowerCase();

  if (t === "action" || t.includes("action") || t.includes("એક્શન")) {
    return "linear-gradient(78.51deg, #D72638 0%, rgba(215, 38, 56, 0) 100%)";
  }
  if (t === "horror" || t.includes("horror") || t.includes("હોરર") || t.includes("ડરામણી")) {
    return "linear-gradient(78.51deg, #3D1E6D 0%, rgba(61, 30, 109, 0) 100%)";
  }
  if (t === "romance" || t.includes("romance") || t.includes("રોમાંસ") || t.includes("પ્રણય")) {
    return "linear-gradient(78.51deg, #FF5C8A 0%, rgba(255, 92, 138, 0) 100%)";
  }
  if (t === "comedy" || t.includes("comedy") || t.includes("કોમેડી") || t.includes("હાસ્ય")) {
    return "linear-gradient(78.51deg, #EEAC00 0%, rgba(238, 172, 0, 0) 100%)";
  }
  if (t === "thriller" || t.includes("thriller") || t.includes("થ્રિલર") || t.includes("રોમાંચક")) {
    return "linear-gradient(78.51deg, #295F25 0%, rgba(41, 95, 37, 0) 100%)";
  }
  if (t === "family" || t.includes("family") || t.includes("ફેમિલી") || t.includes("પારિવારિક")) {
    return "linear-gradient(78.51deg, #7EC8E3 0%, rgba(126, 200, 227, 0) 100%)";
  }

  // Fallback dark gradient
  return "linear-gradient(78.51deg, #1A1A1A 0%, rgba(26, 26, 26, 0) 100%)";
};

export const GOLD_CARD_FEATURES = [
  {
    icon: "/logos/no-ads-JOJO-GOLD.png",
    text: "No In-Video\nAds",
    alt: "No In-Video Ads",
  },
  {
    icon: "/logos/laptops-JOJO-GOLD.png",
    text: "Watch on upto\n4 Devices",
    alt: "Watch on upto 4 Devices",
  },
  {
    icon: "/logos/Dimond-JOJO-GOLD.png",
    text: "Exclusive\nContent",
    alt: "Exclusive Content",
  },
  {
    icon: "/logos/FHD-JOJO-GOLD.png",
    text: "Full HD 1080p\nContent",
    alt: "Full HD 1080p Content",
  },
];

// Circular distance function to find the shortest transition route
export const getClosestVirtualIndex = (targetRealIndex: number, currentVirtual: number, N: number) => {
  if (N <= 0) return 0;
  const currentReal = ((currentVirtual % N) + N) % N;
  let diff = targetRealIndex - currentReal;
  if (diff > N / 2) {
    diff -= N;
  } else if (diff < -N / 2) {
    diff += N;
  }
  return currentVirtual + diff;
};

export const THUMB_CONFIG = { visibleCount: 5, width: 125, height: 76, gap: 8 };
export const minSwipeDistance = 50;

export const formatDate = (dateString?: string) => {
  if (!dateString) return "-";
  try {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "-";
  }
};

export const stripHtml = (html: string) => {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "");
};

export const CURRENCY_SYMBOL_MAP: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "د.إ",
  SGD: "S$",
  MYR: "RM",
  CAD: "CA$",
  AUD: "A$",
};
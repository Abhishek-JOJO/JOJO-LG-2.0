import { Country } from "@/features/country/model/types";
import type { Avatar } from "@/features/profile/model/types";
import type { AgeRange, ErrorKey, Gender, LoginIdentifierType, OTPScreenMode, UIState } from "@enums/ui.enum";

// Generic async state wrapper
export interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  status: UIState;
}

// Paginated response shape from API
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}

// Generic select option (for dropdowns etc.)
export interface SelectOption<T = string> {
  label: string;
  value: T;
}

// Environment type
export type AppEnv = "development" | "staging" | "production";

export interface LoginFormState {
  value: string;
  error: ErrorKey | null;
  touched: boolean;
}

export interface LoginState {
  value: string;
  error: ErrorKey | null;
  touched: boolean;
  countryCode: string;
  dropdownOpen: boolean;
  canSubmit: boolean;

  setValue: (value: string) => void;
  setTouched: () => void;
  setCountryCode: (code: string) => void;
  setDropdownOpen: (open: boolean) => void;
  submitForm: (onSuccess: (result: { type: "phone" | "email"; value: string }) => void) => void;
  reset: () => void;
}

export interface UseLoginSubmitReturn {
  value: string;
  error: ErrorKey | null;
  touched: boolean;
  canSubmit: boolean;
  countryCode: string;
  dropdownOpen: boolean;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBlur: () => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  handleCountryCode: (code: string) => void;
  handleDropdownOpen: (open: boolean) => void;
}

export interface RegisterState {
  value: string;
  error: ErrorKey | null;
  touched: boolean;
  countryCode: string;
  dropdownOpen: boolean;
  canSubmit: boolean;
  selectedAvatar: number | null;

  setValue: (value: string) => void;
  setTouched: () => void;
  setError: (error: ErrorKey | null) => void;
  setCountryCode: (code: string) => void;
  setDropdownOpen: (open: boolean) => void;
  setSelectedAvatar: (id: number) => void;
  submitForm: (onSuccess: (result: { type: LoginIdentifierType.PHONE | LoginIdentifierType.EMAIL; value: string }) => void) => void;
  submitFormOverseas: (onSuccess: (result: { type: LoginIdentifierType.EMAIL; value: string }) => void) => void;
  reset: () => void;
}

export interface OtpScreenProps {
  mode: OTPScreenMode.LOGIN_MODE | OTPScreenMode.REGISTER_MODE;
}

export interface UseRegisterSubmitReturn {
  value: string;
  error: ErrorKey | null;
  touched: boolean;
  canSubmit: boolean;
  countryCode: string;
  dropdownOpen: boolean;
  isSubmitting: boolean;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBlur: () => void;
  handleSubmit: (e: SubmitEvent) => void;
  handleCountryCode: (code: string) => void;
  handleDropdownOpen: (open: boolean) => void;
}

export interface OtpState {
  digits: string[];           // array of OTP_LENGTH single chars
  activeIndex: number;
  error: string | null;
  touched: boolean;
  countdown: number;          // seconds remaining before resend allowed
  canSubmit: boolean;
  setDigit: (index: number, value: string) => void;
  setActiveIndex: (index: number) => void;
  setError: (key: string | null) => void;
  startCountdown: () => void;
  tickCountdown: () => void;
  submitOtp: (onSuccess: () => void) => void;
  reset: () => void;
}


export interface CreateAccountState {
  // fields
  name: string;
  avatar_id: number | null;
  selectedAvatar: Avatar | null;
  age: AgeRange | null;
  gender: Gender | null;

  // validation
  nameTouched: boolean;
  ageTouched: boolean;
  genderTouched: boolean;

  nameError: string | null;
  ageError: string | null;
  genderError: string | null;

  // derived
  canSubmit: boolean;

  // actions
  setName: (name: string) => void;
  setAge: (age: AgeRange) => void;
  setAvtar: (avatar_id: number) => void;
  setSelectedAvatar: (avatar: Avatar) => void;
  setGender: (gender: Gender) => void;
  touchName: () => void;
  submit: (onSuccess: (data: { name: string; age: AgeRange; gender: Gender }) => void) => void;
  reset: () => void;
}


export interface AuthFormStrings {
  title: string;
  placeholder: string;
  disclaimer: React.ReactNode;   // supports JSX for links
  nextLabel: string;
  dividerLabel: string;
  footerText: string;
  footerLinkLabel: string;
}

export interface AuthFormProps {
  strings: AuthFormStrings;
  // state
  value: string;
  error: string | null;
  touched: boolean;
  canSubmit: boolean;
  isSubmitting?: boolean;
  // handlers
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  onSubmit: (e: SubmitEvent) => void;
  onDropdownOpen: (open: boolean) => void;
  onFooterLink: () => void;
  // error message resolver
  getError: () => string | React.ReactNode;
}

export type SocialProvider = 'google' | 'facebook' | 'apple';

export interface StatusPageProps {
  codeKey: string;
  titleKey: string;
  descKey: string;
  codeColor: string;
}

export interface DisclaimerOptions {
  disclaimerFirst: (tags: Record<string, (chunks: React.ReactNode) => React.ReactNode>) => React.ReactNode;
  disclaimerSecound: (tags: Record<string, (chunks: React.ReactNode) => React.ReactNode>) => React.ReactNode;
  supportEmail: string;
}

export interface CountryWithEmailInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "size" | "value" | "onChange"
  > {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;

  error?: boolean;
  showCountryCode?: boolean;

  countries?: Country[];
  countriesLoading?: boolean;
  countriesError?: unknown;

  phoneCode: string;
  selectedCountryCode: string;
  defaultCountryCode: string;

  onCountryChange: (country: {
    phone_code: string;
    country_code: string;
  }) => void;

  searchPlaceholder: string;
  loadingText: string;
  failedText: string;
  noCountriesText: string;

  wrapperClassName?: string;
}

export type NormalizedPhoneNumber = {
  international: string; // +919876543210
  national: string; // 9876543210
  countryCode: string; // 91
  country: string; // IN
};

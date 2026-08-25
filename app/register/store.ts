"use client";

import { validate } from "@/app/login/validate";
import { LoginIdentifierType, ErrorKey } from "@/enums/ui.enum";
import { appConfig } from "@/lib/config/app.config";
import { REGEX } from "@/lib/constants/regex";
import { canSubmitForm, getChangeError, REGISTER_INITIAL } from "@/lib/utils";
import { RegisterState } from "@/types/global.types";
import { create } from "zustand";

// Validation function for overseas users (email-only)
function validateOverseas(value: string): ErrorKey | null {
  const v = value.trim();
  if (!v) return ErrorKey.REQUIRED;
  return REGEX.EMAIL.test(v) ? null : ErrorKey.INVALID_EMAIL;
}

export const useRegisterStore = create<RegisterState>((set, get) => ({
  ...REGISTER_INITIAL,

  setValue: (value) => {
    const { touched } = get();
    set({ value, error: getChangeError(value, touched), canSubmit: canSubmitForm(value) });
  },

  setTouched: () => {
    const { value } = get();
    set({ touched: true, error: validate(value), canSubmit: canSubmitForm(value) });
  },

  setError: (error) => set({ error, touched: true }),

  setCountryCode: (countryCode) => set({ countryCode, dropdownOpen: false }),
  setDropdownOpen: (dropdownOpen) => set({ dropdownOpen }),
  setSelectedAvatar: (selectedAvatar) => set({ selectedAvatar }),

  submitForm: (onSuccess) => {
    const { value, countryCode } = get();
    const error = validate(value);
    set({ touched: true, error, canSubmit: !error });
    if (error) return;

    const trimmed = value.trim();
    const isPhone = REGEX.PHONE_NUMBER_REGEX.test(trimmed);

    if (isPhone) {
      const fullNumber = trimmed.startsWith(appConfig.MOBILE_NUMBER_START_WITH) ? trimmed : `${countryCode}${trimmed}`;
      onSuccess({ type: LoginIdentifierType.PHONE, value: fullNumber });
    } else {
      onSuccess({ type: LoginIdentifierType.EMAIL, value: trimmed });
    }
  },

  // New method for overseas users (email-only submission)
  submitFormOverseas: (onSuccess: (result: { type: LoginIdentifierType.EMAIL; value: string }) => void) => {
    const { value } = get();
    const error = validateOverseas(value);
    set({ touched: true, error, canSubmit: !error });
    if (error) return;

    const trimmed = value.trim();
    onSuccess({ type: LoginIdentifierType.EMAIL, value: trimmed });
  },

  reset: () => set({ ...REGISTER_INITIAL }),
}));

export const selectValue = (s: RegisterState) => s.value;
export const selectError = (s: RegisterState) => s.error;
export const selectTouched = (s: RegisterState) => s.touched;
export const selectCanSubmit = (s: RegisterState) => s.canSubmit;
export const selectCountryCode = (s: RegisterState) => s.countryCode;
export const selectDropdownOpen = (s: RegisterState) => s.dropdownOpen;
export const selectSetValue = (s: RegisterState) => s.setValue;
export const selectSetTouched = (s: RegisterState) => s.setTouched;
export const selectSetError = (s: RegisterState) => s.setError;
export const selectSetCountryCode = (s: RegisterState) => s.setCountryCode;
export const selectSetDropdownOpen = (s: RegisterState) => s.setDropdownOpen;
export const selectSubmitForm = (s: RegisterState) => s.submitForm;
export const selectSubmitFormOverseas = (s: RegisterState) => s.submitFormOverseas;
export const selectSelectedAvatar = (s: RegisterState) => s.selectedAvatar;
export const selectSetSelectedAvatar = (s: RegisterState) => s.setSelectedAvatar;
export const selectReset = (s: RegisterState) => s.reset;
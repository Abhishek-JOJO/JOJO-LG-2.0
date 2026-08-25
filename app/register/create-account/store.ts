"use client";

import { AgeRange, ErrorKey, Gender } from "@/enums/ui.enum";
import { REGEX } from "@/lib/constants/regex";
import { logger } from "@/lib/logger/logger";
import { CREATE_ACCOUNT_INITIAL } from "@/lib/utils";
import { CreateAccountState } from "@/types/global.types";
import { create } from "zustand";

// Profile name constraints
const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 25;

/**
 * Validate name field
 * Rules:
 * - Minimum 2 characters
 * - Maximum 25 characters
 * - Only letters, spaces, hyphens, and apostrophes allowed
 * - No numbers or special characters
 */
function validateName(name: string): string | null {
  const trimmedName = name.trim();

  // Check if empty or too short
  if (trimmedName.length < NAME_MIN_LENGTH) {
    return ErrorKey.ERR_NAME_REQUIRED;
  }

  // Check if too long
  if (trimmedName.length > NAME_MAX_LENGTH) {
    return ErrorKey.ERR_NAME_TOO_LONG;
  }

  // Check for invalid characters (numbers or special characters)
  if (!REGEX.NAME.test(trimmedName)) {
    return ErrorKey.ERR_NAME_INVALID;
  }

  return null;
}

function deriveCanSubmit(name: string, age: AgeRange | null, gender: Gender | null): boolean {
  return validateName(name) === null && age !== null && gender !== null;
}

export const useCreateAccountStore = create<CreateAccountState>((set, get) => ({
  ...CREATE_ACCOUNT_INITIAL,

  setName: (name) => {
    const { nameTouched } = get();

    // Hard limit: prevent input beyond max length
    const limitedName = name.slice(0, NAME_MAX_LENGTH);

    set({
      name: limitedName,
      nameError: nameTouched ? validateName(limitedName) : null,
      canSubmit: deriveCanSubmit(limitedName, get().age, get().gender),
    });
  },

  setAvtar: (avatar_id) => {
    set({
      avatar_id,
    });
  },

  setSelectedAvatar: (avatar) => {
    set({
      selectedAvatar: avatar,
      avatar_id: avatar.avatar_id,
    });
  },

  setAge: (age) => {
    set({
      age,
      ageError: null,
      ageTouched: true,
      canSubmit: deriveCanSubmit(get().name, age, get().gender),
    });
  },

  setGender: (gender) => {
    set({
      gender,
      genderError: null,
      genderTouched: true,
      canSubmit: deriveCanSubmit(get().name, get().age, gender),
    });
  },

  touchName: () => {
    const { name } = get();
    const nameError = validateName(name);
    set({ nameTouched: true, nameError, canSubmit: deriveCanSubmit(name, get().age, get().gender) });
  },

  submit: (onSuccess) => {
    const { name, age, gender } = get();
    const nameError = validateName(name);
    const ageError = age === null ? ErrorKey.ERR_AGE_REQUIRED : null;
    const genderError = gender === null ? ErrorKey.ERR_GENDER_REQUIRED : null;

    set({
      nameTouched: true,
      ageTouched: true,
      genderTouched: true,
      nameError,
      ageError,
      genderError,
    });

    if (nameError || ageError || genderError) return;

    // TODO: call create account API
    logger.info("[CreateAccount] Creating account", { name, age, gender });
    onSuccess({ name, age: age!, gender: gender! });
  },

  reset: () => set({ ...CREATE_ACCOUNT_INITIAL }),
}));

// selectors
export const selectName = (s: CreateAccountState) => s.name;
export const selectAge = (s: CreateAccountState) => s.age;
export const selectGender = (s: CreateAccountState) => s.gender;
export const selectSelectedAvatar = (s: CreateAccountState) => s.selectedAvatar;
export const selectNameError = (s: CreateAccountState) => s.nameError;
export const selectAgeError = (s: CreateAccountState) => s.ageError;
export const selectGenderError = (s: CreateAccountState) => s.genderError;
export const selectNameTouched = (s: CreateAccountState) => s.nameTouched;
export const selectCanSubmit = (s: CreateAccountState) => s.canSubmit;
export const selectSetName = (s: CreateAccountState) => s.setName;
export const selectSetAge = (s: CreateAccountState) => s.setAge;
export const selectSetAvtar = (s: CreateAccountState) => s.setAvtar;
export const selectSetSelectedAvatar = (s: CreateAccountState) => s.setSelectedAvatar;
export const selectSetGender = (s: CreateAccountState) => s.setGender;
export const selectTouchName = (s: CreateAccountState) => s.touchName;
export const selectSubmit = (s: CreateAccountState) => s.submit;
export const selectReset = (s: CreateAccountState) => s.reset;

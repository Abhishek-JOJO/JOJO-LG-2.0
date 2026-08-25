"use client";

import { Chip } from "@/components/common/chip-form";
import { FieldError } from "@/components/common/field-error";
import { PageBackground } from "@/components/common/PageBackground";
import { JOJOButton, JOJOCustomButton } from "@/components/ui/JOJOButton";
import { JOJOCardContent, JOJOCardFooter, JOJOCardHeader, JOJOCardTitle, JOJOCustomCard } from "@/components/ui/JOJOCard";
import { JOJOCustomInput, JOJOInput } from "@/components/ui/JOJOInput";
import { AGE_RANGES, AgeRange, ErrorKey, Gender, GENDER_LABEL_KEY, GENDERS } from "@/enums/ui.enum";
import { ROUTES } from "@/lib/constants/routes";
import { logger } from "@/lib/logger/logger";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { themeColors } from "@/tailwind.config";
import { useCreateProfile, useProfiles } from "@features/profile/hooks/useProfiles";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { analyticsService } from "@/shared/analytics";
import { EVENT_NAMES } from "@/shared/analytics/constants/analytics.constants";
import {
  selectAge,
  selectAgeError,
  selectCanSubmit,
  selectGender,
  selectGenderError,
  selectName,
  selectNameError,
  selectNameTouched,
  selectReset,
  selectSetAge, selectSetGender,
  selectSetName,
  selectSubmit,
  selectTouchName,
  useCreateAccountStore,
} from "./store";

export default function CreateAccountPage() {
  const t = useTranslations("createAccountPage");
  const router = useRouter();
  const createProfile = useCreateProfile();
  const { data: profilesData, isLoading: isProfilesLoading } = useProfiles(true);
  const profiles = profilesData?.profiles || [];

  // Auth protection - only allow access if user is authenticated
  const token = useAuthStore(state => state.token);

  const name = useCreateAccountStore(selectName);
  const age = useCreateAccountStore(selectAge);
  const gender = useCreateAccountStore(selectGender);
  const nameError = useCreateAccountStore(selectNameError);
  const ageError = useCreateAccountStore(selectAgeError);
  const genderError = useCreateAccountStore(selectGenderError);
  const nameTouched = useCreateAccountStore(selectNameTouched);
  const canSubmit = useCreateAccountStore(selectCanSubmit);
  const setName = useCreateAccountStore(selectSetName);
  const setAge = useCreateAccountStore(selectSetAge);
  const setGender = useCreateAccountStore(selectSetGender);
  const touchName = useCreateAccountStore(selectTouchName);
  const submit = useCreateAccountStore(selectSubmit);
  const reset = useCreateAccountStore(selectReset);

  // Submission guard - prevents double submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasRedirected = useRef(false);

  // Route protection: Redirect to login if not authenticated, or to home if user already has profile(s)
  useEffect(() => {
    if (!token) {
      logger.warn("[CreateAccount] Unauthorized access attempt - redirecting to login");
      router.replace(ROUTES.LOGIN);
    } else if (!isProfilesLoading && profiles.length > 0) {
      logger.info("[CreateAccount] User already has profile(s) - redirecting to home");
      router.replace(ROUTES.HOME);
    }
  }, [token, profiles, isProfilesLoading, router]);

  useEffect(() => () => reset(), [reset]);

  useEffect(() => {
    analyticsService.track(EVENT_NAMES.SIGN_UP_STARTED);
  }, []);

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();

    if (isSubmitting || hasRedirected.current) {
      logger.warn("[CreateAccount] Submission blocked - already in progress", {
        isSubmitting,
        hasRedirected: hasRedirected.current,
      });
      return;
    }

    submit(async (data) => {
      logger.info("[CreateAccount] Form validated", { data });

      // Mark as submitting
      setIsSubmitting(true);

      try {
        // Call create profile API
        await createProfile.mutateAsync({
          profile_name: data.name,
          age: data.age,
          gender: data.gender,
          is_kid: false,
        });

        try {
          analyticsService.track(EVENT_NAMES.SIGN_UP_COMPLETED, {
            name: data.name,
            age: data.age,
            gender: data.gender,
          });
        } catch (err) {}

        logger.info("[CreateAccount] Profile created successfully, redirecting to watching");

        // Mark as redirected to prevent duplicate redirects
        hasRedirected.current = true;

        // Redirect to watching page
        router.push(ROUTES.WATCHING);
      } catch (error) {
        logger.error("[CreateAccount] Failed to create profile", { error });

        // Re-enable form on error
        setIsSubmitting(false);
      }
    });
  };

  return (
    <div className="relative min-h-screen overflow-hidden -mt-15 lg:-mt-25">
      <PageBackground />

      <div className={cn(
        "relative z-10 flex min-h-screen flex-col items-center justify-center",
        "px-4 py-8",
        "mt-12 md:mt-0"
      )}>
        <JOJOCustomCard className="w-full max-w-sm sm:max-w-md overflow-hidden">
          <form
            onSubmit={handleSubmit as any}
            noValidate
            className={`w-full ${isSubmitting ? 'pointer-events-none opacity-75' : ''}`}
          >
            <JOJOCardHeader className="pb-6">
              <JOJOCardTitle>{t("title")}</JOJOCardTitle>
            </JOJOCardHeader>
            <JOJOCardContent className="w-full space-y-2" gap="5px">
              <div className="w-full">
                <label className="mb-2 block text-[15px] font-bold text-theme_1">
                  {t("full_name_label")}
                </label>
                <JOJOCustomInput
                  state={JOJOInput.State.DEFAULT}
                  placeholder={t("full_name_placeholder")}
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => touchName()}
                  className="w-full body-sm-regular bg-theme_10"
                  error={!!(nameTouched && nameError)}
                  disabled={isSubmitting}
                  maxLength={25}
                />
                <div className="mt-1 flex justify-between items-center">
                  <div>
                    {nameError && nameTouched && (
                      <FieldError msg={t(nameError)} />
                    )}
                  </div>
                  <span className={`text-xs ${name.length >= 25 ? 'text-red-500' : 'text-theme_5'}`}>
                    {name.length}/25
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[15px] font-bold text-theme_1">
                  {t("age_label")}
                </label>

                <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                  {AGE_RANGES.map((range) => (
                    <Chip
                      key={range}
                      label={range}
                      active={age === range}
                      onClick={() => !isSubmitting && setAge(range as AgeRange)}
                    />
                  ))}
                </div>

                {ageError && (
                  <FieldError msg={t(ErrorKey.ERR_AGE_REQUIRED)} />
                )}
              </div>

              <div className="flex flex-col gap-2.5">
                <label className="text-[15px] font-bold text-theme_1">
                  {t("gender_label")}
                </label>

                <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                  {GENDERS.map((g) => (
                    <Chip
                      key={g}
                      label={t(GENDER_LABEL_KEY[g as Gender])}
                      active={gender === g}
                      onClick={() => !isSubmitting && setGender(g as Gender)}
                    />
                  ))}
                </div>

                {genderError && (
                  <FieldError msg={t(ErrorKey.ERR_GENDER_REQUIRED)} />
                )}
              </div>
            </JOJOCardContent>

            <JOJOCardFooter className="pt-8">
              <JOJOCustomButton
                size={JOJOButton.Size.L}
                state={
                  canSubmit && !isSubmitting
                    ? JOJOButton.State.ACTIVE
                    : JOJOButton.State.DISABLED
                }
                hoverColor={themeColors.theme_13_samecolour}
                type="submit"
                disabled={!canSubmit || isSubmitting || createProfile.isPending}
                isLoading={isSubmitting || createProfile.isPending}
                className="mx-auto w-1/2 rounded-[100px] border-none body-sm-medium hover:opacity-90"
              >
                {t("create_profile")}
              </JOJOCustomButton>
            </JOJOCardFooter>
          </form>
        </JOJOCustomCard>
      </div>
    </div>
  );
}


"use client";

import { LoginIdentifierType } from "@/enums/ui.enum";
import { ROUTES } from "@/lib/constants/routes";
import { UseRegisterSubmitReturn } from "@/types/global.types";
import { useRouter } from "next/navigation";
import {
  selectCanSubmit,
  selectCountryCode, selectDropdownOpen,
  selectError,
  selectSetCountryCode,
  selectSetDropdownOpen,
  selectSetTouched,
  selectSetValue,
  selectSubmitForm,
  selectSubmitFormOverseas,
  selectTouched,
  selectValue,
  selectSetError,
  useRegisterStore,
} from "./store";
import { ChangeEvent, useEffect } from "react";
import { useInitiateOtp, useCheckUserExists } from "@features/auth/hooks/useOtpLogin";
import { useCaptcha } from "@features/auth/hooks/useCaptcha";
import { useGeoAvailability } from "@features/geo/hooks/useGeoAvailability";
import { REGEX } from "@/lib/constants/regex";
import { logger } from "@/lib/logger/logger";
import { mapErrorToKey } from "@/lib/error/errorMapper";
import { ErrorKey } from "@/enums/ui.enum";
import { loadRecaptchaScript } from "@/shared/recaptcha/recaptcha.client";
import { RecaptchaAction } from "@/shared/recaptcha/recaptcha.types";
import { appConfig } from "@/lib/config/app.config";
import { useOtpStore } from "@/app/login/otp/store";

export function useRegisterSubmit(): UseRegisterSubmitReturn {
  const router = useRouter();
  const checkUserExists = useCheckUserExists();
  const initiateOtp = useInitiateOtp();
  const verifyCaptcha = useCaptcha();
  const { isAvailable } = useGeoAvailability();
  const setAuthContext = useOtpStore(state => state.setAuthContext);

  const value = useRegisterStore(selectValue);
  const error = useRegisterStore(selectError);
  const touched = useRegisterStore(selectTouched);
  const canSubmit = useRegisterStore(selectCanSubmit);
  const countryCode = useRegisterStore(selectCountryCode);
  const dropdownOpen = useRegisterStore(selectDropdownOpen);

  const setValue = useRegisterStore(selectSetValue);
  const setTouched = useRegisterStore(selectSetTouched);
  const setCountryCode = useRegisterStore(selectSetCountryCode);
  const setDropdownOpen = useRegisterStore(selectSetDropdownOpen);
  const setError = useRegisterStore(selectSetError);
  const submitForm = useRegisterStore(selectSubmitForm);
  const submitFormOverseas = useRegisterStore(selectSubmitFormOverseas);

  // Load reCAPTCHA script on mount (only if captcha is enabled)
  useEffect(() => {
    if (!appConfig.flags.enableCaptcha) {
      logger.info('[Register] Captcha is disabled, skipping reCAPTCHA script load');
      return;
    }
    logger.info('[Register] Component mounted, loading reCAPTCHA script...');

    loadRecaptchaScript()
      .then(() => {
        logger.info('[Register] reCAPTCHA script loaded successfully');

      })
      .catch((error) => {
        logger.error('[Register] Failed to load reCAPTCHA script', { error });
      });
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value);
  const handleBlur = () => setTouched();

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    // OVERSEAS USER FLOW: Email-only registration
    if (!isAvailable) {
      submitFormOverseas(async ({ value: trimmedValue }) => {
        logger.info('[Register] Overseas user - email-only registration', { email: trimmedValue });

        try {
          // Step 1: Verify captcha FIRST (only if enabled)
          if (appConfig.flags.enableCaptcha) {
            logger.info('[Register] Verifying captcha...');

            await verifyCaptcha.mutateAsync({ action: RecaptchaAction.REGISTER });
            logger.info('[Register] Captcha verified successfully');

          } else {
            logger.info('[Register] Captcha is disabled, skipping verification');
          }

          // Step 2: Check if user already exists

          const result = await checkUserExists.mutateAsync({
            phone: trimmedValue,
            phoneCode: ""
          });

          if (result.exists) {
            // User already exists - show error
            logger.info('[Register] User already exists, showing error');
            setError(ErrorKey.USER_ALREADY_EXISTS);
            return;
          }

          // Step 3: User doesn't exist - proceed with registration
          logger.info('[Register] New user, sending OTP to email');
          await initiateOtp.mutateAsync({
            phone: trimmedValue,
            phoneCode: ""
          });

          // Step 4: Set auth context BEFORE navigation
          logger.info('[Register] Setting auth context before navigation');
          setAuthContext({
            email: trimmedValue,
            isRegister: true
          });

          // Step 5: Navigate to OTP screen with clean URL
          router.push(ROUTES.REGISTER_OTP);
        } catch (err) {
          logger.error('[Register] Failed to process overseas registration', { error: err });

          // Map error to ErrorKey using centralized mapper
          const errorKey = mapErrorToKey(err, 'Register Overseas');
          setError(errorKey);
        }
      });
      return;
    }

    // INDIA USER FLOW: Phone or Email registration
    submitForm(async ({ type, value: trimmedValue }) => {
      const isPhone = type === LoginIdentifierType.PHONE;

      try {
        // Step 1: Verify captcha FIRST (only if enabled)
        if (appConfig.flags.enableCaptcha) {
          logger.info('[Register] Verifying captcha...');

          await verifyCaptcha.mutateAsync({ action: RecaptchaAction.REGISTER });
          logger.info('[Register] Captcha verified successfully');

        } else {
          logger.info('[Register] Captcha is disabled, skipping verification');
        }

        // Step 2: Check if user already exists
        logger.info('[Register] Indian user - checking if user already exists');


        if (isPhone) {
          const cleanPhone = trimmedValue.replace(REGEX.NON_DIGIT, "");

          const result = await checkUserExists.mutateAsync({
            phone: cleanPhone,
            phoneCode: countryCode
          });

          if (result.exists) {
            // User already exists - show error
            logger.info('[Register] User already exists, showing error');
            setError(ErrorKey.USER_ALREADY_EXISTS);
            return;
          }

          // Step 3: User doesn't exist - proceed with registration
          logger.info('[Register] New user, sending OTP');
          await initiateOtp.mutateAsync({
            phone: cleanPhone,
            phoneCode: countryCode
          });

          // Set auth context BEFORE navigation
          setAuthContext({
            phone: cleanPhone,
            phoneCode: countryCode,
            isRegister: true
          });

          router.push(ROUTES.REGISTER_OTP);
        } else {
          // Email flow
          const result = await checkUserExists.mutateAsync({
            phone: trimmedValue,
            phoneCode: ""
          });

          if (result.exists) {
            // User already exists - show error
            logger.info('[Register] User already exists, showing error');
            setError(ErrorKey.USER_ALREADY_EXISTS);
            return;
          }

          // Step 3: User doesn't exist - proceed with registration
          logger.info('[Register] New user, sending OTP');
          await initiateOtp.mutateAsync({
            phone: trimmedValue,
            phoneCode: ""
          });

          // Set auth context BEFORE navigation
          setAuthContext({
            email: trimmedValue,
            isRegister: true
          });

          router.push(ROUTES.REGISTER_OTP);
        }
      } catch (err) {
        logger.error('[Register] Failed to process registration', { error: err });

        // Map error to ErrorKey using centralized mapper
        const errorKey = mapErrorToKey(err, isPhone ? 'Register Phone' : 'Register Email');
        setError(errorKey);
      }
    });
  };

  return {
    value, error, touched, canSubmit, countryCode, dropdownOpen,
    isSubmitting: initiateOtp.isPending || checkUserExists.isPending || (appConfig.flags.enableCaptcha && verifyCaptcha.isPending),
    handleChange, handleBlur, handleSubmit,
    handleCountryCode: setCountryCode,
    handleDropdownOpen: setDropdownOpen,
  };
}

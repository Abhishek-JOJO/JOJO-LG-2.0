"use client";

import { OtpScreen } from "@/components/common/OtpScreen";
import { OTPScreenMode } from "@/enums/ui.enum";
import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { logger } from "@/lib/logger/logger";
import { useOtpStore } from "@/app/login/otp/store";

export default function RegisterOtpPage() {
  return (
    <Suspense>
      <RegisterOtpPageContent />
    </Suspense>
  );
}

function RegisterOtpPageContent() {
  const router = useRouter();
  const authContext = useOtpStore(state => state.authContext);

  // Get identifier from store instead of URL params
  const phone = authContext.phone ?? "";
  const email = authContext.email ?? "";
  const identifier = phone || email;

  // Route protection - redirect if no identifier
  useEffect(() => {
    logger.info("[Register OTP] Checking auth context", {
      authContext,
      phone,
      email,
      identifier
    });

    if (!identifier) {
      logger.warn("[Register OTP] Unauthorized access - no phone/email provided, redirecting to register");
      router.replace(ROUTES.REGISTER);
    }
  }, [identifier, router, authContext, phone, email]);

  return <OtpScreen mode={OTPScreenMode.REGISTER_MODE} />;
}

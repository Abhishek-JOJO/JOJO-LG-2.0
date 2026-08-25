"use client";

import { JOJOButton, JOJOCustomButton } from "@/components/ui/JOJOButton";
import { FormEvent, useState } from "react";
import { useInitiateOtp, useVerifyOtp } from "../hooks/useOtpLogin";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { LoginIdentifierType } from "@/enums/ui.enum";
import { JOJOCustomInput } from "@/components/ui/JOJOInput";

/**
 * OTP Login Form Component
 * 
 * Demonstrates OTP flow with service orchestration:
 * 1. User enters phone
 * 2. Initiate OTP (checkUser → sendOtp)
 * 3. User enters OTP
 * 4. Verify OTP
 * 5. Redirect to home
 */
export function OtpLoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("+1"); // Default phone code
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<LoginIdentifierType.PHONE | LoginIdentifierType.OTP>(LoginIdentifierType.PHONE);

  const initiateOtp = useInitiateOtp();
  const verifyOtp = useVerifyOtp();

  const handleSendOtp = async (e: any) => {
    e.preventDefault();

    try {
      await initiateOtp.mutateAsync({ phone, phoneCode });
      setStep(LoginIdentifierType.OTP);
    } catch (error) {
      // Error handled by React Query onError
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();

    try {
      await verifyOtp.mutateAsync({ phone, phoneCode, otp });
      router.push(ROUTES.HOME); // Redirect to home
    } catch (error) {
      // Error handled by React Query onError
    }
  };

  if (step === "otp") {
    return (
      <div className="max-w-md mx-auto p-6">
        <h2 className="text-2xl font-bold mb-4">Enter OTP</h2>
        <p className="text-gray-600 mb-4">
          We sent a code to {phone}
        </p>

        <form onSubmit={handleVerifyOtp}>
          <JOJOCustomInput
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter 6-digit OTP"
            maxLength={6}
            className="w-full px-4 py-2 border rounded mb-4"
            disabled={verifyOtp.isPending}
          />

          {verifyOtp.isError && (
            <p className="text-red-600 text-sm mb-4">
              {verifyOtp.error?.message || "Invalid OTP"}
            </p>
          )}

          <JOJOCustomButton
            size={JOJOButton.Size.L}
            state={verifyOtp.isPending || otp.length !== 6 ? JOJOButton.State.DISABLED : JOJOButton.State.ACTIVE}
            type="submit"
            disabled={verifyOtp.isPending || otp.length !== 6}
            className="w-full bg-blue-600 text-theme_1 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {verifyOtp.isPending ? "Verifying..." : "Verify OTP"}
          </JOJOCustomButton>

          <JOJOCustomButton
            size={JOJOButton.Size.M}
            state={JOJOButton.State.DEFAULT}
            onClick={() => setStep(LoginIdentifierType.PHONE)}
            className="w-full mt-2 text-blue-600 hover:underline"
          >
            Change phone number
          </JOJOCustomButton>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Login with OTP</h2>

      <form onSubmit={handleSendOtp}>
        <JOJOCustomInput
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Enter phone number"
          className="w-full px-4 py-2 border rounded mb-4"
          disabled={initiateOtp.isPending}
        />

        {initiateOtp.isError && (
          <p className="text-red-600 text-sm mb-4">
            {initiateOtp.error?.message || "Failed to send OTP"}
          </p>
        )}

        <JOJOCustomButton
          size="l"
          state={initiateOtp.isPending || !phone ? "disabled" : "active"}
          type="submit"
          disabled={initiateOtp.isPending || !phone}
          className="w-full bg-blue-600 text-theme_1 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {initiateOtp.isPending ? "Sending OTP..." : "Send OTP"}
        </JOJOCustomButton>
      </form>
    </div>
  );
}

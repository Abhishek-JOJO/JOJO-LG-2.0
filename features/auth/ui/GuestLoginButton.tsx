"use client";

import { JOJOButton, JOJOCustomButton } from "@/components/ui/JOJOButton";
import { useGuestLogin } from "../hooks/useGuestLogin";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";

/**
 * Guest Login Button Component
 * 
 * Demonstrates simple API usage WITHOUT service:
 * - Single button click
 * - Direct API call
 * - No orchestration needed
 */
export function GuestLoginButton() {
  const router = useRouter();
  const guestLogin = useGuestLogin();

  const handleGuestLogin = async () => {
    try {
      await guestLogin.mutateAsync();
      router.push(ROUTES.HOME); // Redirect to home
    } catch (error) {
      // Error handled by React Query onError
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <JOJOCustomButton
        size={JOJOButton.Size.L}
        state={guestLogin.isPending ? JOJOButton.State.DISABLED : JOJOButton.State.ACTIVE}
        onClick={handleGuestLogin}
        disabled={guestLogin.isPending}
        className="w-full bg-gray-600 text-theme_1 py-2 rounded hover:bg-gray-700 disabled:bg-gray-400"
      >
        {guestLogin.isPending ? "Logging in..." : "Continue as Guest"}
      </JOJOCustomButton>

      {guestLogin.isError && (
        <p className="text-red-600 text-sm mt-2 text-center">
          {guestLogin.error?.message || "Failed to login as guest"}
        </p>
      )}
    </div>
  );
}

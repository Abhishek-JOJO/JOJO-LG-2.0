"use client";

import SocialBtn from "@/app/login/components/social-buttons";
import { PageBackground } from "@/components/common/PageBackground";
import { JOJOButton, JOJOCustomButton } from "@/components/ui/JOJOButton";
import { JOJOCardContent, JOJOCardFooter, JOJOCardHeader, JOJOCardTitle, JOJOCustomCard } from "@/components/ui/JOJOCard";
import { AppleLoginButton } from "@/features/auth/ui/AppleLoginButton";
import { FacebookLoginButton } from "@/features/auth/ui/FacebookLoginButton";
import { GoogleLoginButton } from "@/features/auth/ui/GoogleLoginButton";
import { LOGOS } from "@/lib/constants/assets";
import { ROUTES } from "@/lib/constants/routes";
import { logger } from "@/lib/logger/logger";
import { cn } from "@/lib/utils";
import { themeColors } from "@/tailwind.config";
import { AuthFormProps } from "@/types/global.types";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import JOJOCommonImage, { JOJOImagePreset } from "../ui/JOJOCommonImage";
import { JOJOCustomInput } from "../ui/JOJOInput";

export function AuthForm({
  strings,
  value, error, touched, canSubmit, isSubmitting = false,
  onChange, onBlur, onSubmit, onDropdownOpen,
  onFooterLink, getError,
}: AuthFormProps) {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  const handleDocClick = (e: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      onDropdownOpen(false);
    }
  };

  // Attach/detach listener
  const attachListener = () => document.addEventListener("mousedown", handleDocClick);
  const detachListener = () => document.removeEventListener("mousedown", handleDocClick);

  return (
    <div className="relative min-h-screen overflow-hidden -mt-15 lg:-mt-25">
      <PageBackground />
      <div
        className={cn(
          "relative z-10 flex min-h-screen flex-col items-center justify-center",
          "px-4 py-8",
          "mt-12 md:mt-0"
        )}

      >
        <JOJOCustomCard className="w-full max-w-sm sm:max-w-md">
          <form onSubmit={onSubmit as any} noValidate onFocus={attachListener} onBlur={detachListener}>
            <JOJOCardHeader>
              <JOJOCardTitle>{strings.title}</JOJOCardTitle>
            </JOJOCardHeader>

            <JOJOCardContent className="gap-0">
              <div className="flex flex-col pt-7">
                <JOJOCustomInput
                  type="text"
                  inputMode="text"
                  autoComplete="username"
                  placeholder={strings.placeholder}
                  value={value}
                  onChange={onChange}
                  onBlur={onBlur}
                  error={!!(error && touched)}
                  className="w-full"
                />
                {error && touched && (
                  <div role="alert" className="m-0 text-xs text-theme_14_samecolour pl-4 flex items-center gap-2 mt-2">
                    <JOJOCommonImage
                      src={LOGOS.ERROR_ICON}
                      altKey="img_jojo_logo"
                      width={12}
                      height={12}
                      preset={JOJOImagePreset.Logo}
                      wrapperClassName="size-3 flex-shrink-0"
                    />
                    {getError()}
                  </div>
                )}

                <div className="pt-3 caption-xs-regular text-theme_7">{strings.disclaimer}</div>
              </div>

              {/* Submit */}
              <JOJOCustomButton
                size={JOJOButton.Size.L}
                state={canSubmit ? JOJOButton.State.ACTIVE : JOJOButton.State.DISABLED}
                type="submit"
                hoverColor={themeColors.theme_13_samecolour}
                disabled={!canSubmit || isSubmitting}
                isLoading={isSubmitting}
                className="rounded-[100px] hover:opacity-90 body-sm-medium w-1/2 sm:w-1/4 mx-auto flex mt-10 border-none"
              >
                {strings.nextLabel}
              </JOJOCustomButton>

              {/* Divider */}
              <div className="flex items-center pt-10">
                <div className="flex-1" />
                <span className="body-xs-medium text-theme_5">{strings.dividerLabel}</span>
                <div className="flex-1 h-px" />
              </div>

              {/* Social */}
              <div className="flex justify-center gap-3 pt-3">
                <GoogleLoginButton
                  onSuccess={() => router.push(ROUTES.HOME)}
                  onError={(error) => logger.error('[Login] Google error', { error })}
                  hideChildrenWhenLoading
                  className="w-10.5 h-10.5 px-0 rounded-full bg-theme_10_50 flex items-center justify-center cursor-pointer transition-colors hover:bg-theme_9"
                >
                  <SocialBtn src={LOGOS.GOOGLE_LOGO} altKey="img_google" />
                </GoogleLoginButton>
                <FacebookLoginButton
                  onSuccess={() => router.push(ROUTES.HOME)}
                  hideChildrenWhenLoading
                  onError={(error) => logger.error('[Login] Facebook error', { error })}
                  className="w-10.5 h-10.5 rounded-full bg-theme_10_50 flex items-center justify-center cursor-pointer transition-colors hover:bg-theme_9"
                >
                  <SocialBtn src={LOGOS.FACEBOOK_LOGO} altKey="img_facebook" />
                </FacebookLoginButton>
                <AppleLoginButton
                  onError={(error) => logger.error('[Login] Apple error', { error })}
                  hideChildrenWhenLoading
                  className="w-10.5 h-10.5 rounded-full bg-theme_10_50 flex items-center justify-center cursor-pointer transition-colors hover:bg-theme_9"
                >
                  <SocialBtn src={LOGOS.APPLE_LOGO} altKey="img_apple" />
                </AppleLoginButton>
              </div>
            </JOJOCardContent>

            <JOJOCardFooter>
              <p className="m-0 body-xs-regular text-center text-theme_7 mt-8 w-full">
                {strings.footerText}
                <span
                  role="button"
                  tabIndex={0}
                  className="text-theme_13_samecolour cursor-pointer hover:underline ml-1"
                  onClick={onFooterLink}
                  onKeyDown={(e) => e.key === "Enter" && onFooterLink()}
                >
                  {strings.footerLinkLabel}
                </span>
              </p>
            </JOJOCardFooter>
          </form>
        </JOJOCustomCard>
      </div>
    </div>
  );
}

"use client";

import { PageBackground } from "@/components/common/PageBackground";
import { ProfilesErrorFallback } from "@/components/common/ProfilesErrorFallback";
import { JOJOButton, JOJOCustomButton } from "@/components/ui/JOJOButton";
import JOJOCommonImage, { JOJOImageContentMode, JOJOImagePreset, JOJOImageRadius } from "@/components/ui/JOJOCommonImage";
import { AddProfileButton } from "@/features/profile/components/AddProfileButton";
import { MAX_PROFILES } from "@/features/profile/constants/profile.constants";
import { useIsMobile } from "@/hooks/useIsMobile";
import { ROUTES } from "@/lib/constants/routes";
import { mapErrorToKey } from "@/lib/error/errorMapper";
import { logger } from "@/lib/logger/logger";
import { getMobileDownloadAppRoute, shouldShowDownloadAppAfterProfileSelection } from "@/lib/mobile/mobileAccess";
import { cn } from "@/lib/utils";
import { useProfiles } from "@features/profile/hooks/useProfiles";
import { useSelectProfile } from "@features/profile/hooks/useSelectProfile";
import { Profile } from "@features/profile/model/types";
import { useBootstrap } from "@lib/bootstrap/BootstrapContext";
import { useToastStore } from "@store/useToastStore";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useOtpStore } from "@/app/login/otp/store";
import { useFocusable, setFocus } from "@noriginmedia/norigin-spatial-navigation";

export default function WatchingPage() {
  const t = useTranslations("watchingPage");
  const router = useRouter();
  const { isAppReady } = useBootstrap();
  const profilesQuery = useProfiles(isAppReady);
  const selectProfile = useSelectProfile();
  const { show: showToast } = useToastStore();
  const { isMobile, isReady: isMobileReady } = useIsMobile();

  // Track failed profile selection for retry UI
  const [failedProfileId, setFailedProfileId] = useState<string | null>(null);

  // Clear OTP auth context and pending QR code when arriving on the watching page
  useEffect(() => {
    useOtpStore.getState().reset();
    localStorage.removeItem("qr_code_pending");
  }, []);

  // Redirect to create-account when profiles are confirmed empty (query settled).
  // Only fires when NOT loading/fetching to avoid acting on stale data mid-refetch.
  useEffect(() => {
    if (
      !profilesQuery.isLoading &&
      !profilesQuery.isFetching &&
      profilesQuery.data &&
      profilesQuery.data.profiles.length === 0
    ) {
      logger.info('[WatchingPage] No profiles found (settled), redirecting to create-account');
      router.replace(ROUTES.REGISTER_CREATE_ACCOUNT);
    }
  }, [profilesQuery.isLoading, profilesQuery.isFetching, profilesQuery.data, router]);

  // Error state
  if (profilesQuery.isError) {
    return <ProfilesErrorFallback onRetry={() => profilesQuery.refetch()} />;
  }

  const profiles = profilesQuery?.data?.profiles || [];

  // Focus the first profile when profiles load
  useEffect(() => {
    if (profiles.length > 0) {
      setTimeout(() => {
        setFocus(`profile-${profiles[0].profile_id}`);
      }, 300);
    }
  }, [profiles.length]);

  // Check if user can add more profiles (max 4)
  const canAddMoreProfiles = profiles?.length < MAX_PROFILES;

  // Handle profile selection
  const handleSelectProfile = async (profile: Profile, targetEl?: HTMLElement) => {
    try {
      setFailedProfileId(null); // Clear any previous failure
      await selectProfile.mutateAsync(profile);

      if (
        isMobileReady &&
        shouldShowDownloadAppAfterProfileSelection(isMobile)
      ) {
        router.replace(getMobileDownloadAppRoute());
      }
    } catch (error) {
      // Component-level logging for debugging
      logger.error('[WatchingPage] Profile selection failed', {
        profile_id: profile.profile_id,
        error
      });

      // Map error and show user feedback
      const errorKey = mapErrorToKey(error, 'Profile Selection');
      showToast(t(errorKey), 'error');

      // Mark this profile as failed for retry UI
      setFailedProfileId(profile?.profile_id);
    }
  };

  // Handle add profile button click
  const handleAddProfile = () => {
    router.push(ROUTES.ADD_PROFILE);
  };

  return (
    <div className="relative min-h-screen overflow-hidden -mt-15 lg:-mt-25">
      <PageBackground />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 sm:px-6 md:px-8 py-8 sm:py-12">
        <div className="w-full max-w-4xl">
          {/* Title - Responsive sizing */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-center mb-8 sm:mb-12 md:mb-16 lg:mb-17 text-theme_1">
            {t("title")}
          </h1>

          {/* Profiles Grid - Responsive gap and layout */}
          <div className="flex flex-wrap gap-4 sm:gap-5 md:gap-6 justify-center items-start">
            {profiles.map((profile) => {
              const isFailed = failedProfileId === profile.profile_id;
              const isDisabled = selectProfile.isPending;

              return (
                <FocusableProfileCard
                  key={profile.profile_id}
                  profile={profile}
                  isFailed={isFailed}
                  isDisabled={isDisabled}
                  handleSelectProfile={handleSelectProfile}
                  t={t}
                />
              );
            })}

            {/* Add Profile Button - Show only if user has less than 4 profiles */}
            {canAddMoreProfiles && (
              <AddProfileButton
                onClick={handleAddProfile}
                disabled={selectProfile.isPending}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FocusableProfileCard({ profile, isFailed, isDisabled, handleSelectProfile, t }: any) {
  const { ref, focused } = useFocusable({
    focusKey: `profile-${profile.profile_id}`,
    onEnterPress: () => {
      if (!isDisabled) {
        handleSelectProfile(profile);
      }
    }
  });

  return (
    <div
      ref={ref as any}
      className={`relative w-20 sm:w-28 md:w-36 lg:w-[186px] shrink-0 transition-transform ${focused ? "scale-[1.05]" : ""}`}
    >
      <JOJOCustomButton
        size={JOJOButton.Size.L}
        state={isDisabled ? JOJOButton.State.DISABLED : JOJOButton.State.DEFAULT}
        onClick={(e) => handleSelectProfile(profile, e.currentTarget)}
        disabled={isDisabled}
        style={{
          background: "none",
          height: "auto",
          padding: 0,
        }}
        className="!h-auto !p-0 !flex-col !items-center !justify-start w-full group focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none cursor-pointer"
      >
        <div className="flex flex-col items-center gap-2 sm:gap-3 md:gap-4 w-full">
          {/* Avatar Image or Fallback */}
          <div className={`shrink-0 relative rounded-full transition-shadow ${focused ? "ring-4 ring-white shadow-xl" : ""}`}>
            {profile.avatar && (profile.avatar.startsWith('http') || profile.avatar.startsWith('/')) ? (
              <JOJOCommonImage
                src={profile.avatar}
                alt={profile.profile_name}
                preset={JOJOImagePreset.Avatar}
                width={186}
                height={186}
                radius={JOJOImageRadius.Full}
                contentMode={JOJOImageContentMode.Cover}
                wrapperClassName={cn(
                  "shrink-0",
                  "!h-20 !w-20",
                  "sm:!h-28 sm:!w-28",
                  "md:!h-36 md:!w-36",
                  "lg:!h-[186px] lg:!w-[186px]",
                  "transition-all duration-200 ease-in-out",
                  "group-hover:scale-[1.04]",
                  isFailed && "opacity-50"
                )}
                className="block"
              />
            ) : (
              <div
                className={cn(
                  "flex items-center justify-center rounded-full shrink-0",
                  "bg-theme_13_samecolour font-bold text-theme_1",
                  "h-20 w-20 text-2xl",
                  "sm:h-28 sm:w-28 sm:text-3xl",
                  "md:h-36 md:w-36 md:text-5xl",
                  "lg:h-[186px] lg:w-[186px] lg:text-6xl",
                  "transition-all duration-200 ease-in-out",
                  "group-hover:scale-[1.04]",
                  isFailed && "opacity-50"
                )}
              >
                {profile.profile_name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Retry indicator for failed profile */}
            {isFailed && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-theme_14_samecolour text-theme_1 rounded-full px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-medium">
                  {t("retry_badge")}
                </div>
              </div>
            )}
          </div>

          {/* Profile Name and Kids Label */}
          <div className="flex flex-col items-center gap-0.5 sm:gap-1 w-full max-w-[80px] sm:max-w-[112px] md:max-w-[144px] lg:max-w-[186px]">
            <span className={`text-sm sm:text-base md:text-lg font-medium text-center break-words line-clamp-2 ${focused ? "text-theme_13_samecolour" : "text-theme_1"}`}>
              {profile.profile_name}
            </span>
            {profile.is_kid && (
              <span className="text-[10px] sm:text-xs text-theme_5">{t("kids_label")}</span>
            )}
          </div>
        </div>
      </JOJOCustomButton>
    </div>
  );
}
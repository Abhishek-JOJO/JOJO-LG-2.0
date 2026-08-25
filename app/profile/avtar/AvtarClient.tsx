"use client";

import { PageBackground } from "@/components/common/PageBackground";
import JOJOCommonImage, {
  JOJOImageFallbackType,
  JOJOImagePreset,
} from "@/components/ui/JOJOCommonImage";
import { ROUTES } from "@/lib/constants/routes";
import { logger } from "@/lib/logger/logger";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { useAllAvatars } from "@features/profile/hooks/useAvatars";
import type { Avatar } from "@features/profile/model/types";
import { ArrowLeft, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  selectSelectedAvatar,
  selectSetSelectedAvatar,
  useCreateAccountStore,
} from "../../register/create-account/store";
import { AVATAR_FLOW_STORAGE_KEYS, AVATAR_RETURN_TARGETS } from "../avatar-flow-storage";

export default function AvtarClient() {
  const t = useTranslations("profilePage");
  const router = useRouter();

  const token = useAuthStore(state => state.token);
  const selectedAvatar = useCreateAccountStore(selectSelectedAvatar);
  const setSelectedAvatar = useCreateAccountStore(selectSetSelectedAvatar);

  const avatarsQuery = useAllAvatars({ limit: 100 });

  useEffect(() => {
    if (!token) {
      logger.warn("[Avatar] Unauthorized access attempt - redirecting to login");
      router.replace(ROUTES.LOGIN);
    }
  }, [token, router]);

  const getReturnRoute = () => {
    const returnTo = window.sessionStorage.getItem(AVATAR_FLOW_STORAGE_KEYS.returnTo);

    if (returnTo !== AVATAR_RETURN_TARGETS.accountSettingsProfileEdit) {
      return ROUTES.ADD_PROFILE;
    }

    window.sessionStorage.setItem(AVATAR_FLOW_STORAGE_KEYS.fromAvatar, "1");
    window.sessionStorage.setItem(AVATAR_FLOW_STORAGE_KEYS.accountSettingsTab, "profile");

    return ROUTES.ACCOUNT_SETTINGS;
  };

  const handleBack = () => {
    router.replace(getReturnRoute());
  };

  const handleAvatarSelect = (avatar: Avatar) => {
    setSelectedAvatar(avatar);
    router.replace(getReturnRoute());
  };

  return (
    <div className="relative min-h-screen overflow-hidden -mt-15 lg:-mt-25">
      <PageBackground />

      <main
        className={cn(
          "relative z-10 min-h-screen w-full",
          "px-4 sm:px-6 lg:px-16",
          "pt-24 pb-10 lg:pt-32"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div
            onClick={handleBack}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              "text-theme_1 transition",
              "hover:bg-theme_13_samecolour",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme_13_samecolour"
            )}
            aria-label={t("back")}
          >
            <ArrowLeft className="h-5 w-5" />
          </div>

          <h1 className="text-xl font-semibold text-theme_1 sm:text-2xl">
            {t("avatar_title")}
          </h1>
        </div>

        {/* Content */}
        <section className="w-full">
          {avatarsQuery.isLoading && (
            <div className="flex min-h-[45vh] items-center justify-center">
              <p className="body-sm-regular text-center text-theme_5">
                {t("avatar_loading")}
              </p>
            </div>
          )}

          {avatarsQuery.isError && (
            <div className="flex min-h-[45vh] flex-col items-center justify-center gap-4">
              <p className="body-sm-regular text-center text-theme_5">
                {t("avatar_error")}
              </p>

              <div
                onClick={() => avatarsQuery.refetch()}
                className={cn(
                  "body-sm-medium rounded-full px-6 py-2.5",
                  "bg-theme_13_samecolour text-theme_1 transition hover:opacity-90",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme_13_samecolour"
                )}
              >
                {t("avatar_retry")}
              </div>
            </div>
          )}

          {!avatarsQuery.isLoading &&
            !avatarsQuery.isError &&
            avatarsQuery.data?.length === 0 && (
              <div className="flex items-center justify-center min-h-[45vh]">
                <p className="body-sm-regular text-center text-theme_5">
                  {t("avatar_empty")}
                </p>
              </div>
            )}

          {!avatarsQuery.isLoading &&
            !avatarsQuery.isError &&
            avatarsQuery.data &&
            avatarsQuery.data.length > 0 && (
              <div
                className={cn(
                  "grid",
                  "grid-cols-4",
                  "sm:grid-cols-5",
                  "md:grid-cols-6",
                  "lg:grid-cols-8",
                  "xl:grid-cols-10",
                  "gap-4 sm:gap-5 md:gap-6 lg:gap-7"
                )}
              >
                {avatarsQuery.data.map((avatar, index) => {
                  const avatarKey = avatar.avatar_id || avatar.url || String(index);

                  const isSelected =
                    selectedAvatar?.url === avatar.url ||
                    Boolean(
                      selectedAvatar?.avatar_id &&
                      selectedAvatar.avatar_id === avatar.avatar_id
                    );

                  return (
                    <div
                      key={avatarKey}
                      onClick={() => handleAvatarSelect(avatar)}
                      className={cn(
                        "relative aspect-square w-full rounded-full",
                        "p-1 transition duration-200",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme_13_samecolour",
                        isSelected
                          ? "scale-105 ring-2 ring-theme_13_samecolour"
                          : "hover:scale-105"
                      )}
                      aria-label={t("avatar_label")}
                    >
                      <JOJOCommonImage
                        src={avatar.url}
                        altKey="img_avatar"
                        preset={JOJOImagePreset.Avatar}
                        fill
                        sizes="(max-width: 640px) 25vw, (max-width: 768px) 20vw, (max-width: 1024px) 16vw, (max-width: 1280px) 12vw, 10vw"
                        fallback={{ type: JOJOImageFallbackType.None }}
                        wrapperClassName="rounded-full cursor-pointer"
                      />

                      {isSelected && (
                        <span
                          className={cn(
                            "absolute right-0 top-0 z-20",
                            "flex h-6 w-6 items-center justify-center rounded-full",
                            "bg-theme_13_samecolour text-theme_1 shadow-lg"
                          )}
                        >
                          <Check className="h-3.5 w-3.5" strokeWidth={3} />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
        </section>
      </main>
    </div>
  );
}

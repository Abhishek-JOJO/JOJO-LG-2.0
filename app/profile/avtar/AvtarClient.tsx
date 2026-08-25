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
import { useFocusable, FocusContext } from "@noriginmedia/norigin-spatial-navigation";
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

  const { ref: containerRef, focusKey: containerFocusKey } = useFocusable({
    trackChildren: true,
    focusKey: "avatar-page-container",
  });

  return (
    <FocusContext.Provider value={containerFocusKey}>
    <div ref={containerRef as any} className="relative min-h-screen overflow-hidden -mt-15 lg:-mt-25">
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
          <FocusableIconButton onClick={handleBack} ariaLabel={t("back")} focusKey="avatar-back-btn">
            <ArrowLeft className="h-5 w-5" />
          </FocusableIconButton>

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

              <FocusableRetryButton onClick={() => avatarsQuery.refetch()} label={t("avatar_retry")} />
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
                    <FocusableAvatarGridItem
                      key={avatarKey}
                      focusKey={`avatar-grid-${avatarKey}`}
                      onSelect={() => handleAvatarSelect(avatar)}
                      isSelected={isSelected}
                      ariaLabel={t("avatar_label")}
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
                    </FocusableAvatarGridItem>
                  );
                })}
              </div>
            )}
        </section>
      </main>
    </div>
    </FocusContext.Provider>
  );
}

function FocusableIconButton({
  onClick,
  ariaLabel,
  focusKey,
  children,
}: {
  onClick: () => void;
  ariaLabel: string;
  focusKey: string;
  children: React.ReactNode;
}) {
  const { ref, focused } = useFocusable({ focusKey, onEnterPress: onClick });
  return (
    <div
      ref={ref as any}
      onClick={onClick}
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
        "text-theme_1 transition cursor-pointer",
        "hover:bg-theme_13_samecolour",
        "focus-visible:outline-none",
        focused ? "ring-2 ring-white bg-theme_13_samecolour scale-105" : ""
      )}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}

function FocusableRetryButton({ onClick, label }: { onClick: () => void; label: string }) {
  const { ref, focused } = useFocusable({ focusKey: "avatar-retry-btn", onEnterPress: onClick });
  return (
    <div
      ref={ref as any}
      onClick={onClick}
      className={cn(
        "body-sm-medium rounded-full px-6 py-2.5 cursor-pointer",
        "bg-theme_13_samecolour text-theme_1 transition hover:opacity-90",
        "focus-visible:outline-none",
        focused ? "ring-2 ring-white scale-105" : ""
      )}
    >
      {label}
    </div>
  );
}

function FocusableAvatarGridItem({
  focusKey,
  onSelect,
  isSelected,
  ariaLabel,
  children,
}: {
  focusKey: string;
  onSelect: () => void;
  isSelected: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  const { ref, focused } = useFocusable({
    focusKey,
    onEnterPress: onSelect,
    onFocus: () => {
      (ref.current as HTMLElement | null)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    },
  });
  return (
    <div
      ref={ref as any}
      onClick={onSelect}
      className={cn(
        "relative aspect-square w-full rounded-full cursor-pointer",
        "p-1 transition duration-200",
        "focus-visible:outline-none",
        isSelected
          ? "scale-105 ring-2 ring-theme_13_samecolour"
          : "hover:scale-105",
        focused ? "ring-2 ring-white scale-105" : ""
      )}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}

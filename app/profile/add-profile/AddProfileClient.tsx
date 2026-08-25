"use client";

import { Chip } from "@/components/common/chip-form";
import { FieldError } from "@/components/common/field-error";
import { PageBackground } from "@/components/common/PageBackground";
import { JOJOButton, JOJOCustomButton } from "@/components/ui/JOJOButton";
import { JOJOCardContent, JOJOCardFooter, JOJOCardHeader, JOJOCardTitle, JOJOCustomCard } from "@/components/ui/JOJOCard";
import JOJOCommonImage, { JOJOImageFallbackType, JOJOImagePreset } from "@/components/ui/JOJOCommonImage";
import { JOJOCustomInput, JOJOInput } from "@/components/ui/JOJOInput";
import { AGE_RANGES, AgeRange, ErrorKey, Gender, GENDER_LABEL_KEY, GENDERS } from "@/enums/ui.enum";
import { ROUTES } from "@/lib/constants/routes";
import { AVATAR_FLOW_STORAGE_KEYS } from "../avatar-flow-storage";
import { logger } from "@/lib/logger/logger";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { useProfileStore } from "@/store/useProfileStore";
import { themeColors } from "@/tailwind.config";
import { useCreateProfile } from "@features/profile/hooks/useProfiles";
import { useUpdateProfile } from "@features/profile/hooks/useUpdateProfile";
import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFocusable, FocusContext } from "@noriginmedia/norigin-spatial-navigation";
import { selectAge, selectAgeError, selectCanSubmit, selectGender, selectGenderError, selectName, selectNameError, selectNameTouched, selectReset, selectSelectedAvatar, selectSetAge, selectSetGender, selectSetName, selectSubmit, selectTouchName, useCreateAccountStore } from "../../register/create-account/store";

export default function AddProfileClient() {
    const t = useTranslations("profilePage");
    const router = useRouter();
    const createProfile = useCreateProfile();
    const updateProfile = useUpdateProfile();

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
    const selectedAvatar = useCreateAccountStore(selectSelectedAvatar);
    const touchName = useCreateAccountStore(selectTouchName);
    const submit = useCreateAccountStore(selectSubmit);
    const reset = useCreateAccountStore(selectReset);

    // Submission guard - prevents double submission
    const [isSubmitting, setIsSubmitting] = useState(false);
    const hasRedirected = useRef(false);
    const isNavigatingToAvatar = useRef(false);

    const { ref: containerRef, focusKey: containerFocusKey } = useFocusable({
        trackChildren: true,
        focusKey: "add-profile-container",
    });

    const getCreatedProfileId = (response: any) => {
        const data = response?.data;

        return data?.profile_id
            || data?.id
            || data?.profile?.profile_id
            || data?.profile?.id
            || data.avtar_id
            || response?.profile_id
            || response?.id
            || "";
    };

    // Route protection: Redirect to login if not authenticated
    useEffect(() => {
        if (!token) {
            logger.warn("[CreateAccount] Unauthorized access attempt - redirecting to login");
            router.replace(ROUTES.LOGIN);
        }
    }, [token, router]);

    useEffect(() => () => {
        if (!isNavigatingToAvatar.current && !hasRedirected.current) {
            reset();
        }
    }, [reset]);

    const handleAvatarNavigation = () => {
        if (isSubmitting) return;

        isNavigatingToAvatar.current = true;
        window.sessionStorage.removeItem(AVATAR_FLOW_STORAGE_KEYS.returnTo);
        window.sessionStorage.removeItem(AVATAR_FLOW_STORAGE_KEYS.editProfileId);
        window.sessionStorage.removeItem(AVATAR_FLOW_STORAGE_KEYS.fromAvatar);
        window.sessionStorage.removeItem(AVATAR_FLOW_STORAGE_KEYS.accountSettingsTab);
        router.push(ROUTES.AVATAR);
    };

    const handleSubmit = async (e: any) => {
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
                const createResponse = await createProfile.mutateAsync({
                    profile_name: data.name,
                    age: data.age,
                    gender: data.gender,
                    is_kid: false,
                    avatar_id: selectedAvatar?.avatar_id,
                    avatar_url: selectedAvatar?.url,
                });

                const profileId = getCreatedProfileId(createResponse);

                if (profileId) {
                    await updateProfile.mutateAsync({
                        profile_id: profileId,
                        profile_name: data.name,
                        avatar: selectedAvatar?.url,
                        avatar_url: selectedAvatar?.url,
                        is_kid: false,
                        avatar_id: selectedAvatar?.avatar_id,
                    });
                } else {
                    logger.warn("[CreateAccount] Profile created but profile_id not found for update", {
                        createResponse,
                    });
                }

                logger.info("[CreateAccount] Profile created successfully, redirecting...");

                // Mark as redirected to prevent duplicate redirects
                hasRedirected.current = true;
                reset();
                const profileReturnTo = typeof window !== "undefined"
                    ? window.sessionStorage.getItem("jojo.profile.returnTo")
                    : null;

                if (profileReturnTo === ROUTES.ACCOUNT_SETTINGS) {
                    if (profileId) {
                        useProfileStore.getState().setSelectedProfile({
                            profile_id: profileId,
                            profile_name: data.name,
                            avatar: selectedAvatar?.url ?? "",
                            is_kid: false,
                        }, true);
                    }
                    window.sessionStorage.removeItem("jojo.profile.returnTo");
                    router.push(ROUTES.ACCOUNT_SETTINGS + "?tab=profile");
                } else {
                    router.push(ROUTES.WATCHING);
                }
            } catch (error) {
                logger.error("[CreateAccount] Failed to create profile", { error });

                // Re-enable form on error
                setIsSubmitting(false);
            }
        });
    };

    return (
        <FocusContext.Provider value={containerFocusKey}>
        <div ref={containerRef as any} className="relative min-h-screen overflow-hidden -mt-15 lg:-mt-25">
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
                            <JOJOCardTitle>{t("add-profile")}</JOJOCardTitle>
                        </JOJOCardHeader>
                        <JOJOCardContent className="w-full space-y-2" gap="5px">

                            <div className="flex flex-col items-center gap-3 py-2">
                                <FocusableAvatarPicker
                                    onSelect={handleAvatarNavigation}
                                    disabled={isSubmitting}
                                    ariaLabel={t("avatar_label")}
                                >
                                    {selectedAvatar ? (
                                        <>
                                            <JOJOCommonImage
                                                src={selectedAvatar.url}
                                                altKey="img_avatar"
                                                preset={JOJOImagePreset.Avatar}
                                                fill
                                                sizes="144px"
                                                fallback={{ type: JOJOImageFallbackType.None }}
                                                wrapperClassName="rounded-full"
                                            />

                                            <div
                                                className={cn(
                                                    "absolute inset-0 z-10 flex items-center justify-center rounded-full",
                                                    "bg-black/45 opacity-0 transition-opacity duration-200",
                                                    "group-hover:opacity-100"
                                                )}
                                            >
                                                <Pencil className="h-7 w-7 text-theme_1" strokeWidth={2.4} />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center rounded-full">
                                            <span className="text-5xl font-light leading-none text-theme_1 transition group-hover:text-theme_13_samecolour">
                                                +
                                            </span>
                                        </div>
                                    )}
                                </FocusableAvatarPicker>
                            </div>

                            <div className="w-full">
                                <label className="mb-2 block text-[15px] font-bold text-theme_1">
                                    {t("full_name_label")}
                                </label>
                                <FocusableNameInput
                                    value={name}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                                    onBlur={() => touchName()}
                                    placeholder={t("full_name_placeholder")}
                                    error={!!(nameTouched && nameError)}
                                    disabled={isSubmitting}
                                />
                                <div className="mt-1 flex justify-between items-center">
                                    <div>
                                        {nameError && nameTouched && (
                                            <FieldError msg={t(nameError)} />
                                        )}
                                    </div>
                                    <span className={`text-xs ${name.length >= 25 ? 'text-red-500' : 'text-theme_5'}`}>
                                        {`${name.length}/25`}
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
                                            focusKey={`add-age-${range}`}
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
                                            focusKey={`add-gender-${g}`}
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
                            <FocusableSaveButton
                                disabled={!canSubmit || isSubmitting || createProfile.isPending || updateProfile.isPending}
                                isLoading={isSubmitting || createProfile.isPending || updateProfile.isPending}
                                active={canSubmit && !isSubmitting}
                                label={t("save")}
                            />
                        </JOJOCardFooter>
                    </form>
                </JOJOCustomCard>
            </div>
        </div>
        </FocusContext.Provider>
    );
}

function FocusableAvatarPicker({
    onSelect,
    disabled,
    ariaLabel,
    children,
}: {
    onSelect: () => void;
    disabled: boolean;
    ariaLabel: string;
    children: React.ReactNode;
}) {
    const { ref, focused } = useFocusable({
        focusKey: "add-profile-avatar",
        onEnterPress: onSelect,
    });
    return (
        <div
            ref={ref as any}
            onClick={onSelect}
            className={cn(
                "group relative h-32 w-32 overflow-hidden rounded-full bg-theme_10_80 transition sm:h-36 sm:w-36",
                "border border-theme_1/10 hover:border-theme_13_samecolour",
                "focus-visible:outline-none",
                disabled && "cursor-not-allowed opacity-60",
                focused ? "ring-2 ring-white border-theme_13_samecolour scale-105" : ""
            )}
            aria-label={ariaLabel}
        >
            {children}
        </div>
    );
}

function FocusableNameInput({
    value,
    onChange,
    onBlur,
    placeholder,
    error,
    disabled,
}: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur: () => void;
    placeholder: string;
    error: boolean;
    disabled: boolean;
}) {
    const { ref, focused } = useFocusable({
        focusKey: "add-profile-name",
        onEnterPress: () => (ref.current as HTMLInputElement | null)?.focus(),
    });
    return (
        <>
            <JOJOCustomInput
                ref={ref as any}
                state={JOJOInput.State.DEFAULT}
                placeholder={placeholder}
                autoComplete="name"
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                className={cn("w-full body-sm-regular bg-theme_10", focused ? "ring-2 ring-white" : "")}
                error={error}
                disabled={disabled}
                maxLength={25}
            />
        </>
    );
}

function FocusableSaveButton({
    disabled,
    isLoading,
    active,
    label,
}: {
    disabled: boolean;
    isLoading: boolean;
    active: boolean;
    label: string;
}) {
    const { ref, focused } = useFocusable({
        focusKey: "add-profile-save",
        onEnterPress: () => (ref.current as HTMLButtonElement | null)?.click(),
    });
    return (
        <JOJOCustomButton
            ref={ref as any}
            size={JOJOButton.Size.L}
            state={active ? JOJOButton.State.ACTIVE : JOJOButton.State.DISABLED}
            hoverColor={themeColors.theme_13_samecolour}
            type="submit"
            disabled={disabled}
            isLoading={isLoading}
            className={cn(
                "mx-auto w-1/4 rounded-[100px] border-none body-sm-medium hover:opacity-90",
                focused ? "ring-2 ring-white scale-105" : ""
            )}
        >
            {label}
        </JOJOCustomButton>
    );
}

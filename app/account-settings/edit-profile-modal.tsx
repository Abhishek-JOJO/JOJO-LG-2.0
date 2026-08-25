"use client";

import { AVATAR_FLOW_STORAGE_KEYS, AVATAR_RETURN_TARGETS } from "@/app/profile/avatar-flow-storage";
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
    selectSelectedAvatar,
    selectSetAge,
    selectSetGender,
    selectSetName,
    selectSubmit,
    selectTouchName,
    useCreateAccountStore,
} from "@/app/register/create-account/store";
import { Chip } from "@/components/common/chip-form";
import { FieldError } from "@/components/common/field-error";
import { JOJOButton, JOJOCustomButton } from "@/components/ui/JOJOButton";
import { JOJOCardContent, JOJOCardFooter, JOJOCardHeader, JOJOCardTitle, JOJOCustomCard } from "@/components/ui/JOJOCard";
import JOJOCommonImage, { JOJOImageFallbackType, JOJOImagePreset } from "@/components/ui/JOJOCommonImage";
import { JOJOCustomInput, JOJOInput } from "@/components/ui/JOJOInput";
import { AGE_RANGES, AgeRange, ErrorKey, Gender, GENDER_LABEL_KEY, GENDERS } from "@/enums/ui.enum";
import type { Profile } from "@/features/profile/model/types";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { themeColors } from "@/tailwind.config";
import { useUpdateProfile } from "@features/profile/hooks/useUpdateProfile";
import { Pencil, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFocusable, FocusContext, setFocus } from "@noriginmedia/norigin-spatial-navigation";

const WEBOS_BACK_KEYCODE = 461;

interface EditProfileModalProps {
    profile: Profile;
    onClose: () => void;
    onSaved: () => void;
}

export default function EditProfileModal({ profile, onClose, onSaved }: EditProfileModalProps) {
    const t = useTranslations("profilePage");
    const router = useRouter();
    const updateProfile = useUpdateProfile();

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

    const [isSubmitting, setIsSubmitting] = useState(false);
    const isNavigatingToAvatar = useRef(false);
    const [shouldPreserveAvatarSelection] = useState(
        () =>
            typeof window !== "undefined" &&
            window.sessionStorage.getItem(AVATAR_FLOW_STORAGE_KEYS.fromAvatar) === "1"
    );

    // Scope D-pad navigation to this modal and focus it on open, mirroring AssetDetailModal
    const { ref: modalRef, focusKey: modalFocusKey } = useFocusable({
        focusKey: "EDIT_PROFILE_MODAL",
        isFocusBoundary: true,
    });

    useEffect(() => {
        const t = setTimeout(() => setFocus("EDIT_PROFILE_MODAL"), 100);
        return () => clearTimeout(t);
    }, []);

    // This modal is an in-place overlay (no route/history entry behind it), so the
    // global RemoteManager back-key handler would call history.back() and navigate
    // away instead of closing it. Intercept the webOS back key here directly.
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.keyCode === WEBOS_BACK_KEYCODE || e.key === "Escape") && !isSubmitting) {
                e.preventDefault();
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isSubmitting, onClose]);

    useEffect(() => {
        const hasAge = AGE_RANGES.includes(profile?.age as AgeRange);
        const hasGender = GENDERS.includes(profile?.gender as Gender);

        if (shouldPreserveAvatarSelection) {
            if (!name) setName(profile.profile_name);
            if (!age && hasAge) setAge(profile.age as AgeRange);
            if (!gender && hasGender) setGender(profile.gender as Gender);
            return;
        }

        reset();
        setName(profile.profile_name);
        if (hasAge) setAge(profile.age as AgeRange);
        if (hasGender) setGender(profile.gender as Gender);
    }, [profile.profile_id]);

    useEffect(() => {
        return () => {
            if (!isNavigatingToAvatar.current) {
                reset();
            }
        };
    }, [reset]);

    const handleAvatarNavigation = () => {
        if (isSubmitting) return;
        isNavigatingToAvatar.current = true;
        window.sessionStorage.setItem(
            AVATAR_FLOW_STORAGE_KEYS.returnTo,
            AVATAR_RETURN_TARGETS.accountSettingsProfileEdit
        );
        window.sessionStorage.setItem(AVATAR_FLOW_STORAGE_KEYS.editProfileId, profile.profile_id);
        window.sessionStorage.removeItem(AVATAR_FLOW_STORAGE_KEYS.fromAvatar);
        router.push(ROUTES.AVATAR);
    };

    const handleSubmit = async (e: SubmitEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        submit(async (data) => {
            setIsSubmitting(true);
            try {
                await updateProfile.mutateAsync({
                    profile_id: profile.profile_id,
                    profile_name: data.name,
                    avatar: selectedAvatar?.url ?? profile.avatar,
                    avatar_url: selectedAvatar?.url ?? profile.avatar,
                    avatar_id: selectedAvatar?.avatar_id ?? profile.avatar_id,
                    age: data.age,
                    gender: data.gender,
                    is_kid: profile.is_kid,
                });
                reset();
                onSaved();
                onClose();
            } catch {
                setIsSubmitting(false);
            }
        });
    };

    // Close on backdrop click
    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
    };

    const currentAvatarUrl = selectedAvatar?.url ?? (profile.avatar?.startsWith("http") ? profile.avatar : null);

    return (
        <FocusContext.Provider value={modalFocusKey}>
        <div
            ref={modalRef as any}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-black/60 backdrop-blur-sm"
            onClick={handleBackdropClick}
        >
            <JOJOCustomCard className="w-full max-w-sm sm:max-w-md overflow-hidden relative">
                <FocusableCloseButton onClose={onClose} disabled={isSubmitting} />
                <form
                    onSubmit={handleSubmit as any}
                    noValidate
                    className={`w-full ${isSubmitting ? "pointer-events-none opacity-75" : ""}`}
                >
                    <JOJOCardHeader className="pb-6">
                        <JOJOCardTitle>{t("edit-profile") ?? "Edit Profile"}</JOJOCardTitle>
                    </JOJOCardHeader>

                    <JOJOCardContent className="w-full space-y-2" gap="5px">
                        <div className="flex flex-col items-center gap-3 py-2">
                            <FocusableAvatarEdit
                                onSelect={handleAvatarNavigation}
                                disabled={isSubmitting}
                                ariaLabel={t("avatar_label")}
                            >
                                {currentAvatarUrl ? (
                                    <>
                                        <JOJOCommonImage
                                            src={currentAvatarUrl}
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
                                            {profile.profile_name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                )}
                            </FocusableAvatarEdit>
                        </div>

                        {/* Name input */}
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
                                <span className={`text-xs ${name.length >= 25 ? "text-red-500" : "text-theme_5"}`}>
                                    {`${name.length}/25`}
                                </span>
                            </div>
                        </div>

                        {/* Age chips */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[15px] font-bold text-theme_1">
                                {t("age_label")}
                            </label>
                            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                                {AGE_RANGES.map((range) => (
                                    <Chip
                                        key={range}
                                        focusKey={`edit-age-${range}`}
                                        label={range}
                                        active={age === range}
                                        onClick={() => !isSubmitting && setAge(range as AgeRange)}
                                    />
                                ))}
                            </div>
                            {ageError && <FieldError msg={t(ErrorKey.ERR_AGE_REQUIRED)} />}
                        </div>

                        {/* Gender chips */}
                        <div className="flex flex-col gap-2.5">
                            <label className="text-[15px] font-bold text-theme_1">
                                {t("gender_label")}
                            </label>
                            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                                {GENDERS.map((g) => (
                                    <Chip
                                        key={g}
                                        focusKey={`edit-gender-${g}`}
                                        label={t(GENDER_LABEL_KEY[g as Gender])}
                                        active={gender === g}
                                        onClick={() => !isSubmitting && setGender(g as Gender)}
                                    />
                                ))}
                            </div>
                            {genderError && <FieldError msg={t(ErrorKey.ERR_GENDER_REQUIRED)} />}
                        </div>
                    </JOJOCardContent>

                    <JOJOCardFooter className="pt-8">
                        <FocusableSaveButton
                            disabled={!canSubmit || isSubmitting || updateProfile.isPending}
                            isLoading={isSubmitting || updateProfile.isPending}
                            active={canSubmit && !isSubmitting}
                            label={t("save")}
                        />
                    </JOJOCardFooter>
                </form>
            </JOJOCustomCard>
        </div>
        </FocusContext.Provider>
    );
}

function FocusableCloseButton({ onClose, disabled }: { onClose: () => void; disabled: boolean }) {
    const { ref, focused } = useFocusable({
        focusKey: "edit-profile-close",
        onEnterPress: onClose,
    });
    return (
        <JOJOCustomButton
            ref={ref as any}
            size={JOJOButton.Size.S}
            state={JOJOButton.State.ACTIVE}
            hoverColor="theme_10"
            type="button"
            onClick={onClose}
            disabled={disabled}
            className={cn(
                "absolute top-4 right-4 z-10 text-theme_5 hover:text-theme_1 transition-colors",
                focused ? "ring-2 ring-white rounded-full" : ""
            )}
            bgColor="none"
            aria-label="Close"
        >
            <X className="w-5 h-5" />
        </JOJOCustomButton>
    );
}

function FocusableAvatarEdit({
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
        focusKey: "edit-profile-avatar",
        onEnterPress: onSelect,
    });
    return (
        <div
            ref={ref as any}
            onClick={onSelect}
            className={cn(
                "group relative h-32 w-32 overflow-hidden rounded-full bg-theme_10_80 transition sm:h-36 sm:w-36",
                "border border-theme_1/10 hover:border-theme_13_samecolour",
                "focus-visible:outline-none cursor-pointer",
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
        focusKey: "edit-profile-name",
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
        focusKey: "edit-profile-save",
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

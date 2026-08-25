"use client";

import JOJOCommonImage, { JOJOImageContentMode, JOJOImageRadius } from "@/components/ui/JOJOCommonImage";
import { useProfiles } from "@/features/profile/hooks/useProfiles";
import { useSelectProfile } from "@/features/profile/hooks/useSelectProfile";
import type { Profile } from "@/features/profile/model/types";
import { useBootstrap } from "@/lib/bootstrap/BootstrapContext";
import { cn } from "@/lib/utils";
import { useProfileStore } from "@/store/useProfileStore";
import { Plus, SquarePen } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import EditProfileModal from "./edit-profile-modal";
import JOJOGoldRowSection from "./jojo-gold-row-section";
import { AVATAR_FLOW_STORAGE_KEYS } from "../profile/avatar-flow-storage";

import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { MAX_PROFILES } from "@/features/profile/constants/profile.constants";
import { useFocusable, FocusContext, setFocus } from "@noriginmedia/norigin-spatial-navigation";

function FocusableProfileCard({ profile, isSelected, onSelect, onEdit }: any) {
    const hasAvatar = profile.avatar && (profile.avatar.startsWith("http") || profile.avatar.startsWith("/"));
    const { ref, focused } = useFocusable({
        focusKey: `profile-card-${profile.profile_id}`,
        onEnterPress: onSelect,
    });

    return (
        <div
            ref={ref as any}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            onClick={onSelect}
            className={cn(
                "relative flex flex-col items-center gap-2 rounded-lg bg-theme_10/50 p-8 transition-colors duration-200 cursor-pointer",
                isSelected ? "ring-1 ring-theme_13_samecolour/50 bg-theme_10/70" : "hover:bg-theme_10/70",
                focused ? "ring-2 ring-white scale-105 z-10 bg-theme_10/90" : ""
            )}
        >
            {isSelected &&
                <div
                    onClick={onEdit}
                    className={cn(
                        "absolute right-3 top-3 z-10",
                        "flex h-6 w-6 items-center justify-center rounded-full",
                        "border-2 border-none shadow-sm",
                        "text-theme_1 hover:text-theme_13_samecolour transition-opacity duration-200 hover:opacity-90 cursor-pointer"
                    )}
                    aria-label={`Edit ${profile.profile_name}`}
                >
                    <SquarePen className="h-5 w-5" strokeWidth={2.2} />
                </div>
            }

            <div className="relative">
                <div
                    className={cn(
                        "w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden shrink-0 transition-all duration-200",
                        "outline-none focus-visible:ring-2 focus-visible:ring-theme_13"
                    )}
                    aria-label={profile.profile_name}
                >
                    {hasAvatar ? (
                        <JOJOCommonImage
                            src={profile.avatar}
                            alt={profile.profile_name}
                            width={112}
                            height={112}
                            radius={JOJOImageRadius.Full}
                            contentMode={JOJOImageContentMode.Cover}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-theme_1">
                            {profile.profile_name.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
            </div>

            <span className={cn("text-lg font-medium text-center line-clamp-1 w-28 transition-colors duration-200", focused ? "text-theme_13_samecolour" : "")}>
                {profile.profile_name}
            </span>
        </div>
    );
}

function FocusableAddProfile({ onAdd, tWatching }: any) {
    const { ref, focused } = useFocusable({
        focusKey: 'add-profile-card',
        onEnterPress: onAdd,
    });

    return (
        <div
            ref={ref as any}
            role="button"
            tabIndex={0}
            onClick={onAdd}
            className={cn(
                "relative flex flex-col items-center gap-2 rounded-lg bg-theme_10/50 p-8 transition-colors duration-200 cursor-pointer hover:bg-theme_10/70",
                focused ? "ring-2 ring-white scale-105 z-10 bg-theme_10/90" : ""
            )}
        >
            <div className="relative">
                <div
                    className={cn(
                        "w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center shrink-0 transition-all duration-200",
                        "border-2 border-dashed border-theme_7 bg-theme_10 hover:bg-theme_9",
                        focused ? "border-theme_1 border-solid" : ""
                    )}
                >
                    <Plus className={cn("text-theme_7 w-8 h-8 sm:w-10 sm:h-10", focused ? "text-theme_1" : "")} strokeWidth={2} />
                </div>
            </div>
            <span className={cn("text-lg font-medium text-center line-clamp-1 w-28 text-theme_7", focused ? "text-theme_1" : "")}>
                {tWatching("add_profile")}
            </span>
        </div>
    );
}

export default function ProfilePart() {
    const tSettings = useTranslations("tSettings");

    return (
        <div className="space-y-8">
            <JOJOGoldRowSection />
            <div className="space-y-6 pt-2">
                <h3 className="text-lg font-medium text-theme_1">
                    {tSettings("all_profiles")}
                </h3>
                <ProfilesList />
            </div>
        </div>
    );
}

function ProfilesList() {
    const router = useRouter();
    const tWatching = useTranslations("watchingPage");
    const { isAppReady } = useBootstrap();
    const profilesQuery = useProfiles(isAppReady);
    const selectProfile = useSelectProfile();
    const selectedProfile = useProfileStore((state) => state.selectedProfile);
    const [editProfileId, setEditProfileId] = useState<string | null>(() => {
        if (typeof window === "undefined") return null;
        return window.sessionStorage.getItem(AVATAR_FLOW_STORAGE_KEYS.editProfileId);
    });

    const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
    const profiles = profilesQuery?.data?.profiles || [];

    const { ref: containerRef, focusKey: containerFocusKey } = useFocusable({
        trackChildren: true,
        autoRestoreFocus: true,
        isFocusBoundary: false,
        focusKey: 'profile-list-container'
    });

    const handleAddProfile = () => {
        window.sessionStorage.setItem("jojo.profile.returnTo", ROUTES.ACCOUNT_SETTINGS);
        window.sessionStorage.setItem(AVATAR_FLOW_STORAGE_KEYS.accountSettingsTab, "profile");
        router.push(ROUTES.ADD_PROFILE);
    };

    const canAddMoreProfiles = profiles.length < MAX_PROFILES;

    const isSelected = (profile: Profile) =>
        selectedProfile?.profile_id === profile.profile_id;

    const clearEditRouteState = () => {
        window.sessionStorage.removeItem(AVATAR_FLOW_STORAGE_KEYS.returnTo);
        window.sessionStorage.removeItem(AVATAR_FLOW_STORAGE_KEYS.editProfileId);
        window.sessionStorage.removeItem(AVATAR_FLOW_STORAGE_KEYS.fromAvatar);
        window.sessionStorage.removeItem(AVATAR_FLOW_STORAGE_KEYS.accountSettingsTab);
        setEditProfileId(null);
    };

    const closeEditingProfile = () => {
        const idToFocus = editingProfile?.profile_id;
        setEditingProfile(null);
        clearEditRouteState();
        if (idToFocus) {
            setTimeout(() => setFocus(`profile-card-${idToFocus}`), 100);
        }
    };

    useEffect(() => {
        if (!editProfileId || editingProfile) return;

        const profileToEdit = profiles.find(
            (profile) => String(profile.profile_id) === editProfileId
        );

        if (profileToEdit) {
            setEditingProfile(profileToEdit);
            setTimeout(() => setFocus(`profile-card-${profileToEdit.profile_id}`), 300);
        }
    }, [editProfileId, profiles, editingProfile]);

    if (profilesQuery.isLoading) {
        return <div className="text-theme_5 text-sm">Loading profiles...</div>;
    }

    if (profilesQuery.isError) {
        return <div className="text-theme_14 text-sm">Error loading profiles</div>;
    }

    return (
        <FocusContext.Provider value={containerFocusKey}>
            <div ref={containerRef as any} className="flex flex-wrap gap-8 items-start">
                {profiles.map((profile) => {
                    const isProfileSelected = isSelected(profile);
                    return <FocusableProfileCard 
                        key={profile.profile_id} 
                        profile={profile} 
                        isSelected={isProfileSelected} 
                        onSelect={() => {
                            if (isProfileSelected) {
                                setEditingProfile(profile);
                            } else {
                                selectProfile?.mutate(profile);
                            }
                        }} 
                        onEdit={(e: React.MouseEvent) => {
                            e?.stopPropagation?.();
                            e?.preventDefault?.();
                            setEditingProfile(profile);
                        }} 
                    />;
                })}
                {canAddMoreProfiles && (
                    <FocusableAddProfile onAdd={handleAddProfile} tWatching={tWatching} />
                )}
            </div>

            {/* Edit Profile Modal */}
            {editingProfile && (
                <EditProfileModal
                    profile={editingProfile}
                    onClose={closeEditingProfile}
                    onSaved={() => {
                        const idToFocus = editingProfile.profile_id;
                        profilesQuery.refetch();
                        setEditingProfile(null);
                        clearEditRouteState();
                        setTimeout(() => setFocus(`profile-card-${idToFocus}`), 200);
                    }}
                />
            )}
        </FocusContext.Provider>
    );
}

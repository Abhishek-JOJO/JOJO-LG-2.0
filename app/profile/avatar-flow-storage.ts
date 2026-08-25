"use client";

export const AVATAR_FLOW_STORAGE_KEYS = {
  returnTo: "jojo.avatar.returnTo",
  editProfileId: "jojo.avatar.editProfileId",
  fromAvatar: "jojo.avatar.fromAvatar",
  accountSettingsTab: "jojo.accountSettings.tab",
} as const;

export const AVATAR_RETURN_TARGETS = {
  accountSettingsProfileEdit: "account-settings-profile-edit",
} as const;

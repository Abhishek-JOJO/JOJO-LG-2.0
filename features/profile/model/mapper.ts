/**
 * Profile Feature Mappers
 * Transform API responses to domain models
 */

import type { ApiResponse, ProfilesResponse, Profile, Avatar } from "./types";

function getAvatarUrl(apiProfile: any): string {
  const avatar = apiProfile?.avatar;

  if (typeof avatar === "string") {
    return apiProfile.avatar_url || apiProfile.url_path || avatar;
  }

  return apiProfile?.avatar_url
    || apiProfile?.url_path
    || avatar?.avatar_url
    || avatar?.url_path
    || avatar?.url
    || "";
}

export function mapProfilesResponse(apiResponse: ApiResponse<any>): ProfilesResponse {
  const data = apiResponse.data;
  
  if (!data) {
    return {
      profiles: [],
      selected_profile: null,
    };
  }
  
  return {
    profiles: Array.isArray(data.profiles) ? data.profiles.map(mapProfile) : [],
    selected_profile: data.selected_profile ? mapProfile(data.selected_profile) : null,
  };
}

export function mapProfile(apiProfile: any): Profile {
  return {
    profile_id: apiProfile.profile_id || apiProfile.id || '',
    profile_name: apiProfile.profile_name || apiProfile.name || '',
    avatar: getAvatarUrl(apiProfile),
    avatar_id: apiProfile.avatar_id ? Number(apiProfile.avatar_id) : undefined,
    age: apiProfile.age || "",
    gender: apiProfile.gender || "",
    is_kid: apiProfile.is_kid || false,
  };
}

export function mapAvatarsResponse(apiResponse: ApiResponse<any>): Avatar[] {
  const data = Array.isArray(apiResponse.data)
    ? apiResponse.data
    : apiResponse.data?.avatars ?? apiResponse.data?.avatar ?? apiResponse.data?.items ?? [];
  
  if (!Array.isArray(data)) {
    return [];
  }
  
  return data
    .map((item: any) => ({
      avatar_id: Number(item.avatar_id ?? item.id ?? 0),
      url: item.url_path || item.url || item.avatar_url || item.avatar || item.image || '',
    }))
    .filter((avatar: Avatar) => avatar.url);
}

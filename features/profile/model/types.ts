/**
 * Profile Feature Types
 */

export interface Profile {
  profile_id: string;
  profile_name: string;
  avatar: string;
  avatar_id?: number;
  age?: string;
  gender?: string;
  is_kid: boolean;
}

export interface Avatar {
  avatar_id: number;
  url: string;
}

export interface ProfilesResponse {
  profiles: Profile[];
  selected_profile?: Profile | null;
}

export interface CreateProfileRequest {
  profile_name: string;
  avatar?: string;
  avatar_url?: string;
  avatar_id?: number;
  is_kid?: boolean;
  age?: string; // For registration flow
  gender?: string; // For registration flow
}

export interface CreateProfileResponse {
  profile_id: string;
  profile_name: string;
  avatar?: string;
  is_kid?: boolean;
}

export interface UpdateProfileRequest {
  profile_id: string;
  profile_name?: string;
  avatar?: string;
  avatar_url?: string;
  avatar_id?: number;
  age?: string;
  gender?: string;
  is_kid?: boolean;
}

export interface ApiResponse<T> {
  metaData?: {
    status: number;
    message: string;
  };
  data: T;
}

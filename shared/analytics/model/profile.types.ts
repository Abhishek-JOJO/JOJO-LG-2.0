/**
 * Profile Event Types
 * 
 * User profile management event definitions
 */

export interface ProfileCreatedEvent {
  profile_id: string;
  profile_name: string;
  is_kid: boolean;
  avatar?: string;
}

export interface ProfileSelectedEvent {
  profile_id: string;
  profile_name: string;
  is_kid: boolean;
  selection_method: 'manual' | 'auto';
}

export interface ProfileUpdatedEvent {
  profile_id: string;
  profile_name: string;
  is_kid: boolean;
}

export interface ProfileDeletedEvent {
  profile_id: string;
}

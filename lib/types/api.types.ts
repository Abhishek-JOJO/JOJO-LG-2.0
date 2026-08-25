/**
 * Shared API Types
 * Used across all features for consistent API response handling
 */

export interface ApiResponse<T> {
  metaData?: {
    status?: number;
    message?: string;
  };
  data: T | null;
}

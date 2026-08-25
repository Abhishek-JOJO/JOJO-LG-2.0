/**
 * Error Mapper - Centralized error type mapping
 * 
 * Maps AppError instances to ErrorKey enum values for UI display
 * Provides consistent error categorization across the app
 */

import { ErrorKey } from "@/enums/ui.enum";
import { AppError } from "./types";
import { HttpStatus } from "@enums/http.enum";
import { logger } from "@lib/logger/logger";

/**
 * Map error to ErrorKey for UI display
 * 
 * @param error - The error to map
 * @param context - Optional context for logging
 * @returns ErrorKey enum value
 */
export function mapErrorToKey(error: unknown, context?: string): ErrorKey {
  const logContext = context ? [`${context}`] : '';
  
  // Handle AppError instances
  if (error instanceof AppError) {
    logger.debug(`${logContext} Mapping AppError`, { 
      status: error.status, 
      message: error.message 
    });
    
    switch (error.status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorKey.ERR_INVALID;
        
      case HttpStatus.UNAUTHORIZED:
        return ErrorKey.USER_NOT_FOUND;
        
      case HttpStatus.NOT_FOUND:
        return ErrorKey.USER_NOT_FOUND;
        
      case HttpStatus.CONFLICT:
        return ErrorKey.USER_ALREADY_EXISTS;
        
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorKey.ERR_TOO_MANY_REQUESTS;
        
      case HttpStatus.INTERNAL_SERVER_ERROR:
      case HttpStatus.BAD_GATEWAY:
      case HttpStatus.SERVICE_UNAVAILABLE:
        return ErrorKey.SERVER_ERROR;
        
      default:
        logger.warn(`${logContext} Unmapped HTTP status`, { status: error.status });
        return ErrorKey.UNKNOWN_ERROR;
    }
  }
  
  // Handle standard Error instances
  if (error instanceof Error) {
    logger.debug(`${logContext} Mapping standard Error`, { 
      name: error.name, 
      message: error.message 
    });
    
    // Network errors (fetch failures)
    if (error.name === 'TypeError' || error.message.includes('fetch')) {
      return ErrorKey.NETWORK_ERROR;
    }
    
    // Timeout errors
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return ErrorKey.TIMEOUT_ERROR;
    }
    
    return ErrorKey.UNKNOWN_ERROR;
  }
  
  // Handle unknown error types
  logger.warn(`${logContext} Unknown error type`, { error });
  return ErrorKey.UNKNOWN_ERROR;
}

/**
 * Map API error to ErrorKey (alias for mapErrorToKey)
 * Specifically for API-layer errors
 * 
 * @param error - The API error to map
 * @param context - Optional context for logging
 * @returns ErrorKey enum value
 */
export function mapApiError(error: unknown, context?: string): ErrorKey {
  const apiContext = context ? `API:${context}` : 'API';
  return mapErrorToKey(error, apiContext);
}

/**
 * Get user-friendly error message from error
 * 
 * @param error - The error to extract message from
 * @returns User-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }
  
  return 'An unexpected error occurred';
}
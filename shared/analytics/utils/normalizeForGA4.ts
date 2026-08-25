/**
 * Firebase GA4 Payload Normalizer
 * 
 * Ensures payloads comply with GA4 restrictions:
 * - snake_case event names
 * - Max 40 chars for event names
 * - Max 40 chars for param names
 * - Max 100 chars for param values
 * - Max 25 params per event
 */

import { GA4_LIMITS } from '../constants/analytics.constants';

/**
 * Convert camelCase to snake_case
 */
function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

/**
 * Truncate string to max length
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength);
}

/**
 * Normalize event name for GA4
 */
export function normalizeEventName(name: string): string {
  const snakeCase = toSnakeCase(name);
  return truncate(snakeCase, GA4_LIMITS.MAX_EVENT_NAME_LENGTH);
}

/**
 * Normalize event parameters for GA4
 */
export function normalizeEventParams(
  params: Record<string, any>
): Record<string, any> {
  const normalized: Record<string, any> = {};
  let paramCount = 0;
  
  for (const [key, value] of Object.entries(params)) {
    // Stop if we've reached max params
    if (paramCount >= GA4_LIMITS.MAX_PARAMS_PER_EVENT) {
      break;
    }
    
    // Normalize key
    const normalizedKey = truncate(
      toSnakeCase(key),
      GA4_LIMITS.MAX_PARAM_NAME_LENGTH
    );
    
    // Normalize value
    let normalizedValue = value;
    
    if (typeof value === 'string') {
      normalizedValue = truncate(value, GA4_LIMITS.MAX_PARAM_VALUE_LENGTH);
    } else if (typeof value === 'object' && value !== null) {
      // Convert objects to JSON string and truncate
      normalizedValue = truncate(
        JSON.stringify(value),
        GA4_LIMITS.MAX_PARAM_VALUE_LENGTH
      );
    } else if (typeof value === 'boolean') {
      // Convert boolean to string
      normalizedValue = value ? 'true' : 'false';
    }
    // Numbers are kept as-is
    
    normalized[normalizedKey] = normalizedValue;
    paramCount++;
  }
  
  return normalized;
}

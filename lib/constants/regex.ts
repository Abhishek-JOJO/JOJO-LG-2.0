/**
 * Centralized regex patterns
 * Single source of truth for all validation patterns
 */
export const REGEX = {
  // Email validation — strict RFC-5321 subset
  // Local part: alphanumerics + . _ % + - (no consecutive dots, no leading/trailing dot)
  // Domain: alphanumerics + hyphens, at least one dot, TLD 2-63 chars
  EMAIL: /^[a-zA-Z0-9](?:[a-zA-Z0-9._%+\-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9\-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9\-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,63}$/,

  // Phone validation (strict - 10-15 digits after cleaning)
  PHONE: /^\+?[1-9]\d{6,14}$/,

  // Phone format detection (allows spaces, dashes, parentheses)
  PHONE_FORMAT: /^\+?\d[\d\s\-()]*$/,

  // Detect if input starts with a digit
  STARTS_WITH_DIGIT: /^[0-9]/,

  // OTP validation (4-6 digits)
  OTP: /^\d{4}$/,

  // Non-digit characters (for cleanup)
  NON_DIGIT: /\D/g,

  // URL validation
  URL: /^https?:\/\/.+/,
  PHONE_NUMBER_REGEX: /^\+?\d[\d\s\-()]*$/,
  PHONE_FORMATTING_CHARS_REGEX: /[\s\-()]/g,
  IS_EMAIL_INPUT: /[^0-9\s+\-()]/,
  ALLOW_LOGIN_KEY: /^[a-zA-Z0-9@._+-]$/,
  SENITIZE_LOGIN_INPUT: /[^a-zA-Z0-9@._+-]/g,
  CONTACT_NUMBER_REGEX: /^[\d\s()+-]+$/,

  // Name validation - only letters and spaces (supports international characters)
  // Allows: Letters (any language), spaces, hyphens, apostrophes
  // Blocks: Numbers, special characters (!@#$%^&*()_+={}[]|\\:;"<>,.?/)
  NAME: /^[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF\s'-]+$/,

  // Special characters detection (for error messages)
  SPECIAL_CHARS: /[!@#$%^&*()_+={}[\]|\\:;"<>,.?/0-9]/,
  LEADING_DIGIT_REGEX: /^\d/,
  NON_ALPHANUMERIC_REGEX: /[^a-z0-9]+/g,
  TRIM_HYPHENS_REGEX: /^-+|-+$/g,
  COUNTRY_CODE_REGEX: /^[A-Z]{2}$/
} as const;

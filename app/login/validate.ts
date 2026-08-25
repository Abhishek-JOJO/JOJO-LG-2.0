import { ErrorKey } from "@/enums/ui.enum";
import { REGEX } from "@/lib/constants/regex";

export function validate(value: string): ErrorKey | null {
  const v = value.trim();

  if (!v) return ErrorKey.REQUIRED;

  if (REGEX.PHONE_NUMBER_REGEX.test(v)) {
    const digits = v.replace(REGEX.PHONE_FORMATTING_CHARS_REGEX, "");
    return REGEX.PHONE.test(digits) ? null : ErrorKey.INVALID_PHONE;
  }

  return REGEX.EMAIL.test(v) ? null : ErrorKey.INVALID_EMAIL;
}

export function getErrorMessage(
  key: ErrorKey,
  t: (k: ErrorKey) => string
): string {
  return t(key);
}

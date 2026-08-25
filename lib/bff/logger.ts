const SENSITIVE_KEYS = ["otp", "password", "token", "sessionid", "secret", "cvv", "authorization"];

function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);

  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k))) {
      clean[key] = "[REDACTED]";
    } else if (typeof val === "object" && val !== null) {
      clean[key] = sanitizeObject(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

export const bffStructuredLogger = {
  info(message: string, context: Record<string, any> = {}) {
    const logData = {
      timestamp: new Date().toISOString(),
      level: "INFO",
      message,
      ...sanitizeObject(context),
    };
    console.log(JSON.stringify(logData));
  },

  error(message: string, context: Record<string, any> = {}) {
    const logData = {
      timestamp: new Date().toISOString(),
      level: "ERROR",
      message,
      ...sanitizeObject(context),
    };
    console.error(JSON.stringify(logData));
  },

  warn(message: string, context: Record<string, any> = {}) {
    const logData = {
      timestamp: new Date().toISOString(),
      level: "WARN",
      message,
      ...sanitizeObject(context),
    };
    console.warn(JSON.stringify(logData));
  },
};

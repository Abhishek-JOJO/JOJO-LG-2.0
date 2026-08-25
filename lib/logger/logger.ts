/* eslint-disable no-console */
import { appConfig } from "../config/app.config";

type LogLevel = "info" | "warn" | "error" | "debug";

const isProduction = process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_APP_ENV === 'prod';

function log(level: LogLevel, message: string, meta?: unknown) {
  if (!appConfig.flags.enableLogger) return;

  // Silence debug and info logs in production environments
  if (isProduction && (level === "info" || level === "debug")) {
    return;
  }

  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  switch (level) {
    case "info":
      console.info(prefix, message, meta ?? "");
      break;
    case "warn":
      console.warn(prefix, message, meta ?? "");
      break;
    case "error":
      console.error(prefix, message, meta ?? "");
      break;
    case "debug":
      console.debug(prefix, message, meta ?? "");
      break;
  }
}

export const logger = {
  info: (msg: string, meta?: unknown) => log("info", msg, meta),
  warn: (msg: string, meta?: unknown) => log("warn", msg, meta),
  error: (msg: string, meta?: unknown) => log("error", msg, meta),
  debug: (msg: string, meta?: unknown) => log("debug", msg, meta),
};

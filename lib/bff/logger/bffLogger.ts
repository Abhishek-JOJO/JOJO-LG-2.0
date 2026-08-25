import { logger } from "@lib/logger/logger";

export interface LogContext {
  requestId?: string;
  userId?: string;
  url?: string;
  method?: string;
  durationMs?: number;
  statusCode?: number;
  platform?: string;
  ip?: string;
  [key: string]: unknown;
}

export const bffLogger = {
  info: (message: string, context?: LogContext) => {
    logger.info(`[BFF] ${message}`, context);
  },
  warn: (message: string, context?: LogContext) => {
    logger.warn(`[BFF] ${message}`, context);
  },
  error: (message: string, context?: LogContext) => {
    logger.error(`[BFF] ${message}`, context);
  },
  debug: (message: string, context?: LogContext) => {
    logger.debug(`[BFF] ${message}`, context);
  },
};

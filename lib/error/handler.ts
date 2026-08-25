import { AppError } from "./types";
import { HttpStatus } from "@enums/http.enum";
import { logger } from "@lib/logger/logger";

export function handleError(error: unknown): string {
  if (error instanceof AppError) {
    logger.error(`[${error.name}] ${error.message}`, { status: error.status });

    switch (error.status) {
      case HttpStatus.UNAUTHORIZED:
        return "Session expired. Please sign in again.";
      case HttpStatus.NOT_FOUND:
        return "The requested resource was not found.";
      case HttpStatus.TOO_MANY_REQUESTS:
        return "Too many requests. Please slow down.";
      case HttpStatus.INTERNAL_SERVER_ERROR:
      default:
        return "Something went wrong. Please try again.";
    }
  }

  if (error instanceof Error) {
    logger.error("[UnhandledError]", { message: error.message });
    return error.message || "An error occurred.";
  }

  // Handle non-Error objects
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = String((error as any).message || "An error occurred.");
    logger.error("[UnhandledError]", { message: msg });
    return msg;
  }

  logger.error("[UnhandledError]", { error });
  return "An unexpected error occurred.";
}

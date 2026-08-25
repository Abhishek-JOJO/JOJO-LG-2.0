import { HttpStatus } from "@enums/http.enum";

export class AppError extends Error {
  public readonly status: HttpStatus;

  constructor(message: string, status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR) {
    super(message);
    this.name = "AppError";
    this.status = status;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NetworkError extends AppError {
  constructor(message = "Network error. Please check your connection.") {
    super(message, HttpStatus.SERVICE_UNAVAILABLE);
    this.name = "NetworkError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "You are not authorized. Please sign in.") {
    super(message, HttpStatus.UNAUTHORIZED);
    this.name = "UnauthorizedError";
  }
}

export interface StandardApiErrorResponse {
  metaData: {
    status: number;
    message: string;
  };
  data: null;
}

export function formatBffError(status = 500, message = "Internal Server Error"): StandardApiErrorResponse {
  return {
    metaData: {
      status,
      message,
    },
    data: null,
  };
}

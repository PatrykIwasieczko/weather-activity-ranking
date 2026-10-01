export type OpenMeteoErrorKind =
  | "http"
  | "timeout"
  | "invalid_response"
  | "provider";

export class OpenMeteoError extends Error {
  readonly kind: OpenMeteoErrorKind;
  readonly status?: number;

  constructor(
    message: string,
    kind: OpenMeteoErrorKind,
    options?: { status?: number; cause?: unknown },
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "OpenMeteoError";
    this.kind = kind;
    this.status = options?.status;
  }
}

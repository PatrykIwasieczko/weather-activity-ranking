import { OpenMeteoError } from "./errors.js";

export type HttpGet = (
  url: string | URL,
  init?: RequestInit,
) => Promise<Response>;

export const defaultHttpGet: HttpGet = (url, init) => fetch(url, init);

const DEFAULT_TIMEOUT_MS = 10_000;

export type OpenMeteoRequestOptions = {
  httpGet?: HttpGet;
  timeoutMs?: number;
};

function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === "TimeoutError" ||
    error.name === "AbortError" ||
    ("code" in error && error.code === "ABORT_ERR")
  );
}

export async function requestOpenMeteoJson(
  url: URL,
  options: OpenMeteoRequestOptions = {},
): Promise<unknown> {
  const httpGet = options.httpGet ?? defaultHttpGet;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let response: Response;

  try {
    response = await httpGet(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        accept: "application/json",
      },
    });
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new OpenMeteoError(
        `Open-Meteo request timed out after ${timeoutMs}ms`,
        "timeout",
        { cause: error },
      );
    }

    throw new OpenMeteoError("Open-Meteo request failed", "http", {
      cause: error,
    });
  }

  let body: unknown;

  try {
    body = await response.json();
  } catch (error) {
    throw new OpenMeteoError(
      `Open-Meteo returned non-JSON response (HTTP ${response.status})`,
      "invalid_response",
      { status: response.status, cause: error },
    );
  }

  if (!response.ok) {
    const reason = readProviderReason(body);
    throw new OpenMeteoError(
      reason ?? `Open-Meteo request failed with HTTP ${response.status}`,
      response.status >= 400 && response.status < 500 ? "provider" : "http",
      { status: response.status },
    );
  }

  return body;
}

function readProviderReason(body: unknown): string | undefined {
  if (
    typeof body === "object" &&
    body !== null &&
    "reason" in body &&
    typeof body.reason === "string"
  ) {
    return body.reason;
  }

  return undefined;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === "number");
}

export function isNullableNumberArray(
  value: unknown,
): value is Array<number | null> {
  return (
    Array.isArray(value) &&
    value.every((item) => item === null || typeof item === "number")
  );
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function requireFiniteNumber(
  value: unknown,
  fieldName: string,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new OpenMeteoError(
      `Open-Meteo response missing valid number for ${fieldName}`,
      "invalid_response",
    );
  }

  return value;
}

export function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new OpenMeteoError(
      `Open-Meteo response missing valid string for ${fieldName}`,
      "invalid_response",
    );
  }

  return value;
}

import { expect } from "vitest";
import { OpenMeteoError, type HttpGet } from "../../../src/weather/open-meteo/index.js";

export function jsonResponse(
  body: unknown,
  init: { status?: number } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      "content-type": "application/json",
    },
  });
}

export function createMockHttpGet(
  handler: (url: URL, init?: RequestInit) => Promise<Response> | Response,
): HttpGet {
  return async (url, init) => handler(new URL(String(url)), init);
}

export async function expectOpenMeteoError(
  promise: Promise<unknown>,
  expected: {
    kind: OpenMeteoError["kind"];
    status?: number;
    messageIncludes?: string;
  },
): Promise<OpenMeteoError> {
  let caught: unknown;

  try {
    await promise;
  } catch (error) {
    caught = error;
  }

  expect(caught).toBeInstanceOf(OpenMeteoError);
  const openMeteoError = caught as OpenMeteoError;
  expect(openMeteoError.kind).toBe(expected.kind);

  if (expected.status !== undefined) {
    expect(openMeteoError.status).toBe(expected.status);
  }

  if (expected.messageIncludes !== undefined) {
    expect(openMeteoError.message).toContain(expected.messageIncludes);
  }

  return openMeteoError;
}

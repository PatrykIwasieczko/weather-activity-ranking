export class AppError extends Error {
  readonly code: string;

  constructor(message: string, code: string, options?: { cause?: unknown }) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "AppError";
    this.code = code;
  }
}

export class CityNotFoundError extends AppError {
  constructor(cityName: string) {
    super(`No city found for "${cityName}"`, "CITY_NOT_FOUND");
    this.name = "CityNotFoundError";
  }
}

export class ExternalProviderError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, "EXTERNAL_PROVIDER_ERROR", options);
    this.name = "ExternalProviderError";
  }
}

/**
 * Standard HTTP status codes as constants for improved type safety and readability.
 *
 * Provides commonly used HTTP status codes organized by category for consistent
 * usage throughout applications.
 *
 * @example
 * ```ts
 * import { HTTP_STATUS_CODES } from './codes';
 * response.status(HTTP_STATUS_CODES.OK);
 * if (error.status === HTTP_STATUS_CODES.NOT_FOUND) {
 *   // handle not found
 * }
 * ```
 */
export enum HTTP_STATUS_CODES {
  // 1xx Informational
  CONTINUE = 100,
  SWITCHING_PROTOCOLS = 101,
  PROCESSING = 102,
  EARLY_HINTS = 103,
  // 2xx Success
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NON_AUTHORITATIVE_INFORMATION = 203,
  NO_CONTENT = 204,
  RESET_CONTENT = 205,
  PARTIAL_CONTENT = 206,
  MULTI_STATUS = 207,
  ALREADY_REPORTED = 208,
  IM_USED = 226,
  // 3xx Redirection
  MULTIPLE_CHOICES = 300,
  MOVED_PERMANENTLY = 301,
  FOUND = 302,
  SEE_OTHER = 303,
  NOT_MODIFIED = 304,
  USE_PROXY = 305,
  TEMPORARY_REDIRECT = 307,
  PERMANENT_REDIRECT = 308,
  // 4xx Client Error
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  PAYMENT_REQUIRED = 402,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  NOT_ACCEPTABLE = 406,
  PROXY_AUTHENTICATION_REQUIRED = 407,
  REQUEST_TIMEOUT = 408,
  CONFLICT = 409,
  GONE = 410,
  LENGTH_REQUIRED = 411,
  PRECONDITION_FAILED = 412,
  PAYLOAD_TOO_LARGE = 413,
  URI_TOO_LONG = 414,
  UNSUPPORTED_MEDIA_TYPE = 415,
  RANGE_NOT_SATISFIABLE = 416,
  EXPECTATION_FAILED = 417,
  IM_A_TEAPOT = 418,
  MISDIRECTED_REQUEST = 421,
  UNPROCESSABLE_ENTITY = 422,
  LOCKED = 423,
  FAILED_DEPENDENCY = 424,
  TOO_EARLY = 425,
  UPGRADE_REQUIRED = 426,
  PRECONDITION_REQUIRED = 428,
  TOO_MANY_REQUESTS = 429,
  REQUEST_HEADER_FIELDS_TOO_LARGE = 431,
  UNAVAILABLE_FOR_LEGAL_REASONS = 451,
  // 5xx Server Error
  INTERNAL_SERVER_ERROR = 500,
  NOT_IMPLEMENTED = 501,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
  HTTP_VERSION_NOT_SUPPORTED = 505,
  VARIANT_ALSO_NEGOTIATES = 506,
  INSUFFICIENT_STORAGE = 507,
  LOOP_DETECTED = 508,
  NOT_EXTENDED = 510,
  NETWORK_AUTHENTICATION_REQUIRED = 511,
}

/**
 * A type that represents a supported HTTP status code key.
 */
export type HTTPStatusCode = keyof typeof HTTP_STATUS_CODES;

/**
 * Maps a numeric HTTP status code to its corresponding enum key using
 * Object.keys() + runtime filtering + type narrowing to ensure type safety.
 *
 * @param status - The numeric HTTP status code to map.
 *
 * @returns The corresponding enum key (e.g. "NOT_FOUND").
 *
 * @throws If the status code is not recognized.
 *
 * @example
 * ```ts
 * console.log(getCodeByStatus(404)); // "NOT_FOUND"
 * ```
 */
export const getCodeByStatus = (status: number): HTTPStatusCode => {
  for (const key of Object.keys(HTTP_STATUS_CODES)) {
    // Skip reverse numeric keys
    if (!isNaN(Number(key))) continue;

    const code = key as HTTPStatusCode;
    if (HTTP_STATUS_CODES[code] === status) {
      return code;
    }
  }

  throw new Error(
    `Could not map status code ${status} to a supported HTTP status code`
  );
};

/**
 * Maps an enum key (e.g. "NOT_FOUND") to its numeric HTTP status code.
 *
 * @param code - The enum key to look up.
 *
 * @returns The numeric HTTP status code.
 *
 * @throws If the code is not valid.
 *
 * @example
 * ```ts
 * console.log(getStatusByCode("NOT_FOUND")); // 404
 * ```
 */
export const getStatusByCode = (code: HTTPStatusCode): number => {
  const status = HTTP_STATUS_CODES[code];
  if (typeof status !== "number") {
    throw new Error(`Invalid HTTP status code key: "${code}"`);
  }
  return status;
};

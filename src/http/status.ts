/**
 * Represents the semantic category of an HTTP status code.
 */
export type HTTPStatusCategory = "informational" | "successful" | "redirection" | "clientError" | "serverError";

/**
 * Defines inclusive numeric ranges for standard HTTP status code categories.
 * Each category maps to a tuple [min, max] representing the range of codes.
 */
export const HTTP_STATUS_RANGES: {
  category: HTTPStatusCategory;
  min: number;
  max: number;
  result: boolean;
}[] = [
  { category: "informational", min: 100, max: 199, result: true },
  { category: "successful", min: 200, max: 299, result: true },
  { category: "redirection", min: 300, max: 399, result: true },
  { category: "clientError", min: 400, max: 499, result: false },
  { category: "serverError", min: 500, max: 599, result: false }
] as const;

/**
 * Semantic result classification for HTTP status codes.
 *
 * These methods determine whether a status code is considered a success or failure.
 *
 * @example
 * ```ts
 * HTTP_STATUS_RESULT.success(204); // true
 * HTTP_STATUS_RESULT.failure(404); // true
 * ```
 */
export const HTTP_STATUS_RESULT = {
  success: (status: number): boolean => status >= 100 && status <= 299,
  failure: (status: number): boolean => status >= 300 && status <= 599
} as const;

/**
 * Represents the result classification of an HTTP status code.
 */
export type HTTPStatusResult = keyof typeof HTTP_STATUS_RESULT;

/**
 * Full classification of an HTTP status code, including its category and result.
 */
export interface HTTPStatusClassification {
  category: HTTPStatusCategory;
  result: boolean;
}

/**
 * Classifies an HTTP status code into its semantic category and result.
 *
 * @param status - Numeric HTTP status code (e.g. 200, 404).
 * @returns An object containing the category and result classification.
 *
 * @throws {RangeError} If the status code is outside the known HTTP ranges.
 *
 * @example
 * ```ts
 * const classification = getHTTPStatusClassification(404);
 * console.log(classification.category); // "clientError"
 * console.log(classification.result);   // "failure"
 * ```
 */
export function getHTTPStatusClassification(status: number): HTTPStatusClassification {
  for (const range of HTTP_STATUS_RANGES) {
    if (status >= range.min && status <= range.max) {
      return {
        category: range.category,
        result: range.result
      };
    }
  }

  /**
   * This should never happen due to range validation above so we should
   * let the caller know that the status code is not recognized by
   * throwing an error.
   */
  throw new RangeError(`unable to classify HTTP status code "${status}": must be between 100 and 599`);
}

/**
 * Represents the semantic category of an HTTP status code.
 */
export type HTTPStatusCategory =
  | "informational"
  | "successful"
  | "redirection"
  | "clientError"
  | "serverError";

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
  { category: "serverError", min: 500, max: 599, result: false },
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
  failure: (status: number): boolean => status >= 300 && status <= 599,
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
export const getHTTPStatusClassification = (
  status: number
): HTTPStatusClassification => {
  for (const range of HTTP_STATUS_RANGES) {
    if (status >= range.min && status <= range.max) {
      return {
        category: range.category,
        result: range.result,
      };
    }
  }

  /**
   * This should never happen due to range validation above so we should
   * let the caller know that the status code is not recognized by
   * throwing an error.
   */
  throw new RangeError(
    `unable to classify HTTP status code "${status}": must be between 100 and 599`
  );
};

/**
 * A class that represents a collection of HTTP status code buckets.
 *
 * @example
 * ```ts
 * const buckets = new HTTPStatusBuckets(makeHTTPStatusBuckets());
 * buckets.inc(200);
 * ```
 */
export class HTTPStatusBuckets {
  readonly #buckets: Record<HTTPStatusCategory, number>;

  constructor() {
    this.#buckets = HTTP_STATUS_RANGES.reduce((acc, range) => {
      acc[range.category] = 0;
      return acc;
    }, {} as Record<HTTPStatusCategory, number>);
  }

  /**
   * Gets the value of a specific status code in a specific bucket.
   *
   * @param category - The category of the bucket.
   *
   * @returns The value of the status code in the bucket.
   *
   * @example
   * ```ts
   * const buckets = new HTTPStatusBuckets();
   * buckets.get("informational"); // 0
   * ```
   */
  get(category: HTTPStatusCategory): number {
    return this.#buckets[category];
  }

  /**
   * Gets the value of a specific status code in a specific bucket.
   *
   * @param status - The status code to get the value of.
   *
   * @returns The value of the status code in the bucket.
   *
   * @example
   * ```ts
   * const buckets = new HTTPStatusBuckets();
   * buckets.status(200); // 0
   * ```
   */
  status(status: number): number {
    return this.#buckets[getHTTPStatusClassification(status).category];
  }

  /**
   * Gets all the buckets.
   *
   * @returns A record mapping each HTTP status category to an array of status codes.
   *
   * @example
   * ```ts
   * const buckets = new HTTPStatusBuckets();
   * buckets.all(); // { informational: 0, successful: 0, redirection: 0, clientError: 0, serverError: 0 }
   * ```
   */
  all(): Record<HTTPStatusCategory, number> {
    return this.#buckets;
  }

  /**
   * Sets the value of a specific status code in a specific bucket.
   *
   * @param status - The status code to set the value of.
   * @param value - The value to set the status code to.
   *
   * @returns The before and after values of the status code in the bucket.
   *
   * @example
   * ```ts
   * const buckets = new HTTPStatusBuckets();
   * buckets.set(200, 1); // { before: 0, after: 1 }
   * ```
   */
  set(
    status: number,
    value: number
  ): {
    before: number;
    after: number;
  } {
    const classification = getHTTPStatusClassification(status);
    const before = this.#buckets[classification.category];
    this.#buckets[classification.category] = value;
    return {
      before,
      after: value,
    };
  }

  /**
   * Increments the value of a specific status code in a specific bucket.
   *
   * @param status - The status code to increment the value of.
   * @param count - The amount to increment the value by.
   *
   * @returns The new value of the status code in the bucket.
   *
   * @example
   * ```ts
   * const buckets = new HTTPStatusBuckets();
   * buckets.inc(200); // { before: 0, after: 1 }
   * ```
   */
  inc(
    status: number,
    count = 1
  ): {
    before: number;
    after: number;
  } {
    const classification = getHTTPStatusClassification(status);
    const bucket = this.#buckets[classification.category];
    const value = bucket + count;
    this.#buckets[classification.category] = value;
    return {
      before: bucket,
      after: value,
    };
  }

  /**
   * Decrements the value of a specific status code in a specific bucket.
   *
   * @param status - The status code to decrement the value of.
   * @param count - The amount to decrement the value by.
   *
   * @returns The new value of the status code in the bucket.
   *
   * @example
   * ```ts
   * const buckets = new HTTPStatusBuckets();
   * buckets.dec(200); // { before: 1, after: 0 }
   * ```
   */
  dec(
    status: number,
    count = 1
  ): {
    before: number;
    after: number;
  } {
    const classification = getHTTPStatusClassification(status);
    const bucket = this.#buckets[classification.category];
    const value = bucket - count;
    this.#buckets[classification.category] = value;
    return {
      before: bucket,
      after: value,
    };
  }
}

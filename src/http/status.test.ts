import { describe, expect, it } from "vitest";
import {
  getHTTPStatusClassification,
  HTTP_STATUS_RESULT,
  HTTPStatusBuckets,
  HTTPStatusCategory,
} from "./status";

describe("getHTTPStatusClassification", () => {
  const validTestCases: [
    number,
    { category: HTTPStatusCategory; result: boolean }
  ][] = [
    [100, { category: "informational", result: true }],
    [199, { category: "informational", result: true }],
    [200, { category: "successful", result: true }],
    [299, { category: "successful", result: true }],
    [300, { category: "redirection", result: true }],
    [399, { category: "redirection", result: true }],
    [400, { category: "clientError", result: false }],
    [499, { category: "clientError", result: false }],
    [500, { category: "serverError", result: false }],
    [599, { category: "serverError", result: false }],
  ];

  it.each(validTestCases)("classifies status %i as %o", (status, expected) => {
    expect(getHTTPStatusClassification(status)).toEqual(expected);
  });

  const invalidTestCases = [99, 600, -1, 1000];
  it.each(invalidTestCases)(
    "throws RangeError for invalid status %i",
    (status) => {
      expect(() => getHTTPStatusClassification(status)).toThrow(RangeError);
    }
  );
});

describe("HTTP_STATUS_RESULT", () => {
  describe("success", () => {
    const successTestCases: [number, boolean][] = [
      [100, true],
      [200, true],
      [299, true],
      [300, false],
      [400, false],
      [500, false],
      [599, false],
      [99, false],
      [600, false],
    ];
    it.each(successTestCases)(
      "returns %s for status %i",
      (status, expected) => {
        expect(HTTP_STATUS_RESULT.success(status)).toBe(expected);
      }
    );
  });

  describe("failure", () => {
    const failureTestCases: [number, boolean][] = [
      [100, false],
      [200, false],
      [299, false],
      [300, true],
      [400, true],
      [500, true],
      [599, true],
      [99, false],
      [600, false],
    ];
    it.each(failureTestCases)(
      "returns %s for status %i",
      (status, expected) => {
        expect(HTTP_STATUS_RESULT.failure(status)).toBe(expected);
      }
    );
  });
});

describe("HTTPStatusBuckets", () => {
  it("initializes all buckets to 0", () => {
    const buckets = new HTTPStatusBuckets();
    expect(buckets.all()).toEqual({
      informational: 0,
      successful: 0,
      redirection: 0,
      clientError: 0,
      serverError: 0,
    });
  });

  it("get returns the value for a category", () => {
    const buckets = new HTTPStatusBuckets();
    expect(buckets.get("informational")).toBe(0);
    expect(buckets.get("successful")).toBe(0);
    expect(buckets.get("redirection")).toBe(0);
    expect(buckets.get("clientError")).toBe(0);
    expect(buckets.get("serverError")).toBe(0);
  });

  it("status returns the value for the category of the status", () => {
    const buckets = new HTTPStatusBuckets();
    expect(buckets.status(100)).toBe(0);
    expect(buckets.status(200)).toBe(0);
    expect(buckets.status(300)).toBe(0);
    expect(buckets.status(400)).toBe(0);
    expect(buckets.status(500)).toBe(0);
  });

  it("status throws RangeError for invalid status codes", () => {
    const buckets = new HTTPStatusBuckets();
    expect(() => buckets.status(99)).toThrow(RangeError);
    expect(() => buckets.status(600)).toThrow(RangeError);
  });

  it("set updates the bucket for the category and returns before/after values", () => {
    const buckets = new HTTPStatusBuckets();
    const result1 = buckets.set(200, 5);
    expect(result1).toEqual({ before: 0, after: 5 });
    expect(buckets.get("successful")).toBe(5);

    const result2 = buckets.set(201, 10);
    expect(result2).toEqual({ before: 5, after: 10 });
    expect(buckets.get("successful")).toBe(10);

    const result3 = buckets.set(404, 3);
    expect(result3).toEqual({ before: 0, after: 3 });
    expect(buckets.get("clientError")).toBe(3);

    expect(buckets.get("informational")).toBe(0);
    expect(buckets.get("redirection")).toBe(0);
    expect(buckets.get("serverError")).toBe(0);
  });

  it("inc increments the bucket for the category and returns before/after values", () => {
    const buckets = new HTTPStatusBuckets();
    const result1 = buckets.inc(200);
    expect(result1).toEqual({ before: 0, after: 1 });
    expect(buckets.get("successful")).toBe(1);

    const result2 = buckets.inc(200, 2);
    expect(result2).toEqual({ before: 1, after: 3 });
    expect(buckets.get("successful")).toBe(3);

    const result3 = buckets.inc(201, 1);
    expect(result3).toEqual({ before: 3, after: 4 });
    expect(buckets.get("successful")).toBe(4);

    const result4 = buckets.inc(404);
    expect(result4).toEqual({ before: 0, after: 1 });
    expect(buckets.get("clientError")).toBe(1);

    const result5 = buckets.inc(200, -1);
    expect(result5).toEqual({ before: 4, after: 3 });
    expect(buckets.get("successful")).toBe(3);
  });

  it("dec decrements the bucket for the category and returns before/after values", () => {
    const buckets = new HTTPStatusBuckets();
    buckets.set(200, 5);
    buckets.set(404, 2);

    const result1 = buckets.dec(200);
    expect(result1).toEqual({ before: 5, after: 4 });
    expect(buckets.get("successful")).toBe(4);

    const result2 = buckets.dec(201, 2);
    expect(result2).toEqual({ before: 4, after: 2 });
    expect(buckets.get("successful")).toBe(2);

    const result3 = buckets.dec(404);
    expect(result3).toEqual({ before: 2, after: 1 });
    expect(buckets.get("clientError")).toBe(1);

    const result4 = buckets.dec(200, -1);
    expect(result4).toEqual({ before: 2, after: 3 });
    expect(buckets.get("successful")).toBe(3);

    const result5 = buckets.dec(100);
    expect(result5).toEqual({ before: 0, after: -1 });
    expect(buckets.get("informational")).toBe(-1);
  });

  it("all returns the current state of all buckets", () => {
    const buckets = new HTTPStatusBuckets();
    buckets.inc(100);
    buckets.inc(200, 2);
    buckets.inc(300, 3);
    buckets.inc(400, 4);
    buckets.inc(500, 5);
    expect(buckets.all()).toEqual({
      informational: 1,
      successful: 2,
      redirection: 3,
      clientError: 4,
      serverError: 5,
    });
  });
});

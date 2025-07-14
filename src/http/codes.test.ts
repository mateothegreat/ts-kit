import { describe, it, expect } from "vitest";
import {
  HTTP_STATUS_CODES,
  getCodeByStatus,
  getStatusByCode,
  HTTPStatusCode,
} from "./codes";
import { typedEnumEntries } from "../objects/enums";

describe("typedEnumEntries", () => {
  it("should return all enum entries as key-value pairs", () => {
    for (const [code, status] of typedEnumEntries(HTTP_STATUS_CODES)) {
      expect(typeof status).toBe("number");
      expect(status).toBeGreaterThan(0);
    }
  });

  it("should exclude reverse numeric keys from enum processing", () => {
    // Test that our functions work correctly with TypeScript's reverse mapping
    const statusCode = 200;
    const enumKey = getCodeByStatus(statusCode);

    // Verify the enum has both forward and reverse mappings
    expect(HTTP_STATUS_CODES[enumKey]).toBe(statusCode);
    expect(HTTP_STATUS_CODES[statusCode as any]).toBe(enumKey);

    // But our function should only return the string key, not the numeric key
    expect(typeof enumKey).toBe("string");
    expect(enumKey).toBe("OK");
  });

  it("should handle all status code categories correctly", () => {
    const testCases = [
      { status: 100, expectedKey: "CONTINUE" }, // 1xx
      { status: 200, expectedKey: "OK" }, // 2xx
      { status: 301, expectedKey: "MOVED_PERMANENTLY" }, // 3xx
      { status: 404, expectedKey: "NOT_FOUND" }, // 4xx
      { status: 500, expectedKey: "INTERNAL_SERVER_ERROR" }, // 5xx
    ];

    for (const { status, expectedKey } of testCases) {
      const code = getCodeByStatus(status);
      expect(code).toBe(expectedKey);
      expect(getStatusByCode(code as HTTPStatusCode)).toBe(status);
    }
  });
});

describe("get methods", () => {
  it("should return correct enum key for known status code", () => {
    expect(getCodeByStatus(200)).toBe("OK");
    expect(getCodeByStatus(404)).toBe("NOT_FOUND");
    expect(getCodeByStatus(503)).toBe("SERVICE_UNAVAILABLE");
  });
  it("should throw for unknown status code", () => {
    expect(() => getCodeByStatus(999)).toThrow("Could not map status code 999");
    expect(() => getCodeByStatus(-1)).toThrow("Could not map status code -1");
    expect(() => getCodeByStatus(NaN)).toThrow();
  });
  it("should return correct numeric code for known enum key", () => {
    expect(getStatusByCode("OK")).toBe(200);
    expect(getStatusByCode("NOT_FOUND")).toBe(404);
    expect(getStatusByCode("SERVICE_UNAVAILABLE")).toBe(503);
  });
  it("should only return valid enum keys from getCodeByStatus", () => {
    const knownStatusCodes = [200, 404, 503, 418, 100, 301];
    for (const status of knownStatusCodes) {
      const code = getCodeByStatus(status);
      expect(HTTP_STATUS_CODES[code]).toBe(status);
    }
  });
  it("should throw for invalid enum key", () => {
    expect(() => getStatusByCode("INVALID_CODE" as HTTPStatusCode)).toThrow(
      'Invalid HTTP status code key: "INVALID_CODE"'
    );
  });
});

describe("round-trip consistency", () => {
  it("should map status to code and back", () => {
    const status = 404;
    const code = getCodeByStatus(status);
    const roundTrip = getStatusByCode(code);
    expect(roundTrip).toBe(status);
  });
  it("should map code to status and back", () => {
    const code: HTTPStatusCode = "INTERNAL_SERVER_ERROR";
    const status = getStatusByCode(code);
    const roundTrip = getCodeByStatus(status);
    expect(roundTrip).toBe(code);
  });
});

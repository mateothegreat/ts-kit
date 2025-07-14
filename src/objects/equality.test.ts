import { describe, expect, it } from "vitest";
import { deepEqual, shallowEqual } from "./equality";

describe("shallowEqual", () => {
  it("should return true for deeply equal flat objects", () => {
    expect(shallowEqual({ a: 1, b: "x" }, { b: "x", a: 1 })).toBe(true);
  });

  it("should return false for mismatched keys", () => {
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(shallowEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
  });

  it("should return false for mismatched types", () => {
    expect(shallowEqual({ a: 1 }, { a: "1" })).toBe(false);
  });

  it("should return false for mismatched values", () => {
    expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  it("should handle NaN correctly", () => {
    expect(shallowEqual({ a: NaN }, { a: NaN })).toBe(true);
  });

  it("should handle undefined and null consistently", () => {
    expect(shallowEqual({ a: undefined }, { a: undefined })).toBe(true);
    expect(shallowEqual({ a: null }, { a: null })).toBe(true);
    expect(shallowEqual({ a: undefined }, { a: null })).toBe(false);
  });

  it("should return true for empty objects", () => {
    expect(shallowEqual({}, {})).toBe(true);
  });

  it("should return false for objects with non-enumerable properties", () => {
    const a = {};
    Object.defineProperty(a, "hidden", {
      value: 42,
      enumerable: false,
    });

    const b = { hidden: 42 };
    expect(shallowEqual(a, b)).toBe(false);
  });
});

describe("deepEqual", () => {
  it("compares equal primitives", () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual("x", "x")).toBe(true);
    expect(deepEqual(true, true)).toBe(true);
    expect(deepEqual(NaN, NaN)).toBe(true);
  });

  it("fails on non-equal primitives", () => {
    expect(deepEqual(1, "1")).toBe(false);
    expect(deepEqual(null, undefined)).toBe(false);
  });

  it("compares deeply equal arrays", () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(deepEqual([[1], [2]], [[1], [2]])).toBe(true);
  });

  it("fails on arrays with different structure", () => {
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
    expect(deepEqual([1, { x: 2 }], [1, { x: 3 }])).toBe(false);
  });

  it("compares deeply equal objects", () => {
    const a = { x: { y: 2 }, z: [1, 2] };
    const b = { x: { y: 2 }, z: [1, 2] };
    expect(deepEqual(a, b)).toBe(true);
  });

  it("fails when keys mismatch", () => {
    expect(deepEqual({ a: 1 }, { b: 1 })).toBe(false);
  });

  it("compares Dates by value", () => {
    expect(deepEqual(new Date("2020-01-01"), new Date("2020-01-01"))).toBe(
      true
    );
    expect(deepEqual(new Date("2020-01-01"), new Date("2021-01-01"))).toBe(
      false
    );
  });

  it("compares Maps and Sets", () => {
    expect(deepEqual(new Map([["a", 1]]), new Map([["a", 1]]))).toBe(true);
    expect(deepEqual(new Set([1, 2]), new Set([1, 2]))).toBe(true);
  });

  it("fails on unequal Maps and Sets", () => {
    expect(deepEqual(new Map([["a", 1]]), new Map([["a", 2]]))).toBe(false);
    expect(deepEqual(new Set([1]), new Set([2]))).toBe(false);
  });

  it("compares nested structures", () => {
    const obj1 = { a: [{ b: new Set([1, 2]) }] };
    const obj2 = { a: [{ b: new Set([1, 2]) }] };
    expect(deepEqual(obj1, obj2)).toBe(true);
  });
});

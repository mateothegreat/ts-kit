import { beforeEach, describe, expect, it } from "vitest";
import { Reporter } from "./reporter";

describe("Reporter", () => {
  let reporter: Reporter;

  beforeEach(() => {
    reporter = new Reporter();
  });

  it("should initialize with empty state", () => {
    expect(reporter.snapshot()).toEqual({});
  });

  it("should initialize with predefined state", () => {
    const r = new Reporter({ status: "ready", count: 1 });
    expect(r.snapshot()).toEqual({ status: "ready", count: 1 });
  });

  it("should emit new state when set", () => {
    reporter.set("stage", "idle");
    expect(reporter.snapshot()).toEqual({ stage: "idle" });
  });

  it("should not emit if value is unchanged", () => {
    reporter = new Reporter({ x: 1 });
    reporter.metrics$.subscribe((v) => console.log("v", v));
    reporter.set("x", 1); // identical value
    expect(reporter.snapshot()).toEqual({ x: 1 });
  });

  it("should emit multiple key changes together", () => {
    reporter.apply({ a: 1, b: true, c: "value" });
    expect(reporter.snapshot()).toEqual({ a: 1, b: true, c: "value" });
  });

  it("should support add() for number values", () => {
    reporter.set("requests", 2).add("requests", 3);
    expect(reporter.snapshot()).toEqual({ requests: 5 });
  });

  it("should support sub() for number values", () => {
    reporter.set("errors", 10).sub("errors", 3);
    expect(reporter.snapshot()).toEqual({ errors: 7 });
  });

  it("should throw when add() on non-number", () => {
    reporter.set("status", "ready");
    expect(() => reporter.add("status", 1)).toThrow(
      /key status is not a number/
    );
  });

  it("should handle null, undefined, and object values", () => {
    reporter.apply({
      flag: null,
      meta: undefined,
      payload: { id: 123 },
    });

    expect(reporter.snapshot()).toEqual({
      flag: null,
      meta: undefined,
      payload: { id: 123 },
    });
  });

  it("should support replacing object values shallowly", () => {
    reporter.set("payload", { x: 1 });
    reporter.set("payload", { x: 1 }); // equal
    reporter.set("payload", { x: 2 }); // changed

    expect(reporter.snapshot()).toEqual({ payload: { x: 2 } });
  });

  it("should support toggling booleans", () => {
    reporter.set("flag", false).apply({ flag: true });
    expect(reporter.snapshot().flag).toBe(true);
  });

  it("should not mutate internal state externally", () => {
    const snap = reporter.set("x", 42).snapshot();
    snap.x = 999;
    expect(reporter.snapshot().x).toBe(42);
  });

  it("should emit only on Object.is inequality", () => {
    const spy: any[] = [];
    const obj = { a: 1 };
    reporter.metrics$.subscribe((v) => spy.push(v));
    reporter.set("data", obj);
    reporter.set("data", obj); // same reference

    expect(spy).toHaveLength(1); // no re-emit
  });

  it("should handle NaN correctly", () => {
    const spy: any[] = [];

    reporter.metrics$.subscribe((v) => spy.push(v));
    reporter.set("latency", NaN); // NaN !== NaN → should emit

    expect(spy).toHaveLength(1);
  });

  it("should handle non-existent keys", () => {
    reporter.add("x", 1);
    reporter.set("y", 2);
    expect(reporter.snapshot()).toEqual({ x: 1, y: 2 });
  });

  it("should apply builder pattern correctly", () => {
    reporter.set("x", 1).add("x", 2).sub("x", 1);
    expect(reporter.snapshot().x).toBe(2);
  });
});

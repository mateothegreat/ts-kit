import { describe, expect, it } from "vitest";
import { add, set, sub } from "./operations";
import { Reporter } from "./reporter";

describe("Hybrid Reporter", () => {
  it("can be created with no initial state", () => {
    const r = new Reporter();
    r.apply(set("foo", 10));
    expect(r.snapshot()).toEqual({ foo: 10 });
  });

  it("initializes with initial state", () => {
    const r = new Reporter({ foo: 10, bar: 5, stage: "initial" });
    expect(r.snapshot()).toEqual({
      foo: 10,
      bar: 5,
      stage: "initial",
    });
  });

  it("emits once for combination of add/add/sub on same key", () => {
    const r = new Reporter({ foo: 10, bar: 5, stage: "initial" });
    const events: any[] = [];
    r.metrics$.subscribe((s) => events.push(s));

    // 10 +1 +2 -1 = 12
    r.apply(add("foo", 1), add("foo", 2), sub("foo", 1));

    expect(r.snapshot().foo).toBe(12);
    // initial + 1 batched update
    expect(events).toHaveLength(2);
  });

  it("skips emit if batch net is identity", () => {
    const r = new Reporter({ foo: 10, bar: 5, stage: "initial" });
    const events: any[] = [];
    r.metrics$.subscribe((s) => events.push(s));

    r.apply(
      set("foo", 10), // same
      { bar: 5 }, // same
      sub("bar", 0) // same
    );

    expect(events).toHaveLength(1);
  });

  it("handles NaN as equal (no duplicate emit)", () => {
    const r = new Reporter({ foo: 10, bar: 5, stage: "initial" });
    const events: any[] = [];
    // Pre-apply NaN so subject holds { foo, bar, stage, x: NaN }
    r.apply({ x: NaN });

    r.metrics$.subscribe((s) => events.push(s));

    // Setting x to NaN again → same by Object.is → no new emit
    r.apply({ x: NaN });

    expect(events).toHaveLength(1);
    expect(Number.isNaN(events[0].x)).toBe(true);
  });
});

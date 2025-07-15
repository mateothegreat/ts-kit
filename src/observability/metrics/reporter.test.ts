import { beforeEach, describe, expect, it } from "vitest";
import { add, set, sub } from "./operations";
import { Reporter, type ReporterStateMap } from "./reporter";

describe("reporter", () => {
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
describe("reporter.watch()", () => {
  let r: Reporter;
  beforeEach(() => {
    r = new Reporter({ a: 1, b: 2, c: 3 });
  });

  it("emits only when watched keys change", () => {
    const events: ReporterStateMap[] = [];
    r.watch("a", "c").subscribe((s) => events.push(s));

    // change b: should NOT emit
    r.set("b", 20);
    expect(events).toHaveLength(0);

    // change a: should emit once
    r.set("a", 5);
    expect(events).toHaveLength(1);
    expect(events[0].a).toBe(5);

    // change both a and b and c in one batch: should emit once
    r.apply(
      add("a", 2), // a: 5→7
      set("b", 100), // b: ignored
      set("c", 10) // c: 3→10
    );
    expect(events).toHaveLength(2);
    expect(events[1]).toMatchObject({ a: 7, c: 10 });

    // change c back to same: no emit
    r.set("c", 10);
    expect(events).toHaveLength(2);
  });

  it("includes initial value when using watch", () => {
    const events: ReporterStateMap[] = [];
    r = new Reporter({ x: 42 });
    r.watch("x").subscribe((s) => events.push(s));

    // first emission should be ignored by filter (no actual change)
    expect(events).toHaveLength(0);

    // change x: now we get one
    r.set("x", 100);
    expect(events).toHaveLength(1);
    expect(events[0].x).toBe(100);
  });
});

describe("reporter.extract()", () => {
  let r: Reporter;
  beforeEach(() => {
    r = new Reporter();
  });

  it("extracts keys based on 'any' logic", () => {
    r.apply({ a: 1, b: 2, c: "ok", debug: true });

    const result = r.extract(
      [(s, k) => typeof s[k] === "string", (s, k) => k === "debug"],
      "any"
    );

    expect(result).toEqual({ c: "ok", debug: true });
  });

  it("extracts keys based on 'all' logic", () => {
    r.apply({ a: 1, b: "bad", c: 2 });

    const result = r.extract(
      [(s, k) => typeof s[k] === "number", (s, k) => s[k] !== 1],
      "all"
    );

    expect(result).toEqual({ c: 2 }); // excludes 'a' which is 1
  });
});

describe("reporter.prune()", () => {
  let r: Reporter;
  beforeEach(() => {
    r = new Reporter();
    r.apply(set("foo", 1), set("bar", 2), set("baz", 3), set("qux", 4));
  });

  it("removes keys that any predicate rejects", () => {
    r.prune([(s, k) => k !== "foo", (s, k) => k !== "bar"]);
    expect(r.snapshot()).toEqual({ baz: 3, qux: 4 });
  });

  it("keeps all keys if all predicates pass", () => {
    r.prune([(s, k) => typeof s[k] === "number"]);
    expect(r.snapshot()).toEqual({ foo: 1, bar: 2, baz: 3, qux: 4 });
  });

  it("removes everything if predicates always false", () => {
    r.prune([() => false]);
    expect(r.snapshot()).toEqual({});
  });

  it("emits only when filtered state actually changes", () => {
    const events: any[] = [];
    r.metrics$.subscribe((s) => events.push(s));
    // filtering identical state (no key removed) should not emit
    r.prune([() => true]);
    expect(events).toHaveLength(1);
    // filtering out two keys emits once
    r.prune([(s, k) => k !== "baz" && k !== "qux"]);
    expect(events).toHaveLength(2);
    expect(events[1]).toEqual({ foo: 1, bar: 2 });
  });

  it("supports chaining with apply() and sample()", () => {
    r.apply(set("x", 9), set("y", 8));
    r.prune([(s, k) => k === "x" || k === "baz"]);
    expect(r.snapshot()).toEqual({ baz: 3, x: 9 });
  });
});

describe("reporter.transform()", () => {
  it("keeps only numbers and drops temp_ and debug", () => {
    const r = new Reporter();
    r.apply({
      foo: 1,
      bar: "x",
      temp_id: "abc",
      debug: true,
      status: "ok",
    });
    r.transform({
      keep: [(s, k) => typeof s[k] === "number"],
      drop: [(s, k) => k.startsWith("temp_"), (s, k) => k === "debug"],
    });
    expect(r.snapshot()).toEqual({ foo: 1 });
  });
});

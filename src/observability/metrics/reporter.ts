import { BehaviorSubject, Observable } from "rxjs";
import {
  distinctUntilChanged,
  filter,
  map,
  pairwise,
  startWith,
} from "rxjs/operators";
import { shallowEqual } from "../../objects/shallow-equal";
import { add, sub, type Operation } from "./operations";

/**
 * A value that can be stored in the reporter's state.
 */
export type ReporterValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | object;

/**
 * A map of keys to values that can be stored in the reporter's state.
 */
export interface ReporterStateMap {
  [key: string]: ReporterValue;
}

/**
 * A reporter for managing metrics and observability data or buckets of data
 * where you need to observe changes over time.
 *
 * @example
 * ```ts
 * const reporter = new Reporter();
 * reporter.apply(set("foo", 1), add("foo", 2), sub("foo", 1));
 * console.log(reporter.snapshot()); // { foo: 2 }
 * ```
 */
export class Reporter<T extends Record<string, ReporterValue>> {
  /**
   * The current state of the reporter.
   */
  #state: T;

  /**
   * The subject that emits the current state.
   */
  #subject: BehaviorSubject<T>;

  /**
   * The observable that emits the current state.
   */
  readonly metrics$: Observable<T>;

  /**
   * Create a new reporter.
   *
   * @param initial - The initial state. Defaults to an empty object.
   */
  constructor(initial?: Partial<T>) {
    this.#state = { ...(initial ?? {}) } as T;
    this.#subject = new BehaviorSubject<T>({ ...this.#state });
    this.metrics$ = this.#subject
      .asObservable()
      .pipe(distinctUntilChanged(shallowEqual));
  }

  /**
   * Apply a mix of raw deltas and Operations in one atomic batch.
   * Each Operation sees the **evolving** state from previous ops.
   *
   * @param items - The items to apply.
   *
   * @returns The reporter instance.
   */
  apply(...items: Array<Partial<T> | Operation>): Reporter<T> {
    // Build the next state by applying each item sequentially.
    let next = { ...this.#state };

    for (const item of items) {
      const delta: Partial<Record<string, ReporterValue>> =
        typeof item === "function"
          ? (item as Operation)(next)
          : (item as Partial<T>);
      Object.assign(next, delta);
    }

    // Emit only if anything actually changed.
    if (!shallowEqual(this.#state, next)) {
      this.#state = next as T;
      this.#subject.next({ ...next });
    }

    return this;
  }

  /**
   * Helper method for setting a key to a value from an operation.
   *
   * @param key - The key to set.
   * @param value - The value to set.
   *
   * @returns The reporter instance.
   */
  set(key: string, value: ReporterValue): Reporter<T> {
    return this.apply({ [key]: value } as Partial<T>);
  }

  /**
   * Helper method for adding a number to a key from an operation.
   *
   * @param key - The key to add to.
   * @param amount - The amount to add.
   *
   * @returns The reporter instance.
   */
  add(key: string, amount: number): Reporter<T> {
    return this.apply(add(key, amount));
  }

  /**
   * Helper method for subtracting a number from a key from an operation.
   *
   * @param key - The key to subtract from.
   * @param amount - The amount to subtract.
   *
   * @returns The reporter instance.
   */
  sub(key: string, amount: number): Reporter<T> {
    return this.apply(sub(key, amount));
  }

  /**
   * Helper method for getting a snapshot of the current state.
   *
   * @returns A shallow clone of the current state.
   */
  snapshot(): T {
    return { ...this.#state };
  }

  /**
   * Prunes the reporter's state by one or more predicates.
   *
   * Notes:
   * - Pruning is destructive and idempotent unless a key is actually removed.
   * - Keeps only keys for which *all* predicates return `true`.
   *
   * @param predicates - The predicates to filter by.
   *
   * @example
   * ```ts
   * const reporter = new Reporter();
   * reporter.apply(set("foo", 1), set("bar", 2), set("baz", 3));
   * reporter.prune([
   *   (state, key) => key !== "foo",
   *   (state, key) => key !== "bar",
   * ]);
   * console.log(reporter.snapshot()); // { baz: 3 }
   * ```
   *
   * @returns The reporter instance.
   */
  prune(predicates: Array<(state: T, key: string) => boolean>): Reporter<T> {
    const next: T = {} as T;

    let removed = false;

    for (const key of Object.keys(this.#state)) {
      if (predicates.every((fn) => fn(this.#state, key))) {
        next[key as keyof T] = this.#state[key as keyof T];
      } else {
        removed = true;
      }
    }

    if (removed && !shallowEqual(this.#state, next)) {
      this.#state = next as T;
      this.#subject.next({ ...next });
    }

    return this;
  }

  /**
   * Transforms the reporter's current state using keep and/or drop logic.
   *
   * This is a destructive operation that mutates internal state and emits
   * only if keys are removed. Unlike `filter()` or `sample()`, this method
   * gives you explicit control over which keys to retain or exclude.
   *
   * You may pass either:
   * - `keep`: an array of predicates where at least one must return true
   * - `drop`: an array of predicates where if any return true, the key is removed
   *
   * A key is kept if:
   *  1. It matches at least one `keep` predicate (if provided)
   *  2. AND it does not match any `drop` predicate
   *
   * This allows compound logic for conditional observability pruning.
   *
   * @param options - An object containing `keep` and/or `drop` predicate arrays.
   *
   * @returns The reporter instance.
   *
   * @example
   * ```ts
   * reporter.transform({
   *   keep: [(s, k) => typeof s[k] === "number"],
   *   drop: [(s, k) => k.startsWith("temp_"), (s, k) => k === "debug"]
   * });
   * // Keeps only numeric keys not starting with temp_ or labeled debug.
   * ```
   */
  transform(options: {
    keep?: Array<(state: T, key: string) => boolean>;
  }): Reporter<T> {
    const next: T = { ...this.#state };

    let removed = false;

    for (const key of Object.keys(this.#state)) {
      const passesKeep =
        options.keep === undefined ||
        options.keep.some((fn) => fn(this.#state, key));

      const passesDrop =
        options.keep !== undefined &&
        options.keep.some((fn) => fn(this.#state, key));

      if (passesKeep && !passesDrop) {
        next[key as keyof T] = this.#state[key as keyof T];
      } else {
        removed = true;
      }
    }

    if (removed && !shallowEqual(this.#state, next)) {
      this.#state = next;
      this.#subject.next({ ...next });
    }

    return this;
  }

  /**
   * Extracts a subset of the reporter's current state based on logical predicate filtering.
   *
   * This method creates a shallow clone of the internal state and filters its keys using one
   * or more predicate functions. It is purely read-only and does not mutate or emit updates.
   *
   * The filtering mode determines how predicates are applied:
   *
   * 1. `"any"` - A key is included if **at least one predicate** returns `true`.
   * 2. `"all"` - A key is included only if **every predicate** returns `true`.
   *
   * This approach is useful for sampling the state map non-destructively for analysis,
   * logging, or conditional metrics logic, without triggering downstream emissions.
   *
   * @param predicates - An array of predicate functions that evaluate keys in the state.
   * @param mode - Logical filtering mode (`"any"` or `"all"`). Defaults to `"all"`.
   *
   * @returns A filtered `ReporterStateMap` object containing only matching keys.
   *
   * @example
   * ```ts
   * const reporter = new Reporter();
   * reporter.apply(set("foo", 1), set("bar", "ok"), set("baz", true));
   *
   * const subset = reporter.extract([
   *   (state, key) => typeof state[key] === "string",
   *   (state, key) => key === "baz"
   * ], "any");
   *
   * console.log(subset); // { bar: "ok", baz: true }
   * ```
   */
  extract(
    predicates: Array<(state: T, key: string) => boolean>,
    mode: "any" | "all" = "all"
  ): T {
    const next: T = {} as T;
    for (const key of Object.keys(this.#state)) {
      const passed =
        mode === "all"
          ? predicates.every((fn) => fn(this.#state, key))
          : predicates.some((fn) => fn(this.#state, key));
      if (passed) {
        next[key as keyof T] = this.#state[key as keyof T];
      }
    }
    return next;
  }

  /**
   * Allows you to subscribe to changes to specific keys in the reporter's state.
   *
   * This pipe creates a filtered stream that only emits when watched keys change by:
   *
   * 1. `startWith(this.snapshot())` - Ensures the stream begins with the current
   *    state, providing immediate access to initial values for subscribers.
   *
   * 2. `pairwise()` - Buffers emissions into pairs of [previous, current] state,
   *    enabling comparison between consecutive states to detect changes.
   *
   * 3. `filter([prev, curr] => ...)` - Only allows emissions through when at least
   *    one of the watched keys has actually changed, using Object.is() for precise
   *    equality comparison (handles NaN, -0/+0 correctly).
   *
   * 4. `map([, curr] => curr)` - Extracts just the current state from the pair,
   *    providing subscribers with the updated state object.
   *
   * This approach prevents unnecessary emissions when unwatched keys change,
   * optimizing performance for components that only care about specific metrics.
   *
   * @param keys - One or more keys to watch for changes explicitly.
   *
   * @returns An observable that emits the reporter's state when the specified
   * keys change.
   *
   * @example
   * ```ts
   * const reporter = new Reporter();
   * reporter.watch("foo").subscribe((state) => {
   *   console.log(state.foo);
   * });
   * reporter.apply(set("foo", 1), set("bar", 2));
   * // Logs: { foo: 1 }
   * ```
   */
  watch(...keys: string[]): Observable<T> {
    return this.metrics$.pipe(
      // Start with the initial state.
      startWith(this.snapshot()),
      // Pair each emission with the previous [previous, current] values.
      pairwise(),
      // Only pass through when at least one watched key changed.
      filter(([prev, curr]) => keys.some((k) => !Object.is(prev[k], curr[k]))),
      // Map to the new state.
      map(([, curr]) => curr)
    );
  }
}

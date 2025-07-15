import { BehaviorSubject, Observable } from "rxjs";
import { distinctUntilChanged } from "rxjs/operators";
import { shallowEqual } from "../../objects/shallow-equal";
import type { Operation } from "./operations";
import { add, sub } from "./operations";

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
export class Reporter {
  /**
   * The current state of the reporter.
   */
  #state: ReporterStateMap;

  /**
   * The subject that emits the current state.
   */
  #subject: BehaviorSubject<ReporterStateMap>;

  /**
   * The observable that emits the current state.
   */
  readonly metrics$: Observable<ReporterStateMap>;

  /**
   * Create a new reporter.
   *
   * @param initial - The initial state. Defaults to an empty object.
   */
  constructor(initial?: Partial<ReporterStateMap>) {
    this.#state = { ...(initial ?? {}) };
    this.#subject = new BehaviorSubject<ReporterStateMap>({ ...this.#state });
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
  apply(...items: Array<Partial<ReporterStateMap> | Operation>): Reporter {
    // Build the next state by applying each item sequentially.
    let next = { ...this.#state };

    for (const item of items) {
      const delta: Partial<ReporterStateMap> =
        typeof item === "function" ? (item as Operation)(next) : item;
      Object.assign(next, delta);
    }

    // Emit only if anything actually changed.
    if (!shallowEqual(this.#state, next)) {
      this.#state = next;
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
  set(key: string, value: ReporterValue): Reporter {
    return this.apply({ [key]: value });
  }

  /**
   * Helper method for adding a number to a key from an operation.
   *
   * @param key - The key to add to.
   * @param amount - The amount to add.
   *
   * @returns The reporter instance.
   */
  add(key: string, amount: number): Reporter {
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
  sub(key: string, amount: number): Reporter {
    return this.apply(sub(key, amount));
  }

  /**
   * Helper method for getting a snapshot of the current state.
   *
   * @returns A shallow clone of the current state.
   */
  snapshot(): ReporterStateMap {
    return { ...this.#state };
  }
}

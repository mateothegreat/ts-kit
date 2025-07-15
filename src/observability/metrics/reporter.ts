import { Observable, Subject } from "rxjs";
import { distinctUntilChanged } from "rxjs/operators";
import { shallowEqual } from "../../objects/shallow-equal";

/**
 * Supported value types for the reporter state map.
 */
export type ReporterValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | object;

/**
 * A map of key-value pairs that represent the state of the reporter.
 */
export interface ReporterStateMap {
  [key: string]: ReporterValue;
}

/**
 * A change in the state of the reporter.
 */
export interface ReporterChange {
  key: string;
  before: ReporterValue;
  after: ReporterValue;
}

/**
 * An update to the state of the reporter.
 */
export interface ReporterUpdate {
  changes: ReporterChange[];
  snapshot: ReporterStateMap;
}

/**
 * A reporter is a class that maintains a state map and emits the latest
 * reconciled value of the state map.
 *
 * @example
 * ```ts
 * const reporter = new Reporter();
 * reporter.set("count", 0);
 * reporter.snapshot(); // { count: 0 }
 * reporter.metrics$.subscribe((state) => console.log(state)); // { count: 0 }
 * reporter.add("count", 1);
 * reporter.sub("count", 1);
 * reporter.snapshot(); // { count: 1 }
 * // You could also subscribe to the observables earlier and get emissions like:
 * reporter.metrics$.subscribe((state) => console.log(state)); // { count: 1 }
 * reporter.updates$.subscribe((update) => console.log(update)); // { changes: [{ key: "count", before: 0, after: 1 }], snapshot: { count: 1 } }
 * ```
 */
export class Reporter {
  /**
   * Emits the latest reconciled value of the state map.
   */
  readonly #subject: Subject<ReporterStateMap>;

  /**
   * Emits the new state to subscribers when (and if) the state changes.
   */
  readonly metrics$: Observable<ReporterStateMap>;

  /**
   * Emits the new state to subscribers when (and if) the state changes.
   */
  // readonly updates$: Observable<ReporterUpdate>;

  /**
   * Holds the values for the state that we maintain.
   */
  #state: ReporterStateMap;

  /**
   * Creates a new reporter instance.
   *
   * @param {Partial<ReporterStateMap>} initial - The initial state. @optional
   */
  constructor(initial?: Partial<ReporterStateMap>) {
    this.#state = { ...(initial ?? {}) };
    this.#subject = new Subject<ReporterStateMap>();

    this.metrics$ = this.#subject
      .asObservable()
      .pipe(distinctUntilChanged(shallowEqual));
  }

  /**
   * Returns the changes between the previous and next state.
   *
   * @param {ReporterStateMap} next - The next state.
   *
   * @returns {ReporterChange[]} The changes between the previous and next state.
   */
  #change(next: ReporterStateMap): ReporterChange[] {
    const changes: ReporterChange[] = [];
    const prev = this.#state;

    for (const key of Object.keys(next)) {
      if (!Object.is(prev[key], next[key])) {
        changes.push({
          key,
          before: prev[key],
          after: next[key],
        });
      }
    }

    return changes;
  }

  /**
   * Sets a value for a key in the state.
   *
   * @param {string} key - The key to set.
   * @param {ReporterValue} value - The value to set.
   *
   * @returns {Reporter} The reporter instance for builder pattern usage.
   */
  set(key: string, value: ReporterValue): Reporter {
    this.apply({ [key]: value });
    return this;
  }

  /**
   * Applies a delta to the state.
   *
   * @param {Partial<ReporterStateMap>} delta - The delta to apply to the state.
   *
   * @returns {Reporter} The reporter instance for builder pattern usage.
   */
  apply(delta: Partial<ReporterStateMap>): Reporter {
    const current = { ...this.#state };
    let changed = false;

    for (const key in delta) {
      if (!Object.is(delta[key], this.#state[key])) {
        current[key] = delta[key];
        changed = true;
      }
    }

    if (changed) {
      this.#state = current;
      this.#subject.next({ ...current });
    }

    return this;
  }

  /**
   * Adds a value to a key in the state.
   *
   * @throws {TypeError} - Throws an error if the `key` is not of type `number`.
   *
   * @param {string} key - The key to add to.
   * @param {number} value - The value to add.
   *
   * @returns {Reporter} The reporter instance for builder pattern usage.
   */
  add(key: string, value: number): Reporter {
    if (!this.#state[key]) {
      this.set(key, value);
      return this;
    }
    if (typeof this.#state[key] === "number") {
      const next = (this.#state[key] ?? 0) + value;
      this.apply({ [key]: next });
      return this;
    }
    throw new TypeError(
      `key ${key} is not a number, is ${typeof this.#state[key]}`
    );
  }

  /**
   * Subtracts a value from a key in the state.
   *
   * @throws {TypeError} - Throws an error if the `key` is not of type `number`.
   *
   * @param {string} key - The key to subtract from.
   * @param {number} value - The value to subtract.
   *
   * @returns {Reporter} The reporter instance for builder pattern usage.
   */
  sub(key: string, value: number): Reporter {
    if (!this.#state[key]) {
      this.set(key, value);
      return this;
    }
    if (typeof this.#state[key] === "number") {
      const next = (this.#state[key] ?? 0) - value;
      this.apply({ [key]: next });
      return this;
    }
    throw new TypeError(
      `key ${key} is not a number, is ${typeof this.#state[key]}`
    );
  }

  /**
   * Returns a snapshot of the state by cloning the current state
   * to prevent mutation.
   *
   * @returns {ReporterStateMap} Copy of the state map.
   */
  snapshot(): ReporterStateMap {
    return { ...this.#state };
  }
}

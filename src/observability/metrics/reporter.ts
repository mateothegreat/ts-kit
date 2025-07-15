import { BehaviorSubject, Observable } from "rxjs";
import { distinctUntilChanged, map } from "rxjs/operators";
import { shallowEqual } from "../../objects/equality";

export type MetricsValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | object;

export interface MetricsStateMap {
  [key: string]: MetricsValue;
}

export interface MetricsChange {
  key: string;
  before: MetricsValue;
  after: MetricsValue;
}

export interface MetricsUpdate {
  changes: MetricsChange[];
  snapshot: MetricsStateMap;
}

export class MetricsReporter {
  #state: MetricsStateMap;
  #subject: BehaviorSubject<MetricsStateMap>;

  readonly metrics$: Observable<MetricsStateMap>;
  readonly updates$: Observable<MetricsUpdate>;

  constructor(initial?: Partial<MetricsStateMap>) {
    this.#state = { ...(initial ?? {}) };
    this.#subject = new BehaviorSubject<MetricsStateMap>({ ...this.#state });

    this.metrics$ = this.#subject
      .asObservable()
      .pipe(distinctUntilChanged(shallowEqual));

    this.updates$ = this.metrics$.pipe(
      map((snapshot) => ({
        changes: this.#change(snapshot),
        snapshot,
      }))
    );
  }

  #change(next: MetricsStateMap): MetricsChange[] {
    const changes: MetricsChange[] = [];
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

  capture(delta: Partial<MetricsStateMap>): MetricsStateMap | null {
    const next = { ...this.#state };
    let changed = false;

    for (const key in delta) {
      if (!Object.is(delta[key], this.#state[key])) {
        next[key] = delta[key];
        changed = true;
      }
    }

    if (changed) {
      this.#state = next;
      this.#subject.next({ ...next });
    }

    return changed ? next : null;
  }

  add(key: string, value: number): number {
    if (typeof this.#state[key] === "number") {
      const next = (this.#state[key] ?? 0) + value;
      this.capture({ [key]: next });
      return next;
    }
    throw new TypeError(
      `key ${key} is not a number, is ${typeof this.#state[key]}`
    );
  }

  sub(key: string, value: number): number {
    if (typeof this.#state[key] === "number") {
      const next = (this.#state[key] ?? 0) - value;
      this.capture({ [key]: next });
      return next;
    }
    throw new TypeError(
      `key ${key} is not a number, is ${typeof this.#state[key]}`
    );
  }

  snapshot(): MetricsStateMap {
    return { ...this.#state };
  }
}

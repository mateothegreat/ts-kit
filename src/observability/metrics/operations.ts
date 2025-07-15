import type { ReporterValue } from "./reporter";

/**
 * A function that, given the current state, returns a partial delta.
 */
export type Operation = (
  state: Readonly<Record<string, ReporterValue>>
) => Partial<Record<string, ReporterValue>>;

/**
 * Set a key to a value.
 *
 * @param key - The key to set.
 * @param value - The value to set.
 *
 * @returns A function that, given the current state, returns a partial delta.
 *
 * @example
 * ```ts
 * const reporter = new Reporter();
 * reporter.apply(set("foo", 1));
 * ```
 */
export const set =
  (key: string, value: ReporterValue): Operation =>
  (state) => ({ [key]: value });

/**
 * Add a number to a key.
 *
 * @param key - The key to add to.
 * @param amount - The amount to add.
 *
 * @returns A function that, given the current state, returns a partial delta.
 *
 * @example
 * ```ts
 * const reporter = new Reporter();
 * reporter.apply(add("foo", 1));
 * ```
 */
export const add =
  (key: string, amount: number): Operation =>
  (state) => {
    const cur = typeof state[key] === "number" ? (state[key] as number) : 0;
    return { [key]: cur + amount };
  };

/**
 * Subtract a number from a key.
 *
 * @param key - The key to subtract from.
 * @param amount - The amount to subtract.
 *
 * @returns A function that, given the current state, returns a partial delta.
 *
 * @example
 * ```ts
 * const reporter = new Reporter();
 * reporter.apply(sub("foo", 1));
 * ```
 */
export const sub =
  (key: string, amount: number): Operation =>
  (state) => {
    const cur = typeof state[key] === "number" ? (state[key] as number) : 0;
    return { [key]: cur - amount };
  };

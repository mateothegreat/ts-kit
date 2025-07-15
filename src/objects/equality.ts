/**
 * Performs a strict shallow equality check between two plain objects.
 *
 * Comparison rules:
 * - Keys must match exactly (no extra or missing properties)
 * - Values are compared with `Object.is()` for type and value
 * - Prototype chain and non-enumerable properties are ignored
 *
 * @template T - Object type to compare.
 *
 * @param a - First object.
 * @param b - Second object.
 *
 * @returns `true` if all shallow key-value pairs are equal, else `false`.
 *
 * @example
 * ```ts
 * shallowEqual({ a: 1 }, { a: 1 }) // true
 * shallowEqual({ a: 1 }, { a: "1" }) // false
 * shallowEqual({ a: 1 }, { a: 1, b: 2 }) // false
 * ```
 */
export const shallowEqual = <T extends object>(a: T, b: T): boolean => {
  if (a === b) return true;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.hasOwn(b, key)) return false;
    if (!Object.is(a[key as keyof T], b[key as keyof T])) return false;
  }

  return true;
};

/**
 * Performs a deep structural equality check between two values.
 *
 * Handles:
 * - Objects and arrays
 * - Maps, Sets, and Dates
 * - Primitives, including `NaN`
 * - Proper handling of `null`, `undefined`, and circular references
 *
 * @param a - First value to compare.
 * @param b - Second value to compare.
 *
 * @returns `true` if the values are deeply equal, else `false`.
 *
 * @example
 * ```ts
 * deepEqual({ a: { b: [1, 2] }, c: new Date('2024-01-01') }, { a: { b: [1, 2] }, c: new Date('2024-01-01') }) // true
 * deepEqual({ a: new Map([['x', 1]]) }, { a: new Map([['x', '1']]) }) // false
 * deepEqual({ users: [{ id: 1, tags: new Set(['admin']) }] }, { users: [{ id: 1, tags: new Set(['user']) }] }) // false
 * ```
 */
export const deepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;

  if (typeof a !== "object" || a === null || b === null) return false;

  const typeA = Object.prototype.toString.call(a);
  const typeB = Object.prototype.toString.call(b);
  if (typeA !== typeB) return false;

  // Array comparison
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((val, i) => deepEqual(val, b[i]));
  }

  // Map comparison
  if (a instanceof Map) {
    if (!(b instanceof Map)) return false;
    if (a.size !== b.size) return false;
    for (const [key, val] of a) {
      if (!b.has(key) || !deepEqual(val, b.get(key))) return false;
    }
    return true;
  }

  // Set comparison
  if (a instanceof Set) {
    if (!(b instanceof Set)) return false;
    if (a.size !== b.size) return false;
    for (const val of a) {
      if (!b.has(val)) return false;
    }
    return true;
  }

  // Date comparison
  if (a instanceof Date)
    return b instanceof Date && a.getTime() === b.getTime();

  // Object comparison
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.hasOwn(b, key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
};

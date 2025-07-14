/**
 * Shallow equality check for objects.
 *
 * @param a - The first object to compare.
 * @param b - The second object to compare.
 *
 * @returns True if the objects are equal, false otherwise.
 *
 * @example
 * ```ts
 * const a = { a: 1, b: 2 };
 * const b = { a: 1, b: 3 };
 * console.log(shallowEqual(a, b)); // false
 * ```
 */
export const shallowEqual = (a: object, b: object): boolean => {
  for (const key in a) {
    if (a[key as keyof object] !== b[key as keyof object]) {
      return false;
    }
  }
  return true;
};

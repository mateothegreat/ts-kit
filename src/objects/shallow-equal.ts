/**
 * Performs a shallow equality check between two objects.
 *
 * @param {T} a - The first object.
 * @param {T} b - The second object.
 *
 * @returns {boolean} `true` if the objects are equal, `false` otherwise.
 */
export const shallowEqual = <T extends object>(a: T, b: T): boolean => {
  if (
    typeof a !== "object" ||
    a === null ||
    typeof b !== "object" ||
    b === null
  ) {
    return Object.is(a, b);
  }

  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    if (!Object.hasOwn(b, key)) return false;

    const aVal = a[key as keyof T];
    const bVal = b[key as keyof T];

    if (!Object.is(aVal, bVal)) return false;
  }

  return true;
};

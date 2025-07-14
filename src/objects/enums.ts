/**
 * Typed Object.entries for enums.
 */
export const typedEnumEntries = <T extends Record<string, number>>(
  enumObj: T
): [Extract<keyof T, string>, T[Extract<keyof T, string>]][] => {
  return Object.entries(enumObj)
    .filter(([key]) => isNaN(Number(key))) // exclude reverse numeric keys
    .map(([key, value]) => [key, value]) as [
    Extract<keyof T, string>,
    T[Extract<keyof T, string>]
  ][];
};

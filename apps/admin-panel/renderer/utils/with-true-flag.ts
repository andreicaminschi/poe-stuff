/** The row with `field: true`, or with the field gone. A flag is never written `false`. */
export function withTrueFlag<T extends object, K extends keyof T>(row: T, field: K, on: boolean): T {
  if (on) return { ...row, [field]: true };

  const { [field]: _dropped, ...rest } = row;
  return rest as T;
}

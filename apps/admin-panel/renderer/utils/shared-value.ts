export function sharedValue(values: readonly string[]): string | undefined {
  const [first] = values;
  if (first === undefined) return undefined;

  return values.every((value) => value === first) ? first : undefined;
}

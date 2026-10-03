/**
 * Writes a value as JSON with every object's keys sorted, so the sender and main hash the same
 * bytes for the same command. Undefined fields are left out, as `JSON.stringify` does. Low, Sonar 2.
 *
 * @example
 * canonicalJson({ b: 1, a: [2, { d: undefined, c: 3 }] }); // → '{"a":[2,{"c":3}],"b":1}'
 */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value === null || typeof value !== "object") return JSON.stringify(value);

  const fields = Object.entries(value)
    .filter(([, field]) => field !== undefined)
    .sort(([left], [right]) => (left < right
      ? -1
      : 1))
    .map(([key, field]) => `${JSON.stringify(key)}:${canonicalJson(field)}`);

  return `{${fields.join(",")}}`;
}

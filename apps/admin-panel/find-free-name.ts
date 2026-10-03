/**
 * Returns the name when no seeder holds it, else `Name (2)`, `Name (3)`, the first free one.
 * Low, Sonar 1.
 *
 * @example
 * findFreeName("Rings", ["Rings", "Rings (2)"]); // → "Rings (3)"
 */
export function findFreeName(name: string, takenNames: readonly string[]): string {
  if (!takenNames.includes(name)) return name;

  let number = 2;
  while (takenNames.includes(`${name} (${number})`)) number += 1;
  return `${name} (${number})`;
}

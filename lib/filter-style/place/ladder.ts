import { HIDDEN, TIERS, type Bucket, type TierName } from "../types.ts";

/**
 * The enabled tiers richest-first, then Hidden.
 *
 * Each enabled tier's ceiling is the floor of the next enabled tier above it, so a disabled
 * tier's range falls to the tier below. Hidden takes everything under the lowest floor.
 */
export function ladderOf(
  floors: Readonly<Record<TierName, number>>,
  disabled: readonly TierName[],
): readonly Bucket[] {
  const enabled = TIERS.filter((name) => !disabled.includes(name));
  const tiers = enabled.map((name, at): Bucket => {
    const above = enabled[at - 1];
    return above === undefined ? { name, floor: floors[name] } : { name, floor: floors[name], ceiling: floors[above] };
  });

  const lowest = tiers[tiers.length - 1];
  const hidden: Bucket = lowest === undefined ? { name: HIDDEN, floor: 0 } : { name: HIDDEN, floor: 0, ceiling: lowest.floor };

  return [...tiers, hidden];
}

export const holds = (bucket: Bucket, value: number): boolean =>
  value >= bucket.floor && (bucket.ceiling === undefined || value < bucket.ceiling);

export function span(bucket: Bucket, unit: string): string {
  if (bucket.ceiling === undefined) return `${bucket.floor}${unit} and up`;
  if (bucket.floor === 0) return `under ${bucket.ceiling}${unit}`;

  return `${bucket.floor}-${bucket.ceiling}${unit}`;
}

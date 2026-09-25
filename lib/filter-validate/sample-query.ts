import type { FilterItem } from "@poe/filter-eval/filter-ast";

const WORDED: Readonly<Record<string, (value: unknown) => string | undefined>> = {
  GemLevel: (value) => (value ? `gem level ${value}` : undefined),
  Quality: (value) => (value ? `quality ${value}` : undefined),
  Corrupted: (value) => (value === true ? "corrupted" : undefined),
  LinkedSockets: (value) => (value ? `${value} links` : undefined),
  MapTier: (value) => (value ? `map tier ${value}` : undefined),
  ItemLevel: (value) => (value ? `item level ${value}` : undefined),
  HasInfluence: (value) => (Array.isArray(value) && value.length > 0 ? `influence ${value.join(" ")}` : undefined),
};

function part(rowName: string, name: string, value: unknown): string | undefined {
  const worded = WORDED[name];
  if (worded !== undefined) return worded(value);
  if (name === "BaseType" && Array.isArray(value) && value.join(" ") === rowName) return undefined;
  if (Array.isArray(value)) return value.length === 0 ? undefined : `${name} ${value.join(" ")}`;

  return `${name} ${String(value)}`;
}

/** One sample as a listing matcher query. */
export function sampleQuery(rowName: string, item: FilterItem): string {
  const parts = Object.entries(item).flatMap(([name, value]) => {
    const one = part(rowName, name, value);
    return one === undefined ? [] : [one];
  });

  return [rowName, ...parts].join(", ");
}

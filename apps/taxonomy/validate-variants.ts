import type { AuthoredVariant, VariantTable } from "./types.ts";
import { collect, throwFirst, type RowProblem } from "./validate.ts";
import { conditionsProblem } from "./validate-conditions.ts";
import { listingProblem } from "./validate-table.ts";

const FIELDS = ["name", "conditions", "listing", "unpriceable"];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function variantsProblem(value: unknown): string | null {
  if (!Array.isArray(value)) return "is not a list";
  if (value.length === 0) return "authors no variants; delete the key instead";

  const names = new Set<string>();

  for (const variant of value) {
    if (!isObject(variant)) return "has a variant that is not an object";

    const extra = Object.keys(variant).filter((key) => !FIELDS.includes(key));

    if (extra.length > 0) {
      return `has a variant with unknown fields: ${extra.join(", ")}`;
    }

    if (typeof variant.name !== "string" || variant.name.length === 0) {
      return "has a variant whose name is not a non-empty string";
    }

    if (names.has(variant.name)) return `authors variant "${variant.name}" twice`;

    names.add(variant.name);

    const problem = conditionsProblem(variant.conditions);

    if (problem !== null) return `variant "${variant.name}" ${problem}`;

    if (variant.unpriceable !== undefined && typeof variant.unpriceable !== "boolean") {
      return `variant "${variant.name}" unpriceable must be a boolean when it is present`;
    }

    if (variant.unpriceable === true && variant.listing !== undefined) {
      return `variant "${variant.name}" is unpriceable and has a listing`;
    }

    if (variant.listing !== undefined) {
      const bad = listingProblem(variant.listing);

      if (bad !== null) return `variant "${variant.name}" ${bad}`;
    }
  }

  return null;
}

export const collectVariantTable = (
  value: unknown,
  known: ReadonlySet<string>,
  source: string,
): readonly RowProblem[] =>
  collect(value, source, (id, variants) =>
    known.has(id)
      ? variantsProblem(variants)
      : "is not an item or an authored row in this version",
  );

export function validateVariantTable(
  value: unknown,
  known: ReadonlySet<string>,
  source: string,
): VariantTable {
  throwFirst(source, collectVariantTable(value, known, source));

  return value as Readonly<Record<string, readonly AuthoredVariant[]>>;
}

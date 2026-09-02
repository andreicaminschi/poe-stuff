import type { AuthoredVariant, VariantTable } from "./types.ts";
import { conditionsProblem } from "./validate-conditions.ts";
import { priceProblem } from "./validate-table.ts";

const FIELDS = ["name", "conditions", "price"];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Reads one item's variant list, and says what is wrong with it.
 *
 * An empty list is refused. It would mean the same as no key, and a key that authors nothing
 * is a row somebody stopped editing halfway through.
 */
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

    if (variant.price !== undefined) {
      const bad = priceProblem(variant.price);

      if (bad !== null) return `variant "${variant.name}" ${bad}`;
    }
  }

  return null;
}

/**
 * Checks parsed JSON against `VariantTable` and hands back the same value, typed.
 *
 * Checked against the rows the version has — items and authored — rather than alone. A key
 * neither table has is a variant list nothing will ever carry, and the likeliest cause is a
 * metadata id that changed between leagues — exactly the mistake a separate file makes easy
 * and this makes loud.
 */
export function validateVariantTable(
  value: unknown,
  known: ReadonlySet<string>,
  source: string,
): VariantTable {
  if (!isObject(value)) {
    throw new Error(`${source} is not an object`);
  }

  for (const [id, variants] of Object.entries(value)) {
    if (!known.has(id)) {
      throw new Error(
        `${source}: "${id}" is not an item or an authored row in this version`,
      );
    }

    const problem = variantsProblem(variants);

    if (problem !== null) {
      throw new Error(`${source}: "${id}" ${problem}`);
    }
  }

  return value as Readonly<Record<string, readonly AuthoredVariant[]>>;
}

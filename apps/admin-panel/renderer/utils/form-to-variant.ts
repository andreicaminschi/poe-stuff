import type { Form } from "../../api/panel-api.ts";
import type { Condition, Variant } from "../../api/taxonomy/types.ts";
import { titleCase } from "./title-case.ts";

const RARITIES = ["Normal", "Magic", "Rare", "Unique"];

type Key = "itemLevel" | "linkCount" | "gemLevel" | "gemQuality" | "gemIsCorrupted" | "mapTier";

const FIELDS: readonly {
  readonly key: Key;
  readonly condition: string;
  readonly operator?: string;
  readonly label: (value: number | boolean) => string;
}[] = [
  { key: "itemLevel", condition: "ItemLevel", operator: ">=", label: (value) => `ilvl ${value}` },
  { key: "linkCount", condition: "LinkedSockets", operator: ">=", label: (value) => `${value}L` },
  { key: "gemLevel", condition: "GemLevel", operator: ">=", label: (value) => `L${value}` },
  { key: "gemQuality", condition: "Quality", operator: ">=", label: (value) => `Q${value}` },
  { key: "gemIsCorrupted", condition: "Corrupted", label: (value) => (value === true ? "corrupted" : "clean") },
  { key: "mapTier", condition: "MapTier", operator: "==", label: (value) => `T${value}` },
];

const influenceKey = (form: Form): string => [...form.influences].sort().join(",");

const nextLevelUp = (form: Form, siblings: readonly Form[]): number | undefined => {
  const above = siblings.flatMap((other) =>
    other.itemLevel !== undefined && form.itemLevel !== undefined && other.itemLevel > form.itemLevel ? [other.itemLevel] : [],
  );

  return above.length === 0 ? undefined : Math.min(...above);
};

/**
 * One form as a variant, told apart from its siblings.
 *
 * The listing is the form's whole query. A condition is only written for what the siblings
 * disagree on, and Rarity is always one.
 */
export function formToVariant(form: Form, siblings: readonly Form[]): Variant {
  const differs = (read: (other: Form) => unknown): boolean =>
    siblings.some((other) => read(other) !== read(form));
  const keys = FIELDS.filter(({ key }) => form[key] !== undefined && differs((other) => other[key]));

  const rarity = RARITIES[form.frame];
  const conditions: Condition[] = [
    ...(rarity === undefined ? [] : [{ condition: "Rarity", operator: "==", value: [rarity] }]),
    ...keys.flatMap(({ key, condition, operator }): Condition[] => {
      const value = form[key] as number | boolean;
      const ceiling = key === "itemLevel" ? nextLevelUp(form, siblings) : undefined;
      if (ceiling !== undefined) {
        return [
          { condition, operator: ">=", value },
          { condition, operator: "<=", value: ceiling - 1 },
        ];
      }

      return [{ condition, ...(operator === undefined ? {} : { operator }), value }];
    }),
  ];
  const labels = keys.map(({ key, label }) => label(form[key] as number | boolean));

  if (differs(influenceKey)) {
    const influences = form.influences.length === 0 ? ["None"] : form.influences.map(titleCase);
    conditions.push({ condition: "HasInfluence", value: influences });
    if (form.influences.length > 0) labels.push(form.influences.join("/"));
  }

  if (differs((other) => other.synthesised)) {
    conditions.push({ condition: "SynthesisedItem", value: form.synthesised });
    if (form.synthesised) labels.push("synth");
  }

  return {
    name: labels.length === 0 ? (rarity ?? "variant").toLowerCase() : labels.join(" "),
    conditions,
    listing: form.query,
  };
}

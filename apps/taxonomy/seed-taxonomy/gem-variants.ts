import type { Gems } from "@poe/repoe/get-gems.types";
import type { AuthoredVariant, TaxonomyTable, VariantTable } from "../types.ts";

/** A gem's form: one level, one quality, corrupted or not. */
const form = (
  level: number,
  quality: number,
  corrupted: boolean,
): AuthoredVariant => ({
  name: `${level}/${quality}${corrupted ? " corrupted" : ""}`,
  conditions: [
    { condition: "GemLevel", operator: "==", value: level },
    { condition: "Quality", operator: "==", value: quality },
    { condition: "Corrupted", value: corrupted },
  ],
  price: { gemLevel: level, gemQuality: quality, gemIsCorrupted: corrupted },
});

/**
 * The forms a gem is priced in, off its max level `L`.
 *
 * Three uncorrupted — dropped, quality-capped, max — and the four a Vaal Orb can make of the
 * max: the two outcomes that keep the item, +1 level and +3 quality, one at a time and
 * together. Becoming Vaal is the third outcome and is another item, so a Vaal gem carries
 * corrupted forms alone — it cannot exist uncorrupted — and its own +1 and +3 are the pairs.
 *
 * A gem whose max is 1 would write `1/20` twice, so a repeated name is dropped.
 */
function gemForms(max: number, vaal: boolean): readonly AuthoredVariant[] {
  const forms = vaal
    ? [
        form(1, 0, true),
        form(1, 20, true),
        form(max, 20, true),
        form(max + 1, 20, true),
        form(max, 23, true),
      ]
    : [
        form(1, 0, false),
        form(1, 20, false),
        form(max, 20, false),
        form(max, 20, true),
        form(max + 1, 20, true),
        form(max, 23, true),
        form(max + 1, 23, true),
      ];

  const seen = new Set<string>();

  return forms.filter((variant) => {
    if (seen.has(variant.name)) return false;
    seen.add(variant.name);
    return true;
  });
}

/**
 * Every skill gem's forms, off what the game says a gem can be.
 *
 * The items table keys a gem by the id `base_items.json` gives it, and RePoE's gem export
 * keys by the variant — the two agree for most gems and not for all: `Convocation` is
 * `SkillGemConvocation` in one and `SkillGemConvocationNew` in the other, joined by the
 * export's `gameId`. So a gem is looked up by key first and by `gameId` second. One the
 * export has under neither gets nothing: the graft gems are a name the taxonomy carries and
 * the export does not, and nothing here can say what their max is.
 *
 * Written whether or not anyone lists a form. There is no market here to gate on, and a form
 * nobody sells is a variant the catalog leaves unpriced, which is what unpriced is for.
 */
export function gemVariants(items: TaxonomyTable, gems: Gems): VariantTable {
  const byGameId = new Map<string, Gems[string]>();
  for (const gem of Object.values(gems)) {
    if (!byGameId.has(gem.gameId)) byGameId.set(gem.gameId, gem);
  }

  const table: Record<string, readonly AuthoredVariant[]> = {};

  for (const [id, entry] of Object.entries(items)) {
    if (entry.category !== "skill-gem") continue;

    const gem = gems[id] ?? byGameId.get(id);
    if (gem === undefined) continue;

    table[id] = gemForms(gem.naturalMaxLevel, gem.vaalGem === true);
  }

  return table;
}

import type { SampleCategories, SampleSet } from "@poe/filter-validate/types";

function collapseSet(set: SampleSet): SampleSet {
  const rarity = set["Rarity"];
  if (rarity === undefined || !("values" in rarity)) return set;

  const unique = rarity.values.filter((value) => value === "Unique");
  const other = rarity.values.find((value) => value !== "Unique");
  return { ...set, Rarity: { values: other === undefined ? unique : [other, ...unique] } };
}

/** Rarity is unique or not. One non-unique value is kept. */
export function collapseRarity(categories: SampleCategories): SampleCategories {
  return Object.fromEntries(
    Object.entries(categories).map(([path, record]) => [
      path,
      record.samples === undefined ? record : { ...record, samples: record.samples.map(collapseSet) },
    ]),
  );
}

import { describe, it, expect } from "@jest/globals";
import type { AuthoredItem, Draft, GggItem } from "../../api/taxonomy/types.ts";
import { baseTypeOptions } from "./base-type-options.ts";

const ggg = (name: string): GggItem => ({
  source: "ggg",
  key: `Metadata/${name}`,
  name,
  classification: { category: "currency", subcategory: null },
  conditions: [],
  variants: [],
});

const authored = (name: string, baseType: string): AuthoredItem => ({
  source: "authored",
  key: `authored/${name}`,
  name,
  baseType,
  classification: { category: "gem", subcategory: null },
  reason: "r",
  replaces: [],
  conditions: [],
  variants: [],
});

const draft = (items: readonly (GggItem | AuthoredItem)[]): Draft => ({
  id: "3.29.2",
  items: Object.fromEntries(items.map((item) => [item.key, item])),
  categories: {},
});

describe("baseTypeOptions", () => {
  it("lists plain names unlabelled and authored base types labelled, sorted and once each", () => {
    expect(
      baseTypeOptions(
        draft([
          ggg("Chaos Orb"),
          authored("Absolution of Inspiring", "Absolution"),
          authored("Absolution of Other", "Absolution"),
          ggg("Chaos Orb"),
        ]),
      ),
    ).toEqual([
      { value: "Absolution", label: "authored: Absolution of Inspiring, Absolution of Other" },
      { value: "Chaos Orb" },
    ]);
  });

  it("marks a plain name that an authored row also uses", () => {
    expect(baseTypeOptions(draft([ggg("Vaal Aspect"), authored("Vaal Aspect", "Vaal Aspect")]))).toEqual([
      { value: "Vaal Aspect", label: "authored: Vaal Aspect" },
    ]);
  });

  it("skips an authored row with no base type yet", () => {
    expect(baseTypeOptions(draft([authored("Blank", "")]))).toEqual([]);
  });
});

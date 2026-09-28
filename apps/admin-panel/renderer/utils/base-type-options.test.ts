import { describe, it, expect } from "@jest/globals";
import { baseTypeOptions } from "./base-type-options.ts";
import { authored, draftOf, ggg } from "../test-helpers.ts";

describe("baseTypeOptions", () => {
  it("offers a game item's RePoE name, not its display name, unlabelled", () => { // a filter matches the RePoE name
    expect(baseTypeOptions(draftOf([ggg("Chaos Orb", { displayName: "Chaos" })]))).toEqual([{ value: "Chaos Orb" }]);
  });

  it("offers a base type two game items share only once", () => { // the Set collapses duplicates
    expect(baseTypeOptions(draftOf([ggg("Onyx"), ggg("Onyx2", { name: "Onyx" })]))).toEqual([{ value: "Onyx" }]);
  });

  it("labels an authored base type with every row that gives it", () => { // names join in draft order
    const draft = draftOf([authored("One", { baseType: "Onyx" }), authored("Two", { baseType: "Onyx" })]);

    expect(baseTypeOptions(draft)).toEqual([{ value: "Onyx", label: "authored: One, Two" }]);
  });

  it("labels a base type as authored even when a game item has the same name", () => { // authored wins the label
    const draft = draftOf([ggg("Onyx"), authored("Mine", { baseType: "Onyx" })]);

    expect(baseTypeOptions(draft)).toEqual([{ value: "Onyx", label: "authored: Mine" }]);
  });

  it("skips an authored row with an empty base type", () => { // an empty option would match nothing
    expect(baseTypeOptions(draftOf([authored("Mine", { baseType: "" })]))).toEqual([]);
  });

  it("sorts the options by value, ignoring case", () => { // localeCompare, not code-unit order
    const draft = draftOf([ggg("beta"), authored("x", { baseType: "Alpha" })]);

    expect(baseTypeOptions(draft).map((option) => option.value)).toEqual(["Alpha", "beta"]);
  });
});

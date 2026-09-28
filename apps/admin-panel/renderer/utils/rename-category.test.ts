import { describe, it, expect } from "@jest/globals";
import { renameCategory } from "./rename-category.ts";
import { category, draftOf, ggg } from "../test-helpers.ts";

const at = (category: string, subcategory: string | null) => ({ classification: { category, subcategory } });

describe("renameCategory", () => {
  const draft = draftOf(
    [ggg("a", at("gems", null)), ggg("b", at("gems", "support")), ggg("c", at("maps", null))],
    [category("gems", { name: "Gems" }), category("gems/support", { name: "Support" })],
  );

  describe("a top-level category", () => {
    it("moves every row filed under it, subcategory rows included, and no others", () => {
      const rename = renameCategory(draft, "gems", category("skills"));

      expect("changes" in rename && rename.changes.items).toEqual({
        a: { ...draft.items["a"], classification: { category: "skills", subcategory: null } },
        b: { ...draft.items["b"], classification: { category: "skills", subcategory: "support" } },
      }); // the maps row is not in the changes at all
    });

    it("deletes the old records and writes the children under the new path", () => {
      const to = category("skills");

      const rename = renameCategory(draft, "gems", to);

      expect("changes" in rename && rename.changes.categories).toEqual({
        gems: null,
        "gems/support": null,
        "skills/support": { ...draft.categories["gems/support"], path: "skills/support" },
        skills: to,
      });
    });

    it("leaves alone a sibling whose slug only starts with the same letters", () => {
      const withLookalike = draftOf([], [category("gems"), category("gems-extra")]);

      const rename = renameCategory(withLookalike, "gems", category("skills"));

      expect("changes" in rename && rename.changes.categories).toEqual({
        gems: null,
        skills: category("skills"),
      }); // children match on "gems/", not "gems"
    });

    it("refuses a new slug that already has rows filed under it", () => {
      const rename = renameCategory(draft, "gems", category("maps"));

      expect(rename).toEqual({ problem: "maps already exists." }); // maps has rows but no record
    });

    it("refuses a new slug that only a recorded subcategory uses", () => {
      const withChild = draftOf([], [category("gems"), category("skills/x")]);

      const rename = renameCategory(withChild, "gems", category("skills"));

      expect(rename).toEqual({ problem: "skills already exists." });
    });

    it("refuses turning a category into a subcategory", () => {
      const rename = renameCategory(draft, "gems", category("skills/gems"));

      expect(rename).toEqual({ problem: "skills/gems is not gems under a new slug." });
    });

    it("refuses a slug that breaks the slug rule", () => {
      const rename = renameCategory(draft, "gems", category("Skills"));

      expect(rename).toEqual({ problem: "Use lowercase letters, digits and hyphens." });
    });
  });

  describe("a subcategory", () => {
    it("moves only its own rows and deletes only its own record", () => {
      const to = category("gems/aux");

      const rename = renameCategory(draft, "gems/support", to);

      expect(rename).toEqual({
        changes: {
          items: { b: { ...draft.items["b"], classification: { category: "gems", subcategory: "aux" } } },
          categories: { "gems/support": null, "gems/aux": to },
        },
      });
    });

    it("refuses moving it under another category", () => {
      const rename = renameCategory(draft, "gems/support", category("maps/support2"));

      expect(rename).toEqual({ problem: "maps/support2 is not gems/support under a new slug." });
    });

    it("refuses lifting it to a top-level category", () => {
      const rename = renameCategory(draft, "gems/support", category("support"));

      expect(rename).toEqual({ problem: "support is not gems/support under a new slug." }); // depth must match
    });

    it("refuses a slug a sibling already uses for rows", () => {
      const withSibling = draftOf([ggg("x", at("gems", "aux"))], [category("gems/support")]);

      const rename = renameCategory(withSibling, "gems/support", category("gems/aux"));

      expect(rename).toEqual({ problem: "gems/aux already exists." });
    });
  });

  it("refuses a rename to the same path", () => {
    const rename = renameCategory(draft, "gems", category("gems"));

    expect(rename).toEqual({ problem: "gems already has that slug." }); // checked before "already exists"
  });
});

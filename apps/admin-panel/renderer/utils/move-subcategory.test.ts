import { describe, it, expect } from "@jest/globals";
import { moveSubcategory } from "./move-subcategory.ts";
import { category, draftOf, ggg } from "../test-helpers.ts";

const at = (category: string, subcategory: string | null) => ({ classification: { category, subcategory } });

describe("moveSubcategory", () => {
  const draft = draftOf(
    [ggg("a", at("gems", "support")), ggg("b", at("gems", "active")), ggg("c", at("skills", "support"))],
    [category("gems/support", { name: "Support" })],
  );

  it("moves the record and every row filed in the subcategory", () => { // the old record is deleted with a null
    const to = category("misc/support", { name: "Support" });

    const move = moveSubcategory(draft, "gems/support", to);

    expect(move).toEqual({
      changes: {
        items: { a: { ...draft.items["a"], classification: { category: "misc", subcategory: "support" } } },
        categories: { "gems/support": null, "misc/support": to },
      },
    });
  });

  it("moves a subcategory that has no record of its own", () => { // rows alone make a subcategory
    const move = moveSubcategory(draft, "gems/active", category("skills/active"));

    expect("changes" in move && Object.keys(move.changes.items ?? {})).toEqual(["b"]);
  });

  it("leaves the draft it was given untouched", () => { // rows are copied with the new classification
    moveSubcategory(draft, "gems/support", category("misc/support"));

    expect(draft.items["a"]?.classification.category).toBe("gems");
  });

  it("refuses a top-level category", () => { // no slash, nothing to move
    expect(moveSubcategory(draft, "gems", category("skills/gems"))).toEqual({ problem: "gems is not a subcategory." });
  });

  it("refuses a move that also renames", () => { // the last segment must stay the same
    expect(moveSubcategory(draft, "gems/support", category("skills/aux"))).toEqual({
      problem: "skills/aux is not gems/support under another category.",
    });
  });

  it("refuses a target that is a top-level path", () => { // a missing second segment never equals the slug
    expect(moveSubcategory(draft, "gems/support", category("skills"))).toEqual({
      problem: "skills is not gems/support under another category.",
    });
  });

  it("refuses a target that already has a record", () => { // a record alone takes the path
    const withTarget = draftOf([], [category("skills/support")]);

    expect(moveSubcategory(withTarget, "gems/support", category("skills/support"))).toEqual({
      problem: "skills/support already exists.",
    });
  });

  it("refuses a target that has rows but no record", () => { // row c already sits in skills/support
    expect(moveSubcategory(draft, "gems/support", category("skills/support"))).toEqual({
      problem: "skills/support already exists.",
    });
  });

  it("treats moving to the same path as moving onto its own record", () => { // no special case for a no-op move
    expect(moveSubcategory(draft, "gems/support", category("gems/support"))).toEqual({
      problem: "gems/support already exists.",
    });
  });
});

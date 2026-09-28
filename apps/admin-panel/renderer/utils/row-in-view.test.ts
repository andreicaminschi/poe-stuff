import { describe, it, expect } from "@jest/globals";
import { rowInView } from "./row-in-view.ts";
import { ggg } from "../test-helpers.ts";

describe("rowInView", () => {
  describe("the included and excluded tabs", () => {
    it("shows a row that is not excluded under included", () => {
      const shown = rowInView(ggg("a"), "included");

      expect(shown).toBe(true);
    });

    it("hides an excluded row from included", () => {
      const shown = rowInView(ggg("a", { excluded: true }), "included");

      expect(shown).toBe(false);
    });

    it("shows an excluded row under excluded", () => {
      const shown = rowInView(ggg("a", { excluded: true }), "excluded");

      expect(shown).toBe(true);
    });

    it("keeps a quest row under included, since only exclusion moves a row", () => {
      const shown = rowInView(ggg("a", { quest: true }), "included");

      expect(shown).toBe(true); // quest touches only the untouched tab
    });
  });

  describe("the untouched tab", () => {
    it("shows a row nobody has decided on", () => {
      const shown = rowInView(ggg("a"), "untouched");

      expect(shown).toBe(true);
    });

    it("drops a row once it is excluded", () => {
      const shown = rowInView(ggg("a", { excluded: true }), "untouched");

      expect(shown).toBe(false);
    });

    it("drops a row once it is marked a quest item", () => {
      const shown = rowInView(ggg("a", { quest: true }), "untouched");

      expect(shown).toBe(false);
    });

    it("drops a row once it is marked unpriceable", () => {
      const shown = rowInView(ggg("a", { unpriceable: true }), "untouched");

      expect(shown).toBe(false);
    });

    it("drops a row once it has a listing", () => {
      const shown = rowInView(ggg("a", { listing: { name: "a" } }), "untouched");

      expect(shown).toBe(false);
    });

    it("keeps a row whose listing is an empty list", () => {
      const shown = rowInView(ggg("a", { listing: [] }), "untouched");

      expect(shown).toBe(true); // an empty list links nothing
    });

    it("drops a row once one of its variants has a listing", () => {
      const row = ggg("a", { variants: [{ name: "v", conditions: [], listing: { name: "v" } }] });

      const shown = rowInView(row, "untouched");

      expect(shown).toBe(false); // variants count as decisions on the row
    });

    it("drops a row once one of its variants is marked unpriceable", () => {
      const row = ggg("a", { variants: [{ name: "v", conditions: [], unpriceable: true }] });

      const shown = rowInView(row, "untouched");

      expect(shown).toBe(false);
    });

    it("keeps a row whose variants are all undecided", () => {
      const row = ggg("a", { variants: [{ name: "v", conditions: [] }] });

      const shown = rowInView(row, "untouched");

      expect(shown).toBe(true); // having variants is not a decision
    });
  });
});

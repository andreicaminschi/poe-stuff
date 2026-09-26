import { describe, it, expect } from "@jest/globals";
import { rowInView } from "./row-in-view.ts";
import { ggg } from "../test-helpers.ts";

describe("rowInView", () => {
  it("shows a row that is not excluded under included", () => {
    expect(rowInView(ggg("a"), "included")).toBe(true);
  });

  it("shows an excluded row only under excluded", () => {
    expect(rowInView(ggg("a", { excluded: true }), "included")).toBe(false);
    expect(rowInView(ggg("a", { excluded: true }), "excluded")).toBe(true);
  });

  it("shows a row nobody has decided on under untouched", () => {
    expect(rowInView(ggg("a"), "untouched")).toBe(true);
  });

  it("takes a row out of untouched once it is excluded, quest or unpriceable", () => {
    expect(rowInView(ggg("a", { excluded: true }), "untouched")).toBe(false);
    expect(rowInView(ggg("a", { quest: true }), "untouched")).toBe(false);
    expect(rowInView(ggg("a", { unpriceable: true }), "untouched")).toBe(false);
  });

  it("takes a row out of untouched once it or one of its variants is listed", () => {
    expect(rowInView(ggg("a", { listing: { name: "a" } }), "untouched")).toBe(false);
    expect(rowInView(ggg("a", { variants: [{ name: "v", conditions: [], listing: { name: "v" } }] }), "untouched")).toBe(false);
  });

  it("keeps a row untouched when its listing is an empty list", () => {
    expect(rowInView(ggg("a", { listing: [] }), "untouched")).toBe(true);
  });

  it("counts a row touched when a variant is flagged unpriceable", () => {
    expect(rowInView(ggg("a", { variants: [{ name: "v", conditions: [], unpriceable: true }] }), "untouched")).toBe(false);
  });
});

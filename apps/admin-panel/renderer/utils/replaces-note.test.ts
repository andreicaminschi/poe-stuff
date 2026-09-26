import { describe, it, expect } from "@jest/globals";
import { replacesNote } from "./replaces-note.ts";

describe("replacesNote", () => {
  it("says no source has the row when it replaces none", () => {
    expect(replacesNote(0)).toBe("No source has this row.");
  });

  it("uses the singular for one row", () => {
    expect(replacesNote(1)).toBe("Replaces 1 row.");
  });

  it("uses the plural for two rows", () => {
    expect(replacesNote(2)).toBe("Replaces 2 rows.");
  });
});

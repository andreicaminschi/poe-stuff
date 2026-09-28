import { describe, it, expect } from "@jest/globals";
import { replacesNote } from "./replaces-note.ts";

describe("replacesNote", () => {
  it("says no source has the row when it replaces none", () => {
    const note = replacesNote(0);

    expect(note).toBe("No source has this row."); // not "Replaces 0 rows."
  });

  it("uses the singular for one row", () => {
    const note = replacesNote(1);

    expect(note).toBe("Replaces 1 row.");
  });

  it("uses the plural for two rows", () => {
    const note = replacesNote(2);

    expect(note).toBe("Replaces 2 rows."); // first count past the singular
  });
});

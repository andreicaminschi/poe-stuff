import { describe, it, expect } from "@jest/globals";
import { authoredRowProblem } from "./authored-row-problem.ts";

describe("authoredRowProblem", () => {
  const good = { name: "Chaos Orb", baseType: "Chaos Orb", key: "authored/chaos", taken: false, reason: "why" };

  it("accepts a row with a name, base type, free key and reason", () => { // undefined means nothing to fix
    expect(authoredRowProblem(good)).toBeUndefined();
  });

  it("asks for a name when the name has no letters or digits", () => { // judged by its slug, so punctuation alone is empty
    expect(authoredRowProblem({ ...good, name: " ?! " })).toBe("Give it a name.");
  });

  it("asks for a base type when it is only whitespace", () => { // trimmed, unlike the name
    expect(authoredRowProblem({ ...good, baseType: "  " })).toBe("Give it a base type: what a filter writes for it.");
  });

  it("names the key when it is already taken", () => { // the key is shown, not the name
    expect(authoredRowProblem({ ...good, taken: true })).toBe("authored/chaos already exists.");
  });

  it("asks why when the reason is blank", () => { // a single space counts as blank
    expect(authoredRowProblem({ ...good, reason: " " })).toMatch(/^Say why\./);
  });

  it("reports the name before anything else is wrong", () => { // one problem at a time, in form order
    expect(authoredRowProblem({ name: "", baseType: "", key: "k", taken: true, reason: "" })).toBe("Give it a name.");
  });

  it("reports a taken key before a missing reason", () => { // taken is checked third, reason last
    expect(authoredRowProblem({ ...good, taken: true, reason: "" })).toBe("authored/chaos already exists.");
  });
});

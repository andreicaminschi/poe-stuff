import { describe, it, expect } from "@jest/globals";
import { authoredRowProblem } from "./authored-row-problem.ts";

describe("authoredRowProblem", () => {
  const good = { name: "Chaos Orb", baseType: "Chaos Orb", key: "authored/chaos", taken: false, reason: "why" };

  it("accepts a row with a name, base type, free key and reason", () => {
    expect(authoredRowProblem(good)).toBeUndefined();
  });

  it("asks for a name when the name has no letters or digits", () => {
    expect(authoredRowProblem({ ...good, name: " ?! " })).toBe("Give it a name.");
  });

  it("asks for a base type when it is only whitespace", () => {
    expect(authoredRowProblem({ ...good, baseType: "  " })).toBe("Give it a base type: what a filter writes for it.");
  });

  it("names the key when it is already taken", () => {
    expect(authoredRowProblem({ ...good, taken: true })).toBe("authored/chaos already exists.");
  });

  it("asks why when the reason is blank", () => {
    expect(authoredRowProblem({ ...good, reason: " " })).toMatch(/^Say why\./);
  });

  it("reports the name before anything else is wrong", () => {
    expect(authoredRowProblem({ name: "", baseType: "", key: "k", taken: true, reason: "" })).toBe("Give it a name.");
  });
});

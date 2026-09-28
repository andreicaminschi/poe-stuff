import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import { readRejectedBaseTypes } from "./rejected-base-types.ts";

describe("readRejectedBaseTypes", () => {
  it("answers with the names the tracked file is keyed by, not the ids it holds", () => {
    const file = JSON.parse(readFileSync(new URL("./rejected-base-types.json", import.meta.url), "utf8")) as object;

    expect(readRejectedBaseTypes()).toEqual(new Set(Object.keys(file)));
  }); // the file is read relative to the module, not the cwd
});

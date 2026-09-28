import { afterEach, describe, it, expect } from "@jest/globals";
import { optionalEnv, requireEnv } from "./env.ts";

const NAME = "POE_ENV_TEST_VAR";

afterEach(() => {
  delete process.env[NAME];
});

describe("optionalEnv", () => {
  it("returns the value of a variable that is set", () => {
    process.env[NAME] = "x";

    const value = optionalEnv(NAME);

    expect(value).toBe("x");
  });

  it("returns nothing for a variable that is not set", () => {
    const value = optionalEnv(NAME);

    expect(value).toBeUndefined();
  });

  it("treats a variable set to an empty string as not set", () => {
    process.env[NAME] = "";

    const value = optionalEnv(NAME);

    expect(value).toBeUndefined(); // "VAR=" in a .env file
  });

  it("keeps a value of only spaces exactly as it is", () => {
    process.env[NAME] = "  ";

    const value = optionalEnv(NAME);

    expect(value).toBe("  "); // no trimming
  });

  it("sees a variable set after the module was imported", () => {
    process.env[NAME] = "late";

    const value = optionalEnv(NAME);

    expect(value).toBe("late"); // read per call, never cached
  });
});

describe("requireEnv", () => {
  it("returns the value of a variable that is set", () => {
    process.env[NAME] = "x";

    const value = requireEnv(NAME);

    expect(value).toBe("x");
  });

  it("throws a message that names the missing variable and how to supply it", () => {
    const read = () => requireEnv(NAME);

    expect(read).toThrow(`Missing ${NAME}. Run with: node --env-file=apps/<name>/.env <script>`);
  });

  it("throws for a variable set to an empty string, just as for one not set", () => {
    process.env[NAME] = "";

    const read = () => requireEnv(NAME);

    expect(read).toThrow(`Missing ${NAME}.`); // shares optionalEnv's empty rule
  });
});

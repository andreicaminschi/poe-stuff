import { afterEach, describe, it, expect } from "@jest/globals";
import { optionalEnv, requireEnv } from "./env.ts";

const NAME = "POE_ENV_TEST_VAR";

afterEach(() => {
  delete process.env[NAME];
});

describe("optionalEnv", () => {
  it("returns the value when the variable is set", () => {
    process.env[NAME] = "x";

    expect(optionalEnv(NAME)).toBe("x");
  });

  it("returns undefined when the variable is unset", () => {
    expect(optionalEnv(NAME)).toBeUndefined();
  });

  it("treats an empty string as unset", () => {
    process.env[NAME] = "";

    expect(optionalEnv(NAME)).toBeUndefined();
  });

  it("keeps a whitespace-only value as it is", () => {
    process.env[NAME] = "  ";

    expect(optionalEnv(NAME)).toBe("  "); // no trimming
  });

  it("reads the environment at call time, not at import", () => {
    expect(optionalEnv(NAME)).toBeUndefined();

    process.env[NAME] = "late";

    expect(optionalEnv(NAME)).toBe("late");
  });
});

describe("requireEnv", () => {
  it("returns the value when the variable is set", () => {
    process.env[NAME] = "x";

    expect(requireEnv(NAME)).toBe("x");
  });

  it("throws a message naming the missing variable", () => {
    expect(() => requireEnv(NAME)).toThrow(
      `Missing ${NAME}. Run with: node --env-file=apps/<name>/.env <script>`,
    );
  });

  it("throws for an empty string just as for an unset variable", () => {
    process.env[NAME] = "";

    expect(() => requireEnv(NAME)).toThrow(`Missing ${NAME}.`);
  });
});

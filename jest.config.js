// Plain .js, not .ts: jest loads its config before any transform exists, so a .ts
// config would need a separate loader (ts-node) just to bootstrap. Root package.json
// sets "type": "module", so this file is already ESM.

/** @type {import("jest").Config} */
export default {
  testEnvironment: "node",

  // Sources use import.meta.dirname and top-level await, so the transform has to
  // emit real ESM (module.type "es6" below) and jest has to run it as ESM.
  // That combination requires node's --experimental-vm-modules flag — see the
  // "test" script in package.json.
  extensionsToTreatAsEsm: [".ts"],

  roots: ["<rootDir>/packages", "<rootDir>/services"],
  testMatch: ["**/*.test.ts"],

  transform: {
    "^.+\\.ts$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "typescript" },
          target: "esnext",
        },
        module: { type: "es6" },
      },
    ],
  },

  // Relative imports carry a real .ts extension and the file on disk is .ts, so the
  // default resolver finds them without a moduleNameMapper. "ts" leads so a .ts file
  // wins over a stale sibling .js.
  moduleFileExtensions: ["ts", "js", "json", "node"],

  clearMocks: true,
};

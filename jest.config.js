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

  // `packages/` is deprecated POC code and is deliberately absent — same reason as in
  // tsconfig.json. Nothing under it should be built or tested against. `apps` is listed
  // even though nothing there has a test yet: leaving it out is how the first one gets
  // written and silently never runs.
  roots: ["<rootDir>/apps", "<rootDir>/lib", "<rootDir>/services"],
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

import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  { ignores: ["apps/admin-panel/out/**", "apps/admin-panel/release/**", "apps/generator/out/**"] },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,tsx}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.browser },
  },
  { files: ["**/*.js"], languageOptions: { sourceType: "commonjs" } },
  tseslint.configs.recommended,
  stylistic.configs.customize({
    indent: 2,
    quotes: "double",
    semi: true,
    arrowParens: true,
    braceStyle: "1tbs",
    commaDangle: "always-multiline",
  }),

  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { ignoreRestSiblings: true, argsIgnorePattern: "^_" }],
      "@stylistic/multiline-ternary": ["error", "always"],
      "@stylistic/operator-linebreak": ["error", "before", { overrides: { "=": "after" } }],
      "@stylistic/quote-props": ["error", "as-needed"],
    },
  },
]);

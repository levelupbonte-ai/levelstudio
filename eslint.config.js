import tsParser from "@typescript-eslint/parser";
import globals from "globals";

export default [
  { ignores: ["dist/**", "node_modules/**", "public/**", "api/**"] },
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {},
  },
];

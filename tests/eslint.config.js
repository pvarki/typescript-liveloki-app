import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  { ignores: ["node_modules/"] },
  {
    languageOptions: {
      globals: {
        process: "readonly",
        setTimeout: "readonly",
      },
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-expressions": "off",
    },
  },
];

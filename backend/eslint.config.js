import globals from "globals";
import pluginJs from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import eslintPluginUnicorn from "eslint-plugin-unicorn";

/** @type {import('eslint').Linter.Config[]} */
export default [
  { ignores: ["migrations"] },
  { languageOptions: { globals: globals.node } },
  pluginJs.configs.recommended,
  eslintPluginPrettierRecommended,
  eslintPluginUnicorn.configs["flat/recommended"],
  {
    rules: {
      "unicorn/filename-case": "off",
      "unicorn/no-null": "off",
      "unicorn/prefer-node-protocol": "off",
      "unicorn/prefer-number-properties": "off",
      "unicorn/prevent-abbreviations": "off",
    },
  },
];

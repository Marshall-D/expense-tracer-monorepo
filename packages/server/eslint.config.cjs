// packages/server/eslint.config.cjs
/**
 * Minimal ESLint flat config (ESLint v9+) for the server package.
 * Use require(...) for parser/plugin modules (not require.resolve).
 */
module.exports = [
  {
    ignores: ["node_modules/**", "dist/**"],
  },

  // JS files (basic)
  {
    files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
    languageOptions: { ecmaVersion: 2022, sourceType: "module" },
    rules: {
      "no-console": "off",
    },
  },

  // TypeScript files
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      // IMPORTANT: require the parser module (not require.resolve)
      parser: require("@typescript-eslint/parser"),
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        // point at the package's tsconfig:
        project: "./tsconfig.json",
      },
    },
    // register plugin module (object)
    plugins: {
      "@typescript-eslint": require("@typescript-eslint/eslint-plugin"),
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": "off",
    },
  },
];

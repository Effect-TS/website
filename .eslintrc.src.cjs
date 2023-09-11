/* eslint-disable no-undef */
module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
    project: "./tsconfig.src.json"
  },
  settings: {
    "import/parsers": {
      "@typescript-eslint/parser": [".ts", ".tsx"]
    },
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true
      }
    }
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:expect-type/recommended"
  ],
  plugins: ["eslint-plugin-expect-type", "import", "unused-imports"],
  rules: {
    "no-fallthrough": "off",
    "no-irregular-whitespace": "off",
    "object-shorthand": "error",
    "prefer-destructuring": "off",
    "sort-imports": "off",
    "no-unused-vars": "off",
    "prefer-rest-params": "off",
    "prefer-spread": "off",
    "import/first": "error",
    "import/no-cycle": "error",
    "import/newline-after-import": "error",
    "import/no-duplicates": "error",
    "import/no-unresolved": "off",
    "import/order": "off",
    "simple-import-sort/imports": "off",
    "@typescript-eslint/array-type": [
      "warn",
      { default: "generic", readonly: "generic" }
    ],
    "@typescript-eslint/member-delimiter-style": 0,
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/ban-types": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-empty-interface": "off",
    "@typescript-eslint/consistent-type-imports": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "unused-imports/no-unused-imports": "error",
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/camelcase": "off",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/interface-name-prefix": "off",
    "@typescript-eslint/no-array-constructor": "off",
    "@typescript-eslint/no-use-before-define": "off",
    "@typescript-eslint/no-namespace": "off",
    "react-hooks/rules-of-hooks": "off"
  }
}

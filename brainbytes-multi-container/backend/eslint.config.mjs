import js from "@eslint/js";
import globals from "globals";
import json from "@eslint/json";
import { defineConfig } from "eslint/config";

export default defineConfig([
  { ignores: ["node_modules/**", "package-lock.json"] },
  { files: ["**/*.js"], plugins: { js }, extends: ["js/recommended"], languageOptions: { sourceType: "commonjs", globals: { ...globals.node } } },
  { files: ["**/*.mjs"], languageOptions: { sourceType: "module", globals: { ...globals.node } } },
  { files: ["tests/**/*.js"], languageOptions: { globals: {...globals.node, describe: "readonly", test: "readonly", expect: "readonly", beforeAll: "readonly", afterAll: "readonly", afterEach: "readonly", beforeEach: "readonly", jest: "readonly" } } },
  { files: ["**/*.json"], plugins: { json }, language: "json/json", extends: ["json/recommended"] },
]);

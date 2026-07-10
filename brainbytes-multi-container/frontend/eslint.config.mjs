import js from '@eslint/js';
import globals from 'globals';
import pluginReact from 'eslint-plugin-react';
import json from '@eslint/json';
import { defineConfig } from 'eslint/config';

const reactRecommended = pluginReact.configs.flat.recommended;

export default defineConfig([
  {
    ignores: [
      'node_modules/**',
      'package-lock.json',
      'package.json',
      'coverage/**',
      '.next/**',
      'build/**',
    ],
  },
  {
    files: ['**/*.{js,mjs,cjs,jsx}'],
    ...reactRecommended,
    plugins: { ...reactRecommended.plugins, js },
    extends: ['js/recommended'],
    languageOptions: {
      ...reactRecommended.languageOptions,
      globals: {
        ...globals.browser,
        ...globals.jest,
        process: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
      },
    },
    settings: { ...reactRecommended.settings, react: { version: 'detect' } },
    rules: {
      ...reactRecommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },
  { files: ['**/*.json'], plugins: { json }, language: 'json/json', extends: ['json/recommended'] },
]);

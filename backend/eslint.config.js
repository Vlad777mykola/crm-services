import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { microserviceBoundariesConfig } from './eslint.microservice-boundaries.js';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    ...microserviceBoundariesConfig,
    files: ['src/**/*.ts'],
  },
);

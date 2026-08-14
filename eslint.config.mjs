import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { createArchitectureConfig } from './tools/eslint-config-crm/architecture.mjs';

/**
 * Root architecture ESLint config.
 * Service workspaces also spread createArchitectureConfig() locally for editor feedback.
 */
export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', 'frontend/**', 'scripts/fill_dump_db/**'],
  },
  {
    files: ['services/**/*.ts', 'tools/**/*.mjs'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  ...createArchitectureConfig({ scope: 'root' }),
);

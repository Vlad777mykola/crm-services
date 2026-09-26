import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { fsdBoundariesConfig } from './eslint.fsd-boundaries.js';

export default tseslint.config(
	{ ignores: ['dist'] },
	{
		extends: [js.configs.recommended, ...tseslint.configs.recommended],
		files: ['**/*.{ts,tsx}'],
		languageOptions: {
			ecmaVersion: 2022,
			globals: globals.browser,
			parserOptions: {
				tsconfigRootDir: import.meta.dirname,
			},
		},
		plugins: {
			'react-hooks': reactHooks,
			'react-refresh': reactRefresh,
		},
		rules: {
			...reactHooks.configs.recommended.rules,
			'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
		},
	},
	{
		...fsdBoundariesConfig,
		files: ['src/**/*.{ts,tsx}'],
	},
	{
		files: ['src/**/*.{ts,tsx}'],
		ignores: ['src/shared/ui/**/*.{ts,tsx}', 'src/shared/form/**/*.{ts,tsx}'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{
							name: 'antd',
							message: 'Import UI components from @/shared/ui. Direct antd imports are allowed only inside shared/ui.',
						},
						{
							name: 'react-hook-form',
							message: 'Import form primitives from @/shared/form. Direct react-hook-form imports are allowed only inside shared/form.',
						},
						{
							name: '@hookform/resolvers/zod',
							message: 'Pass schemas to useAppForm from @/shared/form. Resolver setup belongs inside shared/form.',
						},
					],
					patterns: [
						{
							group: ['antd/*'],
							message: 'Import UI assets/components through @/shared/ui. Direct antd imports are allowed only inside shared/ui.',
						},
					],
				},
			],
		},
	},
	{
		files: ['src/shared/form/**/*.{ts,tsx}'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{
							name: 'antd',
							message: 'Import UI components from @/shared/ui. Direct antd imports are allowed only inside shared/ui.',
						},
					],
					patterns: [
						{
							group: ['antd/*'],
							message: 'Import UI assets/components through @/shared/ui. Direct antd imports are allowed only inside shared/ui.',
						},
					],
				},
			],
		},
	},
	{
		files: ['src/shared/ui/**/*.{ts,tsx}'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{
							name: 'react-hook-form',
							message: 'Import form primitives from @/shared/form. Direct react-hook-form imports are allowed only inside shared/form.',
						},
						{
							name: '@hookform/resolvers/zod',
							message: 'Pass schemas to useAppForm from @/shared/form. Resolver setup belongs inside shared/form.',
						},
					],
				},
			],
		},
	},
);

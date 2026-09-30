// @ts-check
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', '**/.tamagui/**'] },

  js.configs.recommended,
  // Type-aware rules (they read each package's tsconfig): catches floating
  // promises, misused async callbacks, unsafe `any` flows, etc.
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // `void promise` is the explicit "fire and forget" marker.
      '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: true }],
      // Implementing an async interface (e.g. TokenStorage over sync localStorage)
      // legitimately has no `await`; `async` still turns throws into rejections.
      '@typescript-eslint/require-await': 'off',
      // Allow async handlers on JSX props like onPress={async () => ...}.
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
    },
  },

  // Plain JS config files aren't part of any tsconfig.
  { files: ['**/*.js', '**/*.mjs'], ...tseslint.configs.disableTypeChecked },

  // API (Node)
  {
    files: ['apps/api/**/*.ts'],
    languageOptions: { globals: globals.node },
    rules: {
      // Nest modules are decorated empty classes by design.
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
  {
    // Supertest response bodies are `any`; asserting on them is the point of the test.
    files: ['apps/api/test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },

  // React (web + shared packages that React Native will reuse)
  {
    files: ['apps/web/**/*.{ts,tsx}', 'packages/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: { globals: globals.browser },
    rules: reactHooks.configs.flat['recommended-latest'].rules,
  },
);

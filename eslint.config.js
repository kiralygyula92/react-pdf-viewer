import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import jsxA11y from 'eslint-plugin-jsx-a11y-x';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['**/dist/', '**/coverage/', '**/playwright-report/', '**/test-results/']),
  js.configs.recommended,
  tseslint.configs.strict,
  reactHooks.configs.flat.recommended,
  jsxA11y.configs.strict,
  {
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      // Scrollable regions must be keyboard-reachable (axe scrollable-region-focusable).
      'jsx-a11y-x/no-noninteractive-tabindex': ['error', { roles: ['tabpanel', 'region'] }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
  {
    // Tooling and config files run in Node.
    files: [
      '**/*.config.{js,mjs,ts}',
      '**/scripts/**',
      '**/e2e/**',
      'packages/ppds-kit/src/**/*.{ts,mjs}',
      'apps/site/src/lib/**',
    ],
    languageOptions: {
      globals: globals.node,
    },
  },
]);

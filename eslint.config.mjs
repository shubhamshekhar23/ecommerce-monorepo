import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['eslint.config.mjs', 'node_modules', 'dist', 'coverage', 'apps', 'libs'],
  },
  eslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          decorators: true,
        },
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        beforeEach: 'readonly',
        expect: 'readonly',
        jest: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // Coding standards - File & Function size limits
      'max-lines': ['warn', { max: 200, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 20, skipBlankLines: true, skipComments: true }],
      'max-params': ['warn', 5],
      'max-depth': ['warn', 3],
      complexity: ['warn', 10],

      // Code quality
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-var': 'error',
      'no-unused-vars': 'off',
      'prefer-const': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      // Prettier
      'prettier/prettier': ['warn', { endOfLine: 'auto' }],
    },
  },
  {
    files: ['test/**/*.ts', '**/*.spec.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          decorators: true,
        },
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        expect: 'readonly',
        jest: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // More lenient rules for tests
      'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
      'max-params': ['warn', 5],
      'max-depth': 'off',
      complexity: 'off',
      'no-console': 'off',
      'no-debugger': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      'prettier/prettier': ['warn', { endOfLine: 'auto' }],
    },
  },
];

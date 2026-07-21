import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '.claude/**',
      '**/*.d.ts',
      '**/*.config.js',
      '**/*.config.mjs',
      '**/*.config.ts',
      '**/routeTree.gen.*',
      '**/*.cjs',
      '**/*.mjs',
      'coverage/**',
      '.turbo/**',
    ],
  },
  {
    files: ['packages/config/eslint-config/**/*.js'],
    languageOptions: {
      globals: {
        module: 'readonly',
        exports: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-namespace': 'off',
    },
  },
);

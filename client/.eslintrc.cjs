module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: { jsx: true },
    project: './tsconfig.app.json',
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'react-hooks', 'react-refresh'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  env: {
    browser: true,
    es2022: true,
  },
  ignorePatterns: ['dist', 'node_modules', 'vite.config.ts', 'vitest.config.ts'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
  },
};

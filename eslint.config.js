// -- ESLint cho API và hai web --
const js = require('@eslint/js');
const globals = require('globals');
const reactHooks = require('eslint-plugin-react-hooks');

const unused = ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^(_|[A-Z])', caughtErrors: 'none' }];

module.exports = [
  { ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', 'server/.data/**'] },
  js.configs.recommended,
  { rules: { 'no-empty': ['error', { allowEmptyCatch: true }] } },
  {
    files: ['server/**/*.js', 'eslint.config.js'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'commonjs', globals: globals.node },
    rules: { 'no-unused-vars': unused }
  },
  {
    files: ['client-*/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } }
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-unused-vars': unused
    }
  },
  {
    files: ['client-*/vite.config.js'],
    languageOptions: { globals: { ...globals.node } }
  }
];

// One lint setup for the API and both websites: `npm run lint` at the project root.
const js = require('@eslint/js');
const globals = require('globals');
const reactHooks = require('eslint-plugin-react-hooks');

// Components used only in JSX look unused to the core rule, so names starting
// with a capital letter (components, icons) are not reported.
const unused = ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^(_|[A-Z])', caughtErrors: 'none' }];

module.exports = [
  { ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', 'server/uploads/**', 'server/.data/**'] },
  js.configs.recommended,
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
    files: ['client-*/vite.config.js', 'client-*/**/*.test.{js,jsx}'],
    languageOptions: { globals: { ...globals.node } }
  }
];

import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Override default ignores of eslint-config-next.
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),

  // === Project-specific style rules ===
  {
    rules: {
      // Zakáže `function foo() {}` a vynutí `const foo = ...`
      'func-style': [
        'error',
        'expression',
        {
          allowArrowFunctions: true,
        },
      ],

      // Preferuje arrow functions místo `function () {}`
      'prefer-arrow-callback': [
        'error',
        {
          allowNamedFunctions: false,
          allowUnboundThis: true,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
]);

export default eslintConfig;

import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const config = [
  ...nextVitals,
  ...nextTs,
  { ignores: ['.next/**', 'drizzle/**', 'node_modules/**', 'next-env.d.ts'] },
  {
    // src/domain must stay pure: no IO, no framework, no ORM
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['@/server/*', 'next', 'next/*', 'drizzle-orm', 'drizzle-orm/*', 'postgres'], message: 'src/domain must be pure (no IO / framework / ORM imports).' },
        ],
      }],
    },
  },
];

export default config;

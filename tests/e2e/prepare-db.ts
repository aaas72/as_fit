import { execSync } from 'node:child_process';

// Recreates the asfit_test database, then migrates and seeds it. Runs before the E2E web server starts.
const url = process.env.DATABASE_URL ?? '';
const dbName = url ? new URL(url).pathname.slice(1) : '';
if (!dbName.endsWith('_test')) throw new Error(`Refusing to reset non-test database "${dbName}"`);

const psql = (sql: string) => execSync(`docker exec asfit-db psql -U asfit -d postgres -v ON_ERROR_STOP=1 -c "${sql}"`, { stdio: 'pipe' });
psql(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`);
psql(`CREATE DATABASE ${dbName}`);
execSync('pnpm exec drizzle-kit migrate', { stdio: 'pipe' });
execSync('pnpm exec tsx src/server/db/seed.ts', { stdio: 'inherit' });

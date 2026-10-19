import { defineConfig } from 'drizzle-kit';

// drizzle-kit does not read .env by itself; Next.js does.
try {
  process.loadEnvFile();
} catch {
  // no .env file: rely on the shell environment
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL! },
  strict: true,
  verbose: true,
});

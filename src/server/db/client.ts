import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set (copy .env.example to .env)');

// Reuse one pool across Next.js dev hot reloads
const globalForDb = globalThis as unknown as { asfitSql?: postgres.Sql };
const client = globalForDb.asfitSql ?? postgres(url, { max: 10 });
if (process.env.NODE_ENV !== 'production') globalForDb.asfitSql = client;

export const db = drizzle(client, { schema });
export type Db = typeof db;

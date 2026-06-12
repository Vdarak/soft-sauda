/**
 * Database Connection
 * 
 * Uses postgres-js with connection pooling configured for Vercel serverless.
 * The drizzle ORM instance is exported for use in all API routes.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres';

const globalForDb = globalThis as unknown as {
  postgresClient: any;
};

const client = globalForDb.postgresClient || postgres(connectionString, {
  max: 15,            // Slightly higher pool size to accommodate concurrent queries
  idle_timeout: 120,  // Keep connections alive for 120s
  connect_timeout: 10,
});

if (process.env.NODE_ENV !== 'production') {
  globalForDb.postgresClient = client;
}

export const db = drizzle(client, { schema });


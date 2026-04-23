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

const client = postgres(connectionString, {
  max: 5,            // Limit pool size for serverless
  idle_timeout: 20,  // Close idle connections after 20s
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });

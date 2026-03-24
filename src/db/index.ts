import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

const client = createClient({
  url: process.env.DATABASE_URL || 'file:./softsauda.db',
});

// Disable prefetch/server mode since we are directly querying a local file
export const db = drizzle(client, { schema });

/**
 * POST /api/auth/login
 * 
 * Accepts { username, password } and returns a JWT token.
 * Credentials are checked against environment variables.
 * 
 * After a successful login, fires a background cache warmup so
 * all data is pre-loaded before the user navigates anywhere.
 */

import { NextRequest } from 'next/server';
import { ok, badRequest, unauthorized, createToken, parseBody } from '@/lib/api-helpers';
import { warmCache } from '@/lib/warmup';

interface LoginBody {
  username: string;
  password: string;
}

export async function POST(req: NextRequest) {
  const body = await parseBody<LoginBody>(req);
  if (!body || !body.username || !body.password) {
    return badRequest('Username and password are required');
  }

  const validUsername = process.env.AUTH_USERNAME || 'admin';
  const validPassword = process.env.AUTH_PASSWORD || 'admin';

  if (body.username !== validUsername || body.password !== validPassword) {
    return unauthorized('Invalid credentials');
  }

  const token = await createToken(body.username);

  // Fire-and-forget: pre-cache all data while user sees the welcome toast
  warmCache().then((r) => {
    console.log(`[login] Background warmup done — warmed: ${r.warmed.length}, skipped: ${r.skipped.length}`);
  }).catch((err) => {
    console.error('[login] Background warmup failed:', err);
  });

  return ok({
    token,
    username: body.username,
    expiresIn: parseInt(process.env.AUTH_SESSION_MAX_AGE_SECONDS || '86400', 10),
  });
}

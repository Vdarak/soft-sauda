/**
 * API Route Helpers
 * 
 * Provides:
 * - Standardized JSON responses (ok, created, error, notFound)
 * - JWT authentication check for protected routes
 * - Request body parsing helper
 */

import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_JWT_SECRET || 'soft-sauda-default-secret-change-me'
);
const SESSION_MAX_AGE = parseInt(process.env.AUTH_SESSION_MAX_AGE_SECONDS || '86400', 10);

// ── Response Helpers ──

/** 200 OK with JSON body */
export function ok(data: unknown) {
  return NextResponse.json(data, { status: 200 });
}

/** 201 Created with JSON body */
export function created(data: unknown) {
  return NextResponse.json(data, { status: 201 });
}

/** 400 Bad Request */
export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

/** 401 Unauthorized */
export function unauthorized(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

/** 404 Not Found */
export function notFound(message = 'Not found') {
  return NextResponse.json({ error: message }, { status: 404 });
}

/** 500 Internal Server Error */
export function serverError(message = 'Internal server error') {
  return NextResponse.json({ error: message }, { status: 500 });
}

// ── Auth Helpers ──

/** Create a signed JWT token for a given username */
export async function createToken(username: string): Promise<string> {
  return new SignJWT({ sub: username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(JWT_SECRET);
}

/** Verify a JWT token. Returns payload or null if invalid/expired. */
export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

/** 
 * Extract and verify the auth token from request headers.
 * Expects: Authorization: Bearer <token>
 * Returns the payload if valid, or null.
 */
export async function authenticateRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  return verifyToken(token);
}

// ── Body Parsing ──

/** Safely parse JSON body from a request */
export async function parseBody<T = Record<string, unknown>>(req: NextRequest): Promise<T | null> {
  try {
    return await req.json() as T;
  } catch {
    return null;
  }
}

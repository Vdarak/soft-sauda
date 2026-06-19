/**
 * Marketplace catch-all — serves the public marketplace shell for /market
 * and any sub-path. More specific than the root [[...slug]] catch-all, so it
 * always wins for /market/*.
 *
 * The marketplace SPA bundle (own router, own mkt_token auth) is added in M3.
 */

import { MARKET_SHELL } from '@/lib/shells';

export async function GET() {
  return new Response(MARKET_SHELL, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}

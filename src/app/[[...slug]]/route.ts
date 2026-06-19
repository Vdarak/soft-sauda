/**
 * Root catch-all — serves the correct HTML shell based on the path.
 *
 * Next.js resolves more specific segments first, so /api/* and /market/*
 * are handled by their own routes before this catch-all runs.
 *
 *   /  /about  /contact   -> LANDING_SHELL  (public editorial site)
 *   everything else        -> ERP_SHELL     (staff app; root paths unchanged)
 *
 * The ERP keeps all of its existing root paths (/parties, /bills, /login, ...).
 * Only the ERP home moved from `/` to `/dashboard`, because `/` now serves the
 * public landing page.
 */

import { ERP_SHELL, LANDING_SHELL } from '@/lib/shells';

// Public landing routes. Anything not listed here falls through to the ERP shell.
const LANDING_PATHS = new Set(['about', 'contact']);

function html(body: string) {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  const isLanding =
    !slug || slug.length === 0 || (slug.length === 1 && LANDING_PATHS.has(slug[0]));
  return html(isLanding ? LANDING_SHELL : ERP_SHELL);
}

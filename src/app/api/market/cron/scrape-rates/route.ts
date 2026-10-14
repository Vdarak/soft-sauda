/**
 * Cron-triggered API route: Scrapes live pulses market rates and stores them.
 * 
 * Can be called by:
 * - System crontab / launchd
 * - Manual HTTP trigger from admin panel
 * - Vercel Cron (if deployed)
 *
 * Security: Checks Authorization header against CRON_SECRET env var.
 *           If CRON_SECRET is not set, allows all requests (dev mode).
 */
import { NextRequest, NextResponse } from 'next/server';
import { scrapeCommoditiesControl, normalizeAndSaveRates } from '@/lib/rate-scraper';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // Allow up to 30s for scraping

export async function GET(req: NextRequest) {
  // Security check
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const startTime = Date.now();

  try {
    // 1. Scrape rates from sources
    const rawRates = await scrapeCommoditiesControl();

    // 2. Normalize and save with auto-approve
    const saved = await normalizeAndSaveRates(rawRates, true);

    const elapsed = Date.now() - startTime;

    // 3. Build summary
    const summary = saved.map(r => ({
      commodity: r.commodity_name,
      variety: r.variety,
      location: r.location_name,
      range: `Rs. ${r.min_price} - ${r.max_price}`,
      status: r.status,
    }));

    console.log(`[CRON] Scrape completed: ${saved.length} rates in ${elapsed}ms`);

    return NextResponse.json({
      success: true,
      scraped: rawRates.length,
      saved: saved.length,
      elapsed_ms: elapsed,
      timestamp: new Date().toISOString(),
      summary,
    });
  } catch (error: any) {
    console.error('[CRON] Scrape failed:', error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

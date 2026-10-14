#!/bin/sh
# ─────────────────────────────────────────────────────────────
# Docker Cron Entrypoint for GCC Rates Scraper
# Runs the scraper on a configurable cron schedule
# Default: 8 AM, 12 PM, 4 PM, 8 PM IST (2:30, 6:30, 10:30, 14:30 UTC)
# ─────────────────────────────────────────────────────────────

set -e

# Default cron schedule (IST = UTC+5:30)
# 8:00 AM IST  = 2:30 AM UTC
# 12:00 PM IST = 6:30 AM UTC
# 4:00 PM IST  = 10:30 AM UTC
# 8:00 PM IST  = 2:30 PM UTC
CRON_SCHEDULE="${SCRAPER_CRON_SCHEDULE:-30 2,6,10,14 * * *}"

echo "═══════════════════════════════════════════════════════════════"
echo "  GCC RATES SCRAPER CRON WORKER"
echo "═══════════════════════════════════════════════════════════════"
echo "  Schedule : $CRON_SCHEDULE"
echo "  Timezone : UTC (IST = UTC+5:30)"
echo "  Database : ${DATABASE_URL:-not set}"
echo "═══════════════════════════════════════════════════════════════"

# Run once immediately on container start
echo "[$(date '+%Y-%m-%d %H:%M:%S UTC')] Running initial scrape on startup..."
cd /app
npx tsx scripts/scrape-rates.ts --auto-approve || echo "Initial scrape failed (may be expected on first boot)"

# Write environment variables to a file so cron can access them
printenv | grep -E '^(DATABASE_URL|NODE_ENV|GEMINI_API_KEY|CRON_SECRET|POSTGRES_)' > /app/.env.cron 2>/dev/null || true

# Create the cron job
CRON_CMD="cd /app && export \$(cat /app/.env.cron | xargs) && /usr/local/bin/npx tsx scripts/scrape-rates.ts --auto-approve >> /proc/1/fd/1 2>> /proc/1/fd/2"

echo "$CRON_SCHEDULE $CRON_CMD" > /etc/crontabs/root

echo "[$(date '+%Y-%m-%d %H:%M:%S UTC')] Cron installed. Starting crond..."

# Start cron in the foreground
exec crond -f -l 2

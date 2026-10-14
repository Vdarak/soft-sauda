#!/bin/bash
# ─────────────────────────────────────────────────────────────
# GCC Rates Scraper Cron Runner
# Runs 4x daily at 8 AM, 12 PM, 4 PM, 8 PM IST
# ─────────────────────────────────────────────────────────────

set -e

PROJECT_DIR="/Users/vedantsmacmini/Desktop/Soft Sauda/Debug/soft-sauda-web"
LOG_FILE="$PROJECT_DIR/logs/scrape-rates.log"
NODE_DIR="/Users/vedantsmacmini/.local/share/fnm/node-versions/v24.12.0/installation/bin"

# Ensure log directory exists
mkdir -p "$PROJECT_DIR/logs"

# Add node to PATH
export PATH="$NODE_DIR:$PATH"

# Timestamp
echo "" >> "$LOG_FILE"
echo "═══════════════════════════════════════════════════════════════" >> "$LOG_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S IST')] CRON: Starting rate scrape" >> "$LOG_FILE"
echo "═══════════════════════════════════════════════════════════════" >> "$LOG_FILE"

cd "$PROJECT_DIR"

# Run the scraper
npx tsx scripts/scrape-rates.ts --auto-approve >> "$LOG_FILE" 2>&1
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S IST')] CRON: Scrape completed successfully" >> "$LOG_FILE"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S IST')] CRON: Scrape FAILED with exit code $EXIT_CODE" >> "$LOG_FILE"
fi

# Keep log file from growing too large (keep last 2000 lines)
if [ $(wc -l < "$LOG_FILE") -gt 2000 ]; then
  tail -1000 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
fi

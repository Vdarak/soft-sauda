import { scrapeCommoditiesControl, normalizeAndSaveRates } from '../src/lib/rate-scraper';

async function main() {
  const autoApprove = process.argv.includes('--auto-approve') || true;
  console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════');
  console.log('\x1b[1m\x1b[32m%s\x1b[0m', '  COMMODITIES RATE INGESTION & NORMALIZATION WORKER');
  console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════');
  console.log(`  Source       : commoditiescontrol.com`);
  console.log(`  Target Date  : ${new Date().toISOString().split('T')[0]}`);
  console.log(`  Auto-Approve : ${autoApprove ? 'YES (Staged directly for Chatbot & Broadcast)' : 'NO (Pending Dad Approval)'}`);
  console.log('───────────────────────────────────────────────────────────────');

  try {
    console.log('  Fetching live pulses market rates...');
    const rawRates = await scrapeCommoditiesControl();
    console.log(`  Scraped ${rawRates.length} pulse spot quotes.`);

    console.log('  Normalizing and storing into daily_market_rates...');
    const saved = await normalizeAndSaveRates(rawRates, autoApprove);

    console.log('\x1b[32m%s\x1b[0m', `  Successfully stored ${saved.length} rates in PostgreSQL:`);
    console.log('');
    for (const r of saved) {
      console.log(`    - ${r.commodity_name.padEnd(8)} | ${r.variety.padEnd(25)} | ${r.location_name.padEnd(10)} | Rs. ${r.min_price} - ${r.max_price} / ${r.price_unit} [${r.status}]`);
    }
    console.log('');
    console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════');
    process.exit(0);
  } catch (err: any) {
    console.error('\x1b[31m%s\x1b[0m', '  Scraper execution failed: ' + err.message);
    process.exit(1);
  }
}

main();

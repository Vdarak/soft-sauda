import { NextResponse } from 'next/server';
import postgres from 'postgres';

const DB_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres';
const sql = postgres(DB_URL);

export async function GET() {
  try {
    const rates = await sql`
      SELECT 
        id, rate_date, session, commodity_name, variety,
        location_name, min_price, max_price, modal_price,
        price_unit, delivery_condition, trend, remarks, updated_at
      FROM daily_market_rates
      WHERE status = 'APPROVED'
        AND rate_date = (SELECT MAX(rate_date) FROM daily_market_rates WHERE status = 'APPROVED')
      ORDER BY commodity_name ASC, location_name ASC
    `;

    return NextResponse.json({
      success: true,
      count: rates.length,
      rates,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

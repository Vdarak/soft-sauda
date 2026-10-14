import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';

const DB_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres';
const sql = postgres(DB_URL);

interface QueryRequest {
  query: string;
  sessionId?: string;
  visitorName?: string;
  visitorPhone?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: QueryRequest = await req.json();
    const userQuery = (body.query || '').trim();
    const sessionId = body.sessionId || `anon-${Date.now()}`;
    const visitorName = body.visitorName || null;
    const visitorPhone = body.visitorPhone || null;

    if (!userQuery) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // 1. Fetch latest approved daily rates
    const latestRates = await sql`
      SELECT 
        id, rate_date, session, commodity_name, variety,
        location_name, min_price, max_price, modal_price,
        price_unit, delivery_condition, trend, remarks, updated_at
      FROM daily_market_rates
      WHERE status = 'APPROVED'
        AND rate_date = (SELECT MAX(rate_date) FROM daily_market_rates WHERE status = 'APPROVED')
      ORDER BY rate_date DESC, commodity_name ASC, min_price DESC
      LIMIT 50
    `;

    // 2. Identify mentioned commodities and locations
    const qLower = userQuery.toLowerCase();
    const isHinglish = /bhav|kitna|kya|batao|aaj|chal|raha|daal|chahiye|sauda|karo/i.test(qLower);

    const targetCommodities = ['toor', 'chana', 'moong', 'urad', 'masoor', 'peas'].filter(c => {
      if (c === 'toor') return qLower.includes('toor') || qLower.includes('tur') || qLower.includes('arhar');
      if (c === 'peas') return qLower.includes('peas') || qLower.includes('matar') || qLower.includes('vatana');
      return qLower.includes(c);
    });

    const targetLocations = ['akola', 'latur', 'mumbai', 'gulbarga', 'jalgaon', 'delhi', 'jaipur', 'chennai', 'kanpur'].filter(l => 
      qLower.includes(l)
    );

    // Filter matching rates
    let matchedRates = latestRates.filter(r => {
      const commMatch = targetCommodities.length === 0 || targetCommodities.some(c => {
        if (c === 'toor') return r.commodity_name.toLowerCase().includes('toor') || r.commodity_name.toLowerCase().includes('tur');
        if (c === 'peas') return r.commodity_name.toLowerCase().includes('peas') || r.commodity_name.toLowerCase().includes('matar');
        return r.commodity_name.toLowerCase().includes(c);
      });

      const locMatch = targetLocations.length === 0 || targetLocations.some(l => 
        r.location_name.toLowerCase().includes(l)
      );

      return commMatch && locMatch;
    });

    // If query was broad or generic (e.g. "what are today's rates?"), show key pulse benchmarks
    if (matchedRates.length === 0 && targetCommodities.length === 0 && targetLocations.length === 0) {
      matchedRates = latestRates.slice(0, 8);
    }

    // Check for escalation intent (user wants to buy/sell or quotes large volume)
    const isEscalation = /buy|sell|purchase|order|quintal|ton|bilty|sauda|contact|call me|book/i.test(qLower) || 
                         /\b\d{3,5}\b/.test(qLower);

    // 3. Generate Answer
    let responseText = '';

    // If GEMINI_API_KEY is available, we can use Gemini for natural synthesis
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const ratesContext = latestRates.map(r => 
          `- ${r.commodity_name} (${r.variety}) @ ${r.location_name}: Rs. ${r.min_price} - ${r.max_price} / ${r.price_unit} (${r.delivery_condition}, Trend: ${r.trend})`
        ).join('\n');

        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are the GCC (Ganesh Canvassing Company) Agri Rates Assistant for Indian pulses.
You provide accurate daily mandi rates for Toor, Moong, Urad, Chana, etc.
Rules:
1. ONLY quote rates from the approved market rates list below. Never guess or hallucinate prices.
2. If the user asks in Hindi/Hinglish, reply in polite conversational Hinglish. If in English, reply in English.
3. Be crisp, professional, and highlight mandi, variety, and delivery terms.
4. If a rate is not in the list, state that today's quote is pending confirmation from the broker.

APPROVED RATES FOR TODAY:
${ratesContext}

USER QUERY:
${userQuery}`
              }]
            }]
          })
        });

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const generated = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (generated) responseText = generated;
        }
      } catch (err: any) {
        console.warn('Gemini API call failed, falling back to structured engine:', err.message);
      }
    }

    // Built-in intelligent conversational formatter (if Gemini not active or failed)
    if (!responseText) {
      if (/hello|hi|namaste|pranam|hey/i.test(qLower) && qLower.length < 15) {
        responseText = isHinglish
          ? 'Namaste! Main Ganesh Canvassing ka Agri Rates Assistant hoon. Aap Toor, Moong, Urad, Chana ya kisi specific mandi (Akola, Latur, Mumbai, etc.) ka live bhav pooch sakte hain.'
          : 'Hello! I am the Ganesh Canvassing Rates Assistant. You can ask me for today\'s spot mandi and port rates for Toor, Moong, Urad, Chana, or compare specific locations (Akola, Latur, Mumbai port).';
      } else if (matchedRates.length > 0) {
        if (isHinglish) {
          const rateLines = matchedRates.map(r => 
            `* ${r.commodity_name} - ${r.variety} (${r.location_name}): Rs. ${Number(r.min_price).toLocaleString()} - ${Number(r.max_price).toLocaleString()} / ${r.price_unit} [${r.delivery_condition}]`
          ).join('\n');

          responseText = `Aaj ke verified market rates:\n\n${rateLines}\n\nYeh rates subah ke spot quotes hain. Kya aapko kisi specific variety ya mandi ka aur detail chahiye?`;
        } else {
          const rateLines = matchedRates.map(r => 
            `* ${r.commodity_name} - ${r.variety} (${r.location_name}): Rs. ${Number(r.min_price).toLocaleString()} - ${Number(r.max_price).toLocaleString()} per ${r.price_unit} [${r.delivery_condition}] (Trend: ${r.trend})`
          ).join('\n');

          responseText = `Here are the approved spot rates for today:\n\n${rateLines}\n\nAll rates are quoted per quintal. Would you like delivery specifications or to connect with our broker?`;
        }
      } else {
        responseText = isHinglish
          ? `Maaf kijiye, is mandi ya commodity ka aaj ka verified broker rate abhi confirm nahi hua hai. Agar aapko quote chahiye, to aap apna contact number share karein, hamare broker turant connect karenge.`
          : `We do not have a confirmed broker quote for this specific mandi or variety today. If you would like a custom quote, please share your contact details and our trading desk will get back to you.`;
      }
    }

    // 4. Record inquiry in rate_inquiries table for audit & Dad's review
    try {
      await sql`
        INSERT INTO rate_inquiries (
          session_id, visitor_name, visitor_phone, query_text,
          response_text, matched_rate_ids, is_escalated, created_at
        ) VALUES (
          ${sessionId}, ${visitorName}, ${visitorPhone}, ${userQuery},
          ${responseText}, ${JSON.stringify(matchedRates.map(r => r.id))},
          ${isEscalation}, NOW()
        )
      `;
    } catch (dbErr: any) {
      console.error('Failed to log rate inquiry:', dbErr.message);
    }

    return NextResponse.json({
      success: true,
      response: responseText,
      matchedRates,
      isEscalated: isEscalation,
      totalApprovedRates: latestRates.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Rates assistant query error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

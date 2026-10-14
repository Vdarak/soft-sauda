import http from 'http';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import postgres from 'postgres';

const BACKEND_PORT = parseInt(process.env.BACKEND_PORT || '8001', 10);
const TARGET_PORT = parseInt(process.env.FRONTEND_PORT || '3001', 10);
const DB_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres';

const sql = postgres(DB_URL);

async function checkDatabase() {
  try {
    const [dbInfo] = await sql`SELECT current_database() as db_name, version() as pg_version`;
    const [partyCount] = await sql`SELECT count(*) as count FROM parties`;
    const [contractCount] = await sql`SELECT count(*) as count FROM contracts`;
    const [commodityCount] = await sql`SELECT count(*) as count FROM commodities`;
    return {
      connected: true,
      database: dbInfo.db_name,
      version: dbInfo.pg_version.split(' ')[1],
      parties: Number(partyCount.count),
      contracts: Number(contractCount.count),
      commodities: Number(commodityCount.count),
    };
  } catch (err: any) {
    return {
      connected: false,
      error: err.message,
    };
  }
}

async function start() {
  console.clear();
  console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════');
  console.log('\x1b[1m\x1b[32m%s\x1b[0m', '  SOFT SAUDA BACKEND & DATABASE SERVICE');
  console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════');
  console.log(`  Backend Port : \x1b[1m\x1b[33m${BACKEND_PORT}\x1b[0m`);
  console.log(`  Frontend App : \x1b[1m\x1b[34mhttp://localhost:${TARGET_PORT}\x1b[0m`);
  console.log(`  Database URL : \x1b[90m${DB_URL.replace(/:[^:@]+@/, ':****@')}\x1b[0m`);

  const dbStatus = await checkDatabase();
  if (dbStatus.connected) {
    console.log('\x1b[32m%s\x1b[0m', `  Database     : CONNECTED (PostgreSQL ${dbStatus.version})`);
    console.log(`  Tables Loaded: \x1b[1m${dbStatus.parties.toLocaleString()}\x1b[0m parties, \x1b[1m${dbStatus.contracts.toLocaleString()}\x1b[0m contracts, \x1b[1m${dbStatus.commodities.toLocaleString()}\x1b[0m commodities`);
  } else {
    console.log('\x1b[31m%s\x1b[0m', `  Database     : FAILED (${dbStatus.error})`);
  }
  console.log('\x1b[36m%s\x1b[0m', '───────────────────────────────────────────────────────────────');
  console.log(`  Listening at : \x1b[1m\x1b[32mhttp://localhost:${BACKEND_PORT}\x1b[0m`);
  console.log(`  API Status   : \x1b[1m\x1b[32mhttp://localhost:${BACKEND_PORT}/status\x1b[0m`);
  console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════');
  console.log('  Live Request Stream:\n');

  const server = http.createServer(async (req, res) => {
    const t0 = Date.now();
    const url = req.url || '/';

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Direct /status or /health endpoint
    if (url === '/status' || url === '/health' || url === '/') {
      const liveDb = await checkDatabase();
      const payload = {
        service: 'soft-sauda-backend',
        status: liveDb.connected ? 'healthy' : 'degraded',
        port: BACKEND_PORT,
        database: liveDb,
        targetApp: `http://localhost:${TARGET_PORT}`,
        timestamp: new Date().toISOString(),
      };

      if (url === '/' && !req.headers['accept']?.includes('application/json')) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Soft Sauda Backend</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; }
              .card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 1.5rem; max-width: 600px; margin: 0 auto; }
              h1 { font-size: 1.25rem; margin-top: 0; color: #38bdf8; }
              .badge { display: inline-block; padding: 0.25rem 0.6rem; border-radius: 9999px; background: #166534; color: #86efac; font-size: 0.8rem; font-weight: 600; }
              pre { background: #090d16; padding: 1rem; border-radius: 6px; overflow-x: auto; font-size: 0.85rem; color: #a5f3fc; }
              a { color: #38bdf8; text-decoration: none; }
              a:hover { text-decoration: underline; }
            </style>
          </head>
          <body>
            <div class="card">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <h1>Soft Sauda Backend Service</h1>
                <span class="badge">ACTIVE (Port ${BACKEND_PORT})</span>
              </div>
              <p style="color:#94a3b8; font-size:0.9rem;">
                Connected to local PostgreSQL. Frontend app running at <a href="http://localhost:${TARGET_PORT}" target="_blank">http://localhost:${TARGET_PORT}</a>.
              </p>
              <h3>Database Status</h3>
              <pre>${JSON.stringify(liveDb, null, 2)}</pre>
            </div>
          </body>
          </html>
        `);
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(payload, null, 2));
      }

      console.log(`  \x1b[32m[${req.method}]\x1b[0m ${url} -> 200 OK (${Date.now() - t0}ms)`);
      return;
    }

    // Proxy request to Next.js API server
    const proxyReq = http.request(
      {
        hostname: 'localhost',
        port: TARGET_PORT,
        path: url,
        method: req.method,
        headers: {
          ...req.headers,
          host: `localhost:${TARGET_PORT}`,
        },
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
        proxyRes.pipe(res);
        const color = (proxyRes.statusCode || 200) < 400 ? '\x1b[32m' : '\x1b[31m';
        console.log(`  ${color}[${req.method}]\x1b[0m ${url} -> ${proxyRes.statusCode} (${Date.now() - t0}ms)`);
      }
    );

    proxyReq.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to proxy request to Next.js', detail: err.message }));
      console.log(`  \x1b[31m[${req.method}]\x1b[0m ${url} -> 502 Bad Gateway (${err.message})`);
    });

    req.pipe(proxyReq);
  });

  server.listen(BACKEND_PORT);
}

start().catch(console.error);

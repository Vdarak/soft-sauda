/**
 * Business Analytics View — Rich Interactive Visual Dashboard
 */
import { Icons, PageHeader, Spinner, formatCurrency, formatCurrencyCompact, escapeHtml } from '../components/ui.js';
import * as api from '../lib/api.js';

export async function renderAnalytics() {
  const app = document.getElementById('app');
  app.innerHTML = Spinner();

  try {
    const data = await api.get('/analytics');

    // 1. Calculations & Fallbacks
    const monthlyRev = data.monthlyRevenue || [];
    const commodityVol = data.commodityVolume || [];
    const topBuyers = data.topBuyers || [];
    const topSellers = data.topSellers || [];
    const aging = data.aging || { bracket30: 0, bracket60: 0, bracket90: 0, bracketOver: 0 };
    const fyComp = data.fyCompare || [];

    // Compute total metrics for overview
    const totalRev = monthlyRev.reduce((sum, r) => sum + r.amount, 0);
    const totalWeight = commodityVol.reduce((sum, c) => sum + c.weight, 0);
    const totalOutstanding = Object.values(aging).reduce((sum, a) => sum + a, 0);

    // 2. Generate SVG for Monthly Revenue (Line/Area Chart)
    let revenueChartHtml = '<div style="padding:2rem; text-align:center; color:var(--muted-foreground)">No revenue data recorded</div>';
    if (monthlyRev.length > 0) {
      const maxAmt = Math.max(...monthlyRev.map(r => r.amount), 10000);
      const width = 600;
      const height = 250;
      const padding = 40;
      
      const chartWidth = width - padding * 2;
      const chartHeight = height - padding * 2;

      // Generate points
      const points = monthlyRev.map((r, i) => {
        const x = padding + (i / (monthlyRev.length - 1 || 1)) * chartWidth;
        const y = padding + chartHeight - (r.amount / maxAmt) * chartHeight;
        return { x, y, label: r.label, amount: r.amount };
      });

      const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

      const gridLines = [0, 0.25, 0.5, 0.75, 1].map(pct => {
        const y = padding + chartHeight * pct;
        const value = maxAmt * (1 - pct);
        return `
          <line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="var(--border)" stroke-width="1" stroke-dasharray="4 4"/>
          <text x="${padding - 8}" y="${y + 4}" fill="var(--muted-foreground)" font-size="9" text-anchor="end">${formatCompact(value)}</text>
        `;
      }).join('');

      const xAxisLabels = points.map(p => `
        <text x="${p.x}" y="${height - padding + 18}" fill="var(--muted-foreground)" font-size="9" text-anchor="middle">${p.label}</text>
        <circle cx="${p.x}" cy="${p.y}" r="4" fill="var(--primary)" stroke="var(--card)" stroke-width="1.5" style="cursor:pointer" title="${p.label}: ${formatCurrency(p.amount)}"/>
      `).join('');

      revenueChartHtml = `
        <svg viewBox="0 0 ${width} ${height}" style="width:100%; height:auto; display:block;">
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.3"/>
              <stop offset="100%" stop-color="var(--primary)" stop-opacity="0.0"/>
            </linearGradient>
          </defs>
          ${gridLines}
          <path d="${areaPath}" fill="url(#areaGrad)" />
          <path d="${linePath}" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          ${xAxisLabels}
        </svg>
      `;
    }

    // 3. Generate SVG for Commodity Volume (Horizontal Progress Bars)
    const maxCommAmt = Math.max(...commodityVol.map(c => c.amount), 10000);
    const commodityBarsHtml = commodityVol.length === 0 
      ? '<div style="color:var(--muted-foreground)">No commodity records</div>'
      : commodityVol.map(c => {
          const pct = (c.amount / maxCommAmt) * 100;
          return `
            <div style="margin-bottom: 1rem;">
              <div style="display:flex; justify-content:space-between; font-size:0.8125rem; margin-bottom:0.25rem;">
                <span style="font-weight:600;">${escapeHtml(c.commodity)}</span>
                <span style="color:var(--primary); font-weight:600;">${formatCurrency(c.amount)} <span style="font-size:0.6875rem; color:var(--muted-foreground); font-weight:normal;">(${c.weight.toFixed(0)} Qtl)</span></span>
              </div>
              <div style="height:8px; background:var(--faint); border-radius:4px; overflow:hidden; border: 1px solid var(--border);">
                <div style="width:${pct}%; height:100%; background:linear-gradient(90deg, var(--primary) 0%, #a855f7 100%); border-radius:4px;"></div>
              </div>
            </div>
          `;
        }).join('');

    // 4. Generate SVG for Outstanding Aging (Grouped Block Display)
    const maxAging = Math.max(aging.bracket30, aging.bracket60, aging.bracket90, aging.bracketOver, 1000);
    const agingBlock = (label, amt, color) => {
      const heightPct = (amt / maxAging) * 100;
      return `
        <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; min-height:160px;">
          <div style="font-size:0.75rem; font-weight:700; color:${color}; margin-bottom:0.5rem;">${formatCurrency(amt)}</div>
          <div style="width:100%; height:${Math.max(heightPct, 6)}%; background:${color}; border-radius:4px 4px 0 0; opacity:0.85; transition:height 0.3s;" class="aging-bar"></div>
          <div style="font-size:0.75rem; font-weight:600; color:var(--muted-foreground); margin-top:0.75rem; text-align:center;">${label}</div>
        </div>
      `;
    };

    const agingChartHtml = `
      <div style="display:flex; gap:1.5rem; width:100%; padding:1rem 0; align-items:flex-end;">
        ${agingBlock('0-30 Days', aging.bracket30, 'var(--success, #10b981)')}
        ${agingBlock('31-60 Days', aging.bracket60, '#f59e0b')}
        ${agingBlock('61-90 Days', aging.bracket90, '#f97316')}
        ${agingBlock('90+ Days', aging.bracketOver, 'var(--danger, #ef4444)')}
      </div>
    `;

    // 5. Fiscal Year Comparison Table & Bar visual
    const maxFyAmt = Math.max(...fyComp.map(f => Math.max(f.contracts, f.bills)), 10000);
    const fyCompareHtml = fyComp.length === 0
      ? '<div style="color:var(--muted-foreground)">No historical fiscal records</div>'
      : fyComp.map(f => {
          const contractPct = (f.contracts / maxFyAmt) * 100;
          const billPct = (f.bills / maxFyAmt) * 100;
          return `
            <div style="margin-bottom:1.25rem;">
              <div style="font-weight:700; font-size:0.875rem; margin-bottom:0.5rem; color:var(--primary)">${f.fy}</div>
              <div style="display:grid; grid-template-columns: 80px 1fr; gap:0.5rem; align-items:center; margin-bottom:0.25rem;">
                <span style="font-size:0.7rem; color:var(--muted-foreground); text-transform:uppercase;">Saudas</span>
                <div style="display:flex; align-items:center; gap:0.5rem;">
                  <div style="flex:1; height:6px; background:var(--faint); border-radius:3px; overflow:hidden;">
                    <div style="width:${contractPct}%; height:100%; background:var(--primary); border-radius:3px;"></div>
                  </div>
                  <span style="font-size:0.75rem; font-weight:600; width:80px; text-align:right;">${formatCompact(f.contracts)}</span>
                </div>
              </div>
              <div style="display:grid; grid-template-columns: 80px 1fr; gap:0.5rem; align-items:center;">
                <span style="font-size:0.7rem; color:var(--muted-foreground); text-transform:uppercase;">Billed</span>
                <div style="display:flex; align-items:center; gap:0.5rem;">
                  <div style="flex:1; height:6px; background:var(--faint); border-radius:3px; overflow:hidden;">
                    <div style="width:${billPct}%; height:100%; background:#a855f7; border-radius:3px;"></div>
                  </div>
                  <span style="font-size:0.75rem; font-weight:600; width:80px; text-align:right;">${formatCompact(f.bills)}</span>
                </div>
              </div>
            </div>
          `;
        }).join('');

    app.innerHTML = `
      ${PageHeader({
        title: 'Business Analytics',
        subtitle: 'GCC Division Financial Analytics & Market Trends',
        actions: `<button class="secondary" onclick="window.print()">${Icons.printer} Print Dashboard</button>`
      })}

      <!-- Overview Cards -->
      <div class="stats-grid" style="margin-bottom: 1.5rem;">
        <div class="stat-card">
          <div class="stat-icon" style="color:var(--primary)">${Icons.receipt}</div>
          <div class="stat-value">${formatCurrencyCompact(totalRev)}</div>
          <div class="stat-label">Total Revenue Billed</div>
          <div class="stat-desc">Sum of bills in active FY</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="color:#a855f7">${Icons.fileText}</div>
          <div class="stat-value">${totalWeight.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Qtl</div>
          <div class="stat-label">Total Trade Volume</div>
          <div class="stat-desc">Contracts weight in active FY</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="color:var(--danger)">${Icons.bookOpen}</div>
          <div class="stat-value">${formatCurrencyCompact(totalOutstanding)}</div>
          <div class="stat-label">Division Outstanding</div>
          <div class="stat-desc">Aging dues needing recovery</div>
        </div>
      </div>

      <!-- Main Visualizations Grid -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap:1.5rem; margin-bottom:1.5rem;">
        <!-- Left: Monthly Revenue Trend -->
        <div class="table-container" style="background:var(--card); padding:1.5rem;">
          <h3 style="margin:0 0 1rem; font-size:0.875rem; text-transform:uppercase; color:var(--muted-foreground); letter-spacing:0.05em;">Monthly Revenue Trend</h3>
          ${revenueChartHtml}
        </div>

        <!-- Right: Commodity Trade Volume -->
        <div class="table-container" style="background:var(--card); padding:1.5rem;">
          <h3 style="margin:0 0 1rem; font-size:0.875rem; text-transform:uppercase; color:var(--muted-foreground); letter-spacing:0.05em;">Commodity Wise Turnover</h3>
          <div style="max-height: 250px; overflow-y:auto; padding-right:0.5rem;">
            ${commodityBarsHtml}
          </div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap:1.5rem; margin-bottom:1.5rem;">
        <!-- Left: Outstanding Bill Aging -->
        <div class="table-container" style="background:var(--card); padding:1.5rem;">
          <h3 style="margin:0 0 1rem; font-size:0.875rem; text-transform:uppercase; color:var(--muted-foreground); letter-spacing:0.05em;">Outstanding Aging Analysis</h3>
          ${agingChartHtml}
        </div>

        <!-- Right: Year-over-Year Growth comparison -->
        <div class="table-container" style="background:var(--card); padding:1.5rem;">
          <h3 style="margin:0 0 1rem; font-size:0.875rem; text-transform:uppercase; color:var(--muted-foreground); letter-spacing:0.05em;">Fiscal Years Comparison</h3>
          ${fyCompareHtml}
        </div>
      </div>

      <!-- Top Stakeholders Section -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap:1.5rem;">
        <!-- Top Buyers -->
        <div class="table-container" style="background:var(--card); padding:1.5rem;">
          <h3 style="margin:0 0 1rem; font-size:0.875rem; text-transform:uppercase; color:var(--muted-foreground); letter-spacing:0.05em;">Top 5 Purchasing Buyers</h3>
          <table style="width:100%; border-collapse:collapse;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border);">
                <th style="padding:0.5rem 0; text-align:left;">Party Name</th>
                <th style="padding:0.5rem 0; text-align:right;">Total Purchased</th>
              </tr>
            </thead>
            <tbody>
              ${topBuyers.length === 0 
                ? '<tr><td colspan="2" style="text-align:center; padding:1rem; color:var(--muted-foreground);">No buyer records</td></tr>'
                : topBuyers.map(tb => `
                    <tr style="border-bottom: 1px solid var(--border);">
                      <td style="padding:0.6rem 0; font-weight:600;">${escapeHtml(tb.name)}</td>
                      <td style="padding:0.6rem 0; text-align:right; font-weight:700; color:var(--primary);" class="mono">${formatCurrency(tb.amount)}</td>
                    </tr>
                  `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Top Sellers -->
        <div class="table-container" style="background:var(--card); padding:1.5rem;">
          <h3 style="margin:0 0 1rem; font-size:0.875rem; text-transform:uppercase; color:var(--muted-foreground); letter-spacing:0.05em;">Top 5 Supplying Sellers</h3>
          <table style="width:100%; border-collapse:collapse;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border);">
                <th style="padding:0.5rem 0; text-align:left;">Party Name</th>
                <th style="padding:0.5rem 0; text-align:right;">Total Supplied</th>
              </tr>
            </thead>
            <tbody>
              ${topSellers.length === 0 
                ? '<tr><td colspan="2" style="text-align:center; padding:1rem; color:var(--muted-foreground);">No seller records</td></tr>'
                : topSellers.map(ts => `
                    <tr style="border-bottom: 1px solid var(--border);">
                      <td style="padding:0.6rem 0; font-weight:600;">${escapeHtml(ts.name)}</td>
                      <td style="padding:0.6rem 0; text-align:right; font-weight:700; color:var(--primary);" class="mono">${formatCurrency(ts.amount)}</td>
                    </tr>
                  `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

  } catch (err) {
    app.innerHTML = `
      ${PageHeader({ title: 'Business Analytics' })}
      <div class="alert danger">Failed to load analytics: ${err.message}</div>
    `;
  }
}

// Compact format for large currency values (e.g. 1.2M, 50K)
function formatCompact(num) {
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(0)}K`;
  return `₹${num.toFixed(0)}`;
}

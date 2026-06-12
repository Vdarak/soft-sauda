/**
 * Shared print HTML layout for all document types.
 * Returns a full HTML page that auto-triggers window.print() on load.
 */

export const COMPANY = {
  name: 'Ganesh Canvassing Company',
  tagline: 'Commission Agents & Brokers',
  address: 'Grain Market, Akola — 444001, Maharashtra',
  phone: '+91 98765 43210  /  +91 94050 12345',
  headBroker: 'Shri Ganesh Sharma (Head Broker)',
  gstin: '27AAAAA0000A1Z5',
};

function fmt(v: any, decimals = 2): string {
  const n = parseFloat(v ?? '0');
  if (isNaN(n)) return '—';
  return '₹\u00A0' + n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtDate(v: any): string {
  if (!v) return '—';
  try { return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return String(v); }
}

function fmtNum(v: any, dec = 3): string {
  const n = parseFloat(v ?? '0');
  return isNaN(n) ? '—' : n.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

const baseCSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Arial', sans-serif; font-size: 11pt; color: #111; background: #fff; padding: 20mm 18mm; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #222; padding-bottom: 10px; margin-bottom: 14px; }
  .header-left { display: flex; align-items: center; gap: 14px; }
  .header-left img { height: 54px; width: auto; }
  .company-name { font-size: 17pt; font-weight: 800; color: #111; letter-spacing: -0.5px; }
  .company-sub { font-size: 9pt; color: #555; margin-top: 2px; }
  .company-contact { font-size: 8.5pt; color: #444; margin-top: 3px; }
  .header-right { text-align: right; font-size: 8.5pt; color: #555; }
  .doc-title { font-size: 13pt; font-weight: 700; background: #f0f4f0; border: 1px solid #ccc; padding: 6px 14px; border-radius: 4px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; }
  .doc-title span { font-size: 9.5pt; color: #555; font-weight: 400; }
  .section { margin-bottom: 14px; }
  .section-title { font-size: 8.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #555; border-bottom: 1px solid #ddd; padding-bottom: 3px; margin-bottom: 7px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px 16px; }
  .field { margin-bottom: 4px; }
  .field-label { font-size: 8pt; color: #666; text-transform: uppercase; letter-spacing: 0.04em; }
  .field-value { font-size: 10.5pt; font-weight: 600; color: #111; }
  .field-value.mono { font-family: 'Courier New', monospace; }
  .field-value.large { font-size: 13pt; color: #1a6b1a; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  th { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.05em; color: #555; background: #f5f5f5; border: 1px solid #ccc; padding: 5px 8px; text-align: left; font-weight: 700; }
  td { font-size: 10pt; border: 1px solid #ddd; padding: 5px 8px; }
  td.right, th.right { text-align: right; }
  td.center, th.center { text-align: center; }
  tfoot td { font-weight: 700; background: #f0f4f0; border-top: 2px solid #bbb; }
  .badge { display: inline-block; font-size: 8pt; font-weight: 700; padding: 2px 7px; border-radius: 3px; border: 1px solid #bbb; background: #f0f4f0; }
  .footer { margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px; display: flex; justify-content: space-between; font-size: 8pt; color: #888; }
  .sig-area { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 24px; }
  .sig-box { border-top: 1px solid #aaa; padding-top: 5px; font-size: 8.5pt; color: #555; text-align: center; }
  @media print {
    body { padding: 10mm 12mm; }
    @page { margin: 8mm; size: A4 portrait; }
  }
`;

export function printPage(title: string, docId: string, docDate: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — ${COMPANY.name}</title>
<style>${baseCSS}</style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <img src="/gcc-logo.svg" alt="GCC Logo" onerror="this.style.display='none'">
      <div>
        <div class="company-name">${COMPANY.name}</div>
        <div class="company-sub">${COMPANY.tagline}</div>
        <div class="company-contact">${COMPANY.address}</div>
        <div class="company-contact">📞 ${COMPANY.phone}</div>
      </div>
    </div>
    <div class="header-right">
      <div>${COMPANY.headBroker}</div>
      <div style="margin-top:3px">GSTIN: ${COMPANY.gstin}</div>
    </div>
  </div>

  <div class="doc-title">
    <strong>${title}</strong>
    <span>${docId} &nbsp;·&nbsp; ${docDate}</span>
  </div>

  ${bodyHtml}

  <div class="sig-area">
    <div class="sig-box">Seller / Vikreta</div>
    <div class="sig-box">${COMPANY.name}</div>
    <div class="sig-box">Buyer / Kharidaar</div>
  </div>

  <div class="footer">
    <span>Printed on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
    <span>${COMPANY.name} — ${COMPANY.address}</span>
  </div>
</body>
<script>window.addEventListener('load', () => { setTimeout(() => window.print(), 400); });</script>
</html>`;
}

export { fmt, fmtDate, fmtNum };

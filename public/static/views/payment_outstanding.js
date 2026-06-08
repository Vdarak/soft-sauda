/**
 * Payment Outstanding & Reports Dashboard View
 */
import { Icons, DataTable, FormGroup, PageHeader, Spinner, showToast, escapeHtml, formatDate, formatCurrency } from '../components/ui.js';
import * as api from '../lib/api.js';

export async function renderPaymentOutstanding(ctx) {
  const app = document.getElementById('app');
  app.innerHTML = Spinner();

  try {
    const data = await api.get('/reports/payment-outstanding', { forceRefresh: true });

    let activeTab = 'outstanding'; // outstanding, pending_contract, pending_delivery, delivery, payment, interest
    let activeSlice = 'date'; // date, buyer, seller, sbroker, bbroker, product

    app.innerHTML = `
      ${PageHeader({
        title: 'Outstanding & Business intelligence',
        subtitle: 'Financial outstanding logs, registers, and aging statistics',
        actions: `
          <button class="secondary" id="btn-print">${Icons.fileText || ''} Print (P)</button>
          <button class="secondary" id="btn-export-outstanding">📥 Export Excel</button>
        `
      })}

      <!-- Reports Workspace Tabs -->
      <div style="display: flex; gap: 0.25rem; border-bottom: 2px solid var(--border); margin-bottom: 1.5rem; flex-wrap: wrap;">
        <button class="tab-btn primary" data-tab="outstanding" style="border-radius: 0.375rem 0.375rem 0 0; border: none; margin-bottom: -2px; padding: 0.5rem 1rem; font-size: 0.8125rem;">Payment Outstanding</button>
        <button class="tab-btn secondary" data-tab="pending_contract" style="border-radius: 0.375rem 0.375rem 0 0; border: none; margin-bottom: -2px; padding: 0.5rem 1rem; font-size: 0.8125rem;">Pending Contracts</button>
        <button class="tab-btn secondary" data-tab="pending_delivery" style="border-radius: 0.375rem 0.375rem 0 0; border: none; margin-bottom: -2px; padding: 0.5rem 1rem; font-size: 0.8125rem;">Pending Deliveries</button>
        <button class="tab-btn secondary" data-tab="delivery" style="border-radius: 0.375rem 0.375rem 0 0; border: none; margin-bottom: -2px; padding: 0.5rem 1rem; font-size: 0.8125rem;">Delivery Register</button>
        <button class="tab-btn secondary" data-tab="payment" style="border-radius: 0.375rem 0.375rem 0 0; border: none; margin-bottom: -2px; padding: 0.5rem 1rem; font-size: 0.8125rem;">Payment Register</button>
        <button class="tab-btn secondary" data-tab="interest" style="border-radius: 0.375rem 0.375rem 0 0; border: none; margin-bottom: -2px; padding: 0.5rem 1rem; font-size: 0.8125rem;">Interest Calculation</button>
      </div>

      <div class="form-grid" style="grid-template-columns: 200px 1fr; gap: 1.5rem; align-items: start;">
        <!-- Left Sidebar: Slicing Macros -->
        <div class="table-container" style="padding: 1.25rem; background: var(--card);">
          <h3 style="margin-top: 0; margin-bottom: 0.75rem; font-size: 0.75rem; text-transform: uppercase; color: var(--muted-foreground); letter-spacing: 0.05em;">Slice Data By</h3>
          
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.8125rem;">
              <input type="radio" name="slicing" value="date" checked> Date Wise
            </label>
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.8125rem;">
              <input type="radio" name="slicing" value="buyer"> Buyer Wise
            </label>
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.8125rem;">
              <input type="radio" name="slicing" value="seller"> Seller Wise
            </label>
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.8125rem;">
              <input type="radio" name="slicing" value="sbroker"> S. Broker Wise
            </label>
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.8125rem;">
              <input type="radio" name="slicing" value="bbroker"> B. Broker Wise
            </label>
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.8125rem;">
              <input type="radio" name="slicing" value="product"> Product Wise
            </label>
          </div>
        </div>

        <!-- Right Content: Report Grid -->
        <div style="display: flex; flex-direction: column; gap: 1.5rem; width: 100%;">
          <div style="margin-bottom:0.5rem; display:flex; align-items:center; gap:0.5rem; width:100%">
            <div class="form-group" style="margin:0; flex:1; position:relative">
              <input type="text" id="search-report" placeholder="Search entries..." style="padding-left:2.5rem; width:100%">
              <div style="position:absolute; left:0.8rem; top:50%; transform:translateY(-50%); color:var(--muted-foreground); display:flex; align-items:center">${Icons.search}</div>
            </div>
          </div>

          <div id="report-grid-container" class="table-container" style="background: var(--card);">
            <!-- Dynamic report rendering goes here -->
          </div>
        </div>
      </div>
    `;

    // Render initial grid
    updateReportView(data, activeTab, activeSlice);

    // Tab buttons event listener
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Clear active classes
        document.querySelectorAll('.tab-btn').forEach(b => {
          b.className = 'tab-btn secondary';
          b.style.background = '';
        });
        e.target.className = 'tab-btn primary';
        
        activeTab = e.target.getAttribute('data-tab');
        updateReportView(data, activeTab, activeSlice);
      });
    });

    // Slicing radios event listener
    document.querySelectorAll('input[name="slicing"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        activeSlice = e.target.value;
        updateReportView(data, activeTab, activeSlice);
      });
    });

    // Search bar event listener
    document.getElementById('search-report')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      const rows = document.querySelectorAll('#report-grid-table tbody tr');
      rows.forEach(row => {
        const txt = row.textContent.toLowerCase();
        row.style.display = txt.includes(q) ? '' : 'none';
      });
    });

    // Excel Export handler
    document.getElementById('btn-export-outstanding')?.addEventListener('click', () => {
      import('../components/ui.js').then(ui => {
        ui.exportToExcel('/reports/payment-outstanding', `payment_outstanding_${activeTab}_${activeSlice}`);
      });
    });

    // Print handler
    document.getElementById('btn-print')?.addEventListener('click', () => {
      window.print();
    });

  } catch (err) {
    app.innerHTML = `<div class="alert danger">Failed to load reports: ${err.message}</div>`;
  }
}

function updateReportView(allData, tab, slice) {
  const container = document.getElementById('report-grid-container');
  if (!container) return;

  // Let's filter data according to the selected tab
  let filtered = [...allData];

  // We sort/slice data according to activeSlice
  if (slice === 'buyer') {
    filtered.sort((a, b) => a.buyerName.localeCompare(b.buyerName));
  } else if (slice === 'seller') {
    filtered.sort((a, b) => a.sellerName.localeCompare(b.sellerName));
  } else if (slice === 'sbroker') {
    filtered.sort((a, b) => a.sellerBrokerName.localeCompare(b.sellerBrokerName));
  } else if (slice === 'bbroker') {
    filtered.sort((a, b) => a.buyerBrokerName.localeCompare(b.buyerBrokerName));
  } else if (slice === 'product') {
    filtered.sort((a, b) => a.commodityName.localeCompare(b.commodityName));
  } else {
    // default date sorting
    filtered.sort((a, b) => new Date(b.billDate).getTime() - new Date(a.billDate).getTime());
  }

  if (tab === 'outstanding') {
    renderOutstandingGrid(container, filtered);
  } else if (tab === 'pending_contract') {
    renderPendingContractsGrid(container);
  } else if (tab === 'pending_delivery') {
    renderPendingDeliveriesGrid(container);
  } else if (tab === 'delivery') {
    renderDeliveryRegisterGrid(container);
  } else if (tab === 'payment') {
    renderPaymentRegisterGrid(container);
  } else if (tab === 'interest') {
    renderInterestCalculationGrid(container, filtered);
  }
}

function renderOutstandingGrid(container, items) {
  let runningBillAmt = 0;
  let runningReceived = 0;
  let runningNetBal = 0;

  const rows = items.map(item => {
    runningBillAmt += item.billAmount;
    runningReceived += item.receivedAmount;
    runningNetBal += item.balanceAmount;

    return `
      <tr>
        <td>${formatDate(item.billDate)}</td>
        <td style="font-weight: 600;">Sauda #${item.contractNo}</td>
        <td>${escapeHtml(item.buyerName)}</td>
        <td>${escapeHtml(item.sellerName)}</td>
        <td style="font-weight: 500;">${escapeHtml(item.billNo)}</td>
        <td style="text-align: center; font-weight: 600;" class="${item.overDays > 30 ? 'color:var(--danger)' : ''}">${item.overDays}</td>
        <td style="text-align: right;" class="mono">${formatCurrency(item.billAmount).replace('₹ ', '')}</td>
        <td style="text-align: right;" class="mono">${formatCurrency(item.receivedAmount).replace('₹ ', '')}</td>
        <td style="text-align: right;" class="mono">0.00</td>
        <td style="text-align: right; font-weight: 700;" class="mono">${formatCurrency(item.balanceAmount).replace('₹ ', '')}</td>
        <td style="text-align: right; color: var(--muted-foreground);" class="mono">${formatCurrency(item.creditLimit).replace('₹ ', '')}</td>
      </tr>
    `;
  });

  container.innerHTML = `
    <div style="overflow-x: auto;">
      <table id="report-grid-table">
        <thead>
          <tr>
            <th>Bill Date</th>
            <th>Sauda No</th>
            <th>Buyer</th>
            <th>Seller</th>
            <th>Bill No</th>
            <th style="text-align: center;">Over Days</th>
            <th style="text-align: right;">Bill Amount</th>
            <th style="text-align: right;">Received</th>
            <th style="text-align: right;">Deductions</th>
            <th style="text-align: right;">Outstanding</th>
            <th style="text-align: right;">Credit Limit</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length === 0 
            ? `<tr><td colspan="11" style="text-align:center;padding:2rem;color:var(--muted-foreground)">No outstanding balances found.</td></tr>`
            : rows.join('')}
        </tbody>
        ${rows.length > 0 ? `
          <tfoot>
            <tr style="font-weight: 700; background: var(--faint); border-top: 2px solid var(--border);">
              <td colspan="6">TOTALS</td>
              <td style="text-align: right;" class="mono">${formatCurrency(runningBillAmt).replace('₹ ', '')}</td>
              <td style="text-align: right;" class="mono">${formatCurrency(runningReceived).replace('₹ ', '')}</td>
              <td style="text-align: right;" class="mono">0.00</td>
              <td style="text-align: right; color: var(--primary);" class="mono">${formatCurrency(runningNetBal)}</td>
              <td></td>
            </tr>
          </tfoot>
        ` : ''}
      </table>
    </div>
  `;
}

async function renderPendingContractsGrid(container) {
  container.innerHTML = `<tr><td style="text-align: center; padding: 2rem;"><span class="spinner"></span> Loading active contracts...</td></tr>`;
  try {
    const contractsList = await api.get('/contracts', { forceRefresh: true });
    // Filter contracts with remaining pending lorries
    const pending = contractsList.filter(c => c.pendingCount > 0);

    const rows = pending.map(c => `
      <tr>
        <td style="font-weight: 600;">Sauda #${c.saudaNo}</td>
        <td>${formatDate(c.saudaDate)}</td>
        <td>${escapeHtml(c.buyerName)}</td>
        <td>${escapeHtml(c.sellerName)}</td>
        <td>${escapeHtml(c.commodityName)}</td>
        <td style="text-align: center;" class="mono">${c.numberOfLorries}</td>
        <td style="text-align: center; color: var(--primary); font-weight: 700;" class="mono">${c.pendingCount}</td>
        <td style="text-align: right;" class="mono">${formatCurrency(c.amount)}</td>
      </tr>
    `);

    container.innerHTML = `
      <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr>
              <th>Sauda No</th>
              <th>Sauda Date</th>
              <th>Buyer</th>
              <th>Seller</th>
              <th>Commodity</th>
              <th style="text-align: center;">Total Lorries</th>
              <th style="text-align: center;">Pending Lorries</th>
              <th style="text-align: right;">Bargain Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length === 0 
              ? `<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--muted-foreground)">No pending contracts found.</td></tr>`
              : rows.join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<tr><td style="text-align: center; padding: 2rem; color: var(--danger);">${escapeHtml(err.message)}</td></tr>`;
  }
}

async function renderPendingDeliveriesGrid(container) {
  container.innerHTML = `<tr><td style="text-align: center; padding: 2rem;"><span class="spinner"></span> Loading pending deliveries...</td></tr>`;
  try {
    const delList = await api.get('/deliveries', { forceRefresh: true });
    const pending = delList.filter(d => d.status === 'PENDING' || d.status === 'DISPATCHED');

    const rows = pending.map(d => `
      <tr>
        <td>Disp #${d.dispatchNo}</td>
        <td>${formatDate(d.dispatchDate)}</td>
        <td style="font-weight: 600;">Sauda #${d.saudaNo || '-'}</td>
        <td style="font-weight: 500;">${escapeHtml(d.truckNo || '-')}</td>
        <td>${escapeHtml(d.transporterName || '-')}</td>
        <td>${escapeHtml(d.billNo || '-')}</td>
        <td style="text-align: center;">
          <span class="badge badge-draft">${d.status}</span>
        </td>
      </tr>
    `);

    container.innerHTML = `
      <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr>
              <th>Dispatch No</th>
              <th>Dispatch Date</th>
              <th>Sauda Link</th>
              <th>Lorry/Truck No</th>
              <th>Transporter</th>
              <th>Bill Ref</th>
              <th style="text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length === 0 
              ? `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--muted-foreground)">No pending deliveries found.</td></tr>`
              : rows.join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<tr><td style="text-align: center; padding: 2rem; color: var(--danger);">${escapeHtml(err.message)}</td></tr>`;
  }
}

async function renderDeliveryRegisterGrid(container) {
  container.innerHTML = `<tr><td style="text-align: center; padding: 2rem;"><span class="spinner"></span> Loading deliveries...</td></tr>`;
  try {
    const delList = await api.get('/deliveries', { forceRefresh: true });

    const rows = delList.map(d => `
      <tr>
        <td>Disp #${d.dispatchNo}</td>
        <td>${formatDate(d.dispatchDate)}</td>
        <td style="font-weight: 600;">Sauda #${d.saudaNo || '-'}</td>
        <td style="font-weight: 500;">${escapeHtml(d.truckNo || '-')}</td>
        <td>${escapeHtml(d.transporterName || '-')}</td>
        <td>${escapeHtml(d.billNo || '-')}</td>
        <td style="text-align: center;"><span class="badge ${d.status === 'DELIVERED' ? 'badge-active' : 'badge-draft'}">${d.status}</span></td>
      </tr>
    `);

    container.innerHTML = `
      <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr>
              <th>Dispatch No</th>
              <th>Dispatch Date</th>
              <th>Sauda Link</th>
              <th>Lorry/Truck No</th>
              <th>Transporter</th>
              <th>Bill Ref</th>
              <th style="text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length === 0 
              ? `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--muted-foreground)">No deliveries found.</td></tr>`
              : rows.join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<tr><td style="text-align: center; padding: 2rem; color: var(--danger);">${escapeHtml(err.message)}</td></tr>`;
  }
}

async function renderPaymentRegisterGrid(container) {
  container.innerHTML = `<tr><td style="text-align: center; padding: 2rem;"><span class="spinner"></span> Loading payments...</td></tr>`;
  try {
    const payList = await api.get('/payments', { forceRefresh: true });

    const rows = payList.map(p => `
      <tr>
        <td>${formatDate(p.paymentDate)}</td>
        <td style="font-weight: 600;">${escapeHtml(p.partyName)}</td>
        <td>${escapeHtml(p.instrumentType)}</td>
        <td>${escapeHtml(p.instrumentNo || '-')}</td>
        <td>${escapeHtml(p.depositedBank || '-')}</td>
        <td style="text-align: right; font-weight: 600; color: var(--primary);" class="mono">${formatCurrency(p.amount)}</td>
      </tr>
    `);

    container.innerHTML = `
      <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr>
              <th>Payment Date</th>
              <th>Party / Client</th>
              <th>Type</th>
              <th>Ref / Cheque No</th>
              <th>Deposited Bank</th>
              <th style="text-align: right;">Amount Paid</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length === 0 
              ? `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--muted-foreground)">No payments found.</td></tr>`
              : rows.join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<tr><td style="text-align: center; padding: 2rem; color: var(--danger);">${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderInterestCalculationGrid(container, items) {
  const annualInterestRate = 0.12; // 12% default annual rate

  const rows = items.map(item => {
    // Interest = Outstanding amount * (Over Days / 365) * rate
    const interest = item.balanceAmount * (item.overDays / 365) * annualInterestRate;

    return `
      <tr>
        <td>${formatDate(item.billDate)}</td>
        <td style="font-weight: 500;">${escapeHtml(item.billNo)}</td>
        <td>${escapeHtml(item.buyerName)}</td>
        <td style="text-align: right;" class="mono">${formatCurrency(item.balanceAmount).replace('₹ ', '')}</td>
        <td style="text-align: center; font-weight: 600;" class="mono">${item.overDays}</td>
        <td style="text-align: center;" class="mono">12%</td>
        <td style="text-align: right; font-weight: 700; color: var(--primary);" class="mono">${formatCurrency(interest)}</td>
      </tr>
    `;
  });

  container.innerHTML = `
    <div style="overflow-x: auto;">
      <table>
        <thead>
          <tr>
            <th>Bill Date</th>
            <th>Bill No</th>
            <th>Party / Client</th>
            <th style="text-align: right;">Outstanding Principal</th>
            <th style="text-align: center;">Delay (Days)</th>
            <th style="text-align: center;">Interest Rate</th>
            <th style="text-align: right;">Calculated Interest</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length === 0 
            ? `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--muted-foreground)">No outstanding bills to compute interest on.</td></tr>`
            : rows.join('')}
        </tbody>
      </table>
    </div>
  `;
}

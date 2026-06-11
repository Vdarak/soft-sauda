/**
 * Payment Outstanding & Reports Dashboard View
 */
import { Icons, DataTable, FormGroup, PageHeader, Spinner, showToast, escapeHtml, formatDate, formatCurrency, attachTableSearch } from '../components/ui.js';
import * as api from '../lib/api.js';

export async function renderPaymentOutstanding(ctx) {
  const app = document.getElementById('app');
  app.innerHTML = Spinner();

  try {
    const data = await api.get('/reports/payment-outstanding');

    let activeTab = 'outstanding'; // outstanding, pending_contract, pending_delivery, delivery, payment, interest
    let activeSlice = 'date'; // date, buyer, seller, sbroker, bbroker, product

    app.innerHTML = `
      ${PageHeader({
        title: 'Outstanding & Business intelligence',
        subtitle: 'Financial outstanding logs, registers, and aging statistics',
        actions: `
          <button class="secondary" id="btn-print">${Icons.printer} Print (P)</button>
          <button class="secondary" id="btn-export-outstanding">${Icons.download} Export Excel</button>
        `
      })}

      <!-- Reports Workspace Tabs -->
      <div class="pills-container">
        <button class="pill-btn active" data-tab="outstanding">Payment Outstanding</button>
        <button class="pill-btn" data-tab="pending_contract">Pending Contracts</button>
        <button class="pill-btn" data-tab="pending_delivery">Pending Deliveries</button>
        <button class="pill-btn" data-tab="delivery">Delivery Register</button>
        <button class="pill-btn" data-tab="payment">Payment Register</button>
        <button class="pill-btn" data-tab="interest">Interest Calculation</button>
      </div>

      <div class="form-grid layout-200-1fr">
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

          <div id="report-grid-container" style="background: transparent;">
            <!-- Dynamic report rendering goes here -->
          </div>
        </div>
      </div>
    `;

    // Render initial grid
    updateReportView(data, activeTab, activeSlice);

    // Tab buttons event listener
    document.querySelectorAll('.pill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Clear active classes
        document.querySelectorAll('.pill-btn').forEach(b => {
          b.classList.remove('active');
        });
        e.target.classList.add('active');
        
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

  const searchInput = document.getElementById('search-report');
  if (searchInput) {
    searchInput.value = '';
    const cloned = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(cloned, searchInput);
  }

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

  const renderRows = (list) => list.map(item => `
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
      <td style="text-align: right;" onclick="event.stopPropagation()">
        <div style="display: inline-flex; gap: 0.25rem; justify-content: flex-end;">
          <a href="/bills/${item.billId}" data-route><button class="small">${Icons.edit} Edit</button></a>
          <button class="small danger delete-row-btn" data-id="${item.billId}" data-entity="bills">${Icons.trash}</button>
        </div>
      </td>
    </tr>
  `);

  items.forEach(item => {
    runningBillAmt += item.billAmount;
    runningReceived += item.receivedAmount;
    runningNetBal += item.balanceAmount;
  });

  const rowsHtml = renderRows(items);

  const footerHtml = `
    <tfoot>
      <tr style="font-weight: 700; background: var(--faint); border-top: 2px solid var(--border);">
        <td colspan="6">TOTALS</td>
        <td style="text-align: right;" class="mono">${formatCurrency(runningBillAmt).replace('₹ ', '')}</td>
        <td style="text-align: right;" class="mono">${formatCurrency(runningReceived).replace('₹ ', '')}</td>
        <td style="text-align: right;" class="mono">0.00</td>
        <td style="text-align: right; color: var(--primary);" class="mono">${formatCurrency(runningNetBal)}</td>
        <td></td>
        <td></td>
      </tr>
    </tfoot>
  `;

  container.innerHTML = DataTable({
    id: 'outstanding-table',
    count: items.length,
    headers: [
      { label: 'Bill Date' },
      { label: 'Sauda No' },
      { label: 'Buyer' },
      { label: 'Seller' },
      { label: 'Bill No' },
      { label: 'Over Days', align: 'center' },
      { label: 'Bill Amount', align: 'right' },
      { label: 'Received', align: 'right' },
      { label: 'Deductions', align: 'right' },
      { label: 'Outstanding', align: 'right' },
      { label: 'Credit Limit', align: 'right' },
      { label: 'Actions', style: 'text-align:right; width: 100px;' }
    ],
    rows: rowsHtml,
    footer: footerHtml
  });

  attachTableSearch('search-report', document.querySelector('#outstanding-table tbody'), items, renderRows);
}

async function renderPendingContractsGrid(container) {
  container.innerHTML = `<tr><td style="text-align: center; padding: 2rem;"><span class="spinner"></span> Loading active contracts...</td></tr>`;
  try {
    const contractsList = await api.get('/contracts');
    // Filter contracts with remaining pending lorries
    const pending = contractsList.filter(c => c.pendingCount > 0);

    const renderRows = (list) => list.map(c => `
      <tr>
        <td style="font-weight: 600;">Sauda #${c.saudaNo}</td>
        <td>${formatDate(c.saudaDate)}</td>
        <td>${escapeHtml(c.buyerName)}</td>
        <td>${escapeHtml(c.sellerName)}</td>
        <td>${escapeHtml(c.commodityName)}</td>
        <td style="text-align: center;" class="mono">${c.numberOfLorries}</td>
        <td style="text-align: center; color: var(--primary); font-weight: 700;" class="mono">${c.pendingCount}</td>
        <td style="text-align: right;" class="mono">${formatCurrency(c.amount)}</td>
        <td style="text-align: right;" onclick="event.stopPropagation()">
          <div style="display: inline-flex; gap: 0.25rem; justify-content: flex-end;">
            <a href="/contracts/${c.id}" data-route><button class="small">${Icons.edit} Edit</button></a>
            <button class="small danger delete-row-btn" data-id="${c.id}" data-entity="contracts">${Icons.trash}</button>
          </div>
        </td>
      </tr>
    `);

    const totalLorries = pending.reduce((sum, c) => sum + (c.numberOfLorries || 0), 0);
    const pendingLorries = pending.reduce((sum, c) => sum + (c.pendingCount || 0), 0);
    const totalAmount = pending.reduce((sum, c) => sum + parseFloat(c.amount || '0'), 0);

    const rowsHtml = renderRows(pending);

    const footerHtml = `
      <tfoot>
        <tr style="font-weight: 700; background: var(--faint); border-top: 2px solid var(--border);">
          <td colspan="5">TOTALS</td>
          <td style="text-align: center;" class="mono">${totalLorries}</td>
          <td style="text-align: center; color: var(--primary);" class="mono">${pendingLorries}</td>
          <td style="text-align: right;" class="mono">${formatCurrency(totalAmount)}</td>
          <td></td>
        </tr>
      </tfoot>
    `;

    container.innerHTML = DataTable({
      id: 'pending-contracts-table',
      count: pending.length,
      headers: [
        { label: 'Sauda No' },
        { label: 'Sauda Date' },
        { label: 'Buyer' },
        { label: 'Seller' },
        { label: 'Commodity' },
        { label: 'Total Lorries', align: 'center' },
        { label: 'Pending Lorries', align: 'center' },
        { label: 'Bargain Amount', align: 'right' },
        { label: 'Actions', style: 'text-align:right; width: 100px;' }
      ],
      rows: rowsHtml,
      footer: footerHtml
    });

    attachTableSearch('search-report', document.querySelector('#pending-contracts-table tbody'), pending, renderRows);
  } catch (err) {
    container.innerHTML = `<tr><td style="text-align: center; padding: 2rem; color: var(--danger);">${escapeHtml(err.message)}</td></tr>`;
  }
}

async function renderPendingDeliveriesGrid(container) {
  container.innerHTML = `<tr><td style="text-align: center; padding: 2rem;"><span class="spinner"></span> Loading pending deliveries...</td></tr>`;
  try {
    const delList = await api.get('/deliveries');
    const pending = delList.filter(d => d.status === 'PENDING' || d.status === 'DISPATCHED');

    const renderRows = (list) => list.map(d => `
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
        <td style="text-align: right;" onclick="event.stopPropagation()">
          <div style="display: inline-flex; gap: 0.25rem; justify-content: flex-end;">
            <a href="/deliveries/${d.id}" data-route><button class="small">${Icons.edit} Edit</button></a>
            <button class="small danger delete-row-btn" data-id="${d.id}" data-entity="deliveries">${Icons.trash}</button>
          </div>
        </td>
      </tr>
    `);

    const rowsHtml = renderRows(pending);

    container.innerHTML = DataTable({
      id: 'pending-deliveries-table',
      count: pending.length,
      headers: [
        { label: 'Dispatch No' },
        { label: 'Dispatch Date' },
        { label: 'Sauda Link' },
        { label: 'Lorry/Truck No' },
        { label: 'Transporter' },
        { label: 'Bill Ref' },
        { label: 'Status', align: 'center' },
        { label: 'Actions', style: 'text-align:right; width: 100px;' }
      ],
      rows: rowsHtml
    });

    attachTableSearch('search-report', document.querySelector('#pending-deliveries-table tbody'), pending, renderRows);
  } catch (err) {
    container.innerHTML = `<tr><td style="text-align: center; padding: 2rem; color: var(--danger);">${escapeHtml(err.message)}</td></tr>`;
  }
}

async function renderDeliveryRegisterGrid(container) {
  container.innerHTML = `<tr><td style="text-align: center; padding: 2rem;"><span class="spinner"></span> Loading deliveries...</td></tr>`;
  try {
    const delList = await api.get('/deliveries');

    const renderRows = (list) => list.map(d => `
      <tr>
        <td>Disp #${d.dispatchNo}</td>
        <td>${formatDate(d.dispatchDate)}</td>
        <td style="font-weight: 600;">Sauda #${d.saudaNo || '-'}</td>
        <td style="font-weight: 500;">${escapeHtml(d.truckNo || '-')}</td>
        <td>${escapeHtml(d.transporterName || '-')}</td>
        <td>${escapeHtml(d.billNo || '-')}</td>
        <td style="text-align: center;"><span class="badge ${d.status === 'DELIVERED' ? 'badge-active' : 'badge-draft'}">${d.status}</span></td>
        <td style="text-align: right;" onclick="event.stopPropagation()">
          <div style="display: inline-flex; gap: 0.25rem; justify-content: flex-end;">
            <a href="/deliveries/${d.id}" data-route><button class="small">${Icons.edit} Edit</button></a>
            <button class="small danger delete-row-btn" data-id="${d.id}" data-entity="deliveries">${Icons.trash}</button>
          </div>
        </td>
      </tr>
    `);

    const rowsHtml = renderRows(delList);

    container.innerHTML = DataTable({
      id: 'delivery-register-table',
      count: delList.length,
      headers: [
        { label: 'Dispatch No' },
        { label: 'Dispatch Date' },
        { label: 'Sauda Link' },
        { label: 'Lorry/Truck No' },
        { label: 'Transporter' },
        { label: 'Bill Ref' },
        { label: 'Status', align: 'center' },
        { label: 'Actions', style: 'text-align:right; width: 100px;' }
      ],
      rows: rowsHtml
    });

    attachTableSearch('search-report', document.querySelector('#delivery-register-table tbody'), delList, renderRows);
  } catch (err) {
    container.innerHTML = `<tr><td style="text-align: center; padding: 2rem; color: var(--danger);">${escapeHtml(err.message)}</td></tr>`;
  }
}

async function renderPaymentRegisterGrid(container) {
  container.innerHTML = `<tr><td style="text-align: center; padding: 2rem;"><span class="spinner"></span> Loading payments...</td></tr>`;
  try {
    const payList = await api.get('/payments');

    const renderRows = (list) => list.map(p => `
      <tr>
        <td>${formatDate(p.paymentDate)}</td>
        <td style="font-weight: 600;">${escapeHtml(p.partyName)}</td>
        <td>${escapeHtml(p.instrumentType)}</td>
        <td>${escapeHtml(p.instrumentNo || '-')}</td>
        <td>${escapeHtml(p.depositedBank || '-')}</td>
        <td style="text-align: right; font-weight: 600; color: var(--primary);" class="mono">${formatCurrency(p.amount)}</td>
        <td style="text-align: right;" onclick="event.stopPropagation()">
          <div style="display: inline-flex; gap: 0.25rem; justify-content: flex-end;">
            <a href="/payments/${p.id}" data-route><button class="small">${Icons.edit} Edit</button></a>
            <button class="small danger delete-row-btn" data-id="${p.id}" data-entity="payments">${Icons.trash}</button>
          </div>
        </td>
      </tr>
    `);

    const totalPaid = payList.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
    const rowsHtml = renderRows(payList);

    const footerHtml = `
      <tfoot>
        <tr style="font-weight: 700; background: var(--faint); border-top: 2px solid var(--border);">
          <td colspan="5">TOTAL</td>
          <td style="text-align: right; color: var(--primary);" class="mono">${formatCurrency(totalPaid)}</td>
          <td></td>
        </tr>
      </tfoot>
    `;

    container.innerHTML = DataTable({
      id: 'payment-register-table',
      count: payList.length,
      headers: [
        { label: 'Payment Date' },
        { label: 'Party / Client' },
        { label: 'Type' },
        { label: 'Ref / Cheque No' },
        { label: 'Deposited Bank' },
        { label: 'Amount Paid', align: 'right' },
        { label: 'Actions', style: 'text-align:right; width: 100px;' }
      ],
      rows: rowsHtml,
      footer: footerHtml
    });

    attachTableSearch('search-report', document.querySelector('#payment-register-table tbody'), payList, renderRows);
  } catch (err) {
    container.innerHTML = `<tr><td style="text-align: center; padding: 2rem; color: var(--danger);">${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderInterestCalculationGrid(container, items) {
  const annualInterestRate = 0.12; // 12% default annual rate

  const renderRows = (list) => list.map(item => {
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
        <td style="text-align: right;" onclick="event.stopPropagation()">
          <div style="display: inline-flex; gap: 0.25rem; justify-content: flex-end;">
            <a href="/bills/${item.billId}" data-route><button class="small">${Icons.edit} Edit</button></a>
            <button class="small danger delete-row-btn" data-id="${item.billId}" data-entity="bills">${Icons.trash}</button>
          </div>
        </td>
      </tr>
    `;
  });

  const totalPrincipal = items.reduce((sum, item) => sum + parseFloat(item.balanceAmount || '0'), 0);
  const totalInterest = items.reduce((sum, item) => sum + (item.balanceAmount * (item.overDays / 365) * annualInterestRate), 0);

  const rowsHtml = renderRows(items);

  const footerHtml = `
    <tfoot>
      <tr style="font-weight: 700; background: var(--faint); border-top: 2px solid var(--border);">
        <td colspan="3">TOTALS</td>
        <td style="text-align: right;" class="mono">${formatCurrency(totalPrincipal).replace('₹ ', '')}</td>
        <td colspan="2"></td>
        <td style="text-align: right; color: var(--primary);" class="mono">${formatCurrency(totalInterest)}</td>
        <td></td>
      </tr>
    </tfoot>
  `;

  container.innerHTML = DataTable({
    id: 'interest-calculation-table',
    count: items.length,
    headers: [
      { label: 'Bill Date' },
      { label: 'Bill No' },
      { label: 'Party / Client' },
      { label: 'Outstanding Principal', align: 'right' },
      { label: 'Delay (Days)', align: 'center' },
      { label: 'Interest Rate', align: 'center' },
      { label: 'Calculated Interest', align: 'right' },
      { label: 'Actions', style: 'text-align:right; width: 100px;' }
    ],
    rows: rowsHtml,
    footer: footerHtml
  });

  attachTableSearch('search-report', document.querySelector('#interest-calculation-table tbody'), items, renderRows);
}

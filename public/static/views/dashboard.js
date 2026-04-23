/**
 * Dashboard View — Shows key ERP metrics in a stats grid
 */
import { Icons, StatsCard, PageHeader, Spinner, formatCurrency } from '../components/ui.js';
import * as api from '../lib/api.js';

export async function renderDashboard() {
  const app = document.getElementById('app');
  app.innerHTML = Spinner();

  try {
    const metrics = await api.get('/dashboard');

    app.innerHTML = `
      ${PageHeader({ title: 'Dashboard', subtitle: 'Soft Sauda ERP — Overview' })}

      <div class="stats-grid">
        ${StatsCard({
          icon: Icons.users,
          value: metrics.parties,
          label: 'Parties',
          desc: 'Companies, clients & brokers',
          href: '/parties'
        })}

        ${StatsCard({
          icon: Icons.fileText,
          value: metrics.contracts,
          label: 'Sauda / Contracts',
          desc: 'Active trade executions',
          href: '/contracts'
        })}

        ${StatsCard({
          icon: Icons.box,
          value: metrics.deliveries,
          label: 'Deliveries',
          desc: 'Dispatched shipments',
          href: '/deliveries'
        })}

        ${StatsCard({
          icon: Icons.receipt,
          value: metrics.bills,
          label: 'Bills',
          desc: 'Generated invoices',
          href: '/bills'
        })}

        ${StatsCard({
          icon: Icons.creditCard,
          value: metrics.payments,
          label: 'Payments',
          desc: 'Received & recorded',
          href: '/payments'
        })}

        ${StatsCard({
          icon: Icons.bookOpen,
          value: formatCurrency(metrics.outstandingBalance),
          label: 'Outstanding',
          desc: 'Total balance due',
          href: '/ledger'
        })}
      </div>

      <div class="table-container" style="padding:1.5rem;">
        <h3 style="margin:0 0 0.5rem;font-size:0.875rem">Quick Actions</h3>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
          <a href="/contracts/new" data-route><button class="primary">${Icons.plus} New Sauda</button></a>
          <a href="/parties/new" data-route><button>${Icons.plus} New Party</button></a>
          <a href="/deliveries/new" data-route><button>${Icons.plus} New Delivery</button></a>
          <a href="/bills/new" data-route><button>${Icons.plus} New Bill</button></a>
        </div>
      </div>
    `;
  } catch (err) {
    app.innerHTML = `
      ${PageHeader({ title: 'Dashboard' })}
      <div class="alert danger">Failed to load dashboard: ${err.message}</div>
    `;
  }
}

/**
 * GET /api/parties/export — Full-data export for parties with tax IDs
 */

import { db } from '@/db';
import { parties, partyTaxIds, partyRoles } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { ok, serverError } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const allParties = await db.select().from(parties).orderBy(parties.name);
    const partyIds = allParties.map(p => p.id);

    let taxMap: Record<number, any[]> = {};
    let roleMap: Record<number, string[]> = {};

    if (partyIds.length > 0) {
      const allTax = await db.select().from(partyTaxIds)
        .where(sql`${partyTaxIds.partyId} IN (${sql.join(partyIds.map(id => sql`${id}`), sql`, `)})`);
      for (const t of allTax) {
        if (!taxMap[t.partyId]) taxMap[t.partyId] = [];
        taxMap[t.partyId].push(t);
      }

      const allRoles = await db.select().from(partyRoles)
        .where(sql`${partyRoles.partyId} IN (${sql.join(partyIds.map(id => sql`${id}`), sql`, `)})`);
      for (const r of allRoles) {
        if (!roleMap[r.partyId]) roleMap[r.partyId] = [];
        roleMap[r.partyId].push(r.role);
      }
    }

    const exportData = allParties.map(p => {
      const taxes = taxMap[p.id] || [];
      return {
        'Party ID': p.id,
        'Name': p.name,
        'Address': p.address || '',
        'Landmark': p.landmark || '',
        'City/Place': p.place || '',
        'State': p.stateName || '',
        'PIN Code': p.pinCode || '',
        'Phone': p.phone || '',
        'SMS Mobile': p.smsMobile || '',
        'Email': p.emailIds || '',
        'Mill': p.mill || '',
        'Designation': p.designation || '',
        'Credit Limit': p.creditLimit || '',
        'GSTIN': taxes.find(t => t.taxType === 'GSTIN')?.taxValue || '',
        'VAT TIN': taxes.find(t => t.taxType === 'VAT_TIN')?.taxValue || '',
        'CST TIN': taxes.find(t => t.taxType === 'CST_TIN')?.taxValue || '',
        'PAN': taxes.find(t => t.taxType === 'PAN')?.taxValue || '',
        'Roles': (roleMap[p.id] || []).join(', '),
        'Active': p.isActive ? 'Yes' : 'No',
      };
    });

    return ok(exportData);
  } catch (err) {
    console.error('GET /api/parties/export error:', err);
    return serverError('Failed to export parties');
  }
}

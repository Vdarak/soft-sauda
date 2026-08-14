/**
 * Automatic Bill Generator Engine (Phase 3)
 *
 * Replicates SQL Server procedure `GenerateBill`.
 * - Takes contract lines (`contract_lines` / `sauda2`) where `linkedBillId` IS NULL.
 * - Groups unbilled lines by party, creates a new `bills` record scoped to company + fiscal year.
 * - Creates corresponding `bill_lines` and updates `contract_lines.linkedBillId`.
 * - Inserts a new record in `outstanding` with payment due date calculation.
 */

import { db } from '@/db';
import { bills, billLines, contractLines, contracts, outstanding } from '@/db/schema';
import { eq, and, isNull, inArray } from 'drizzle-orm';

export interface BatchBillGenerationInput {
  companyId: number;
  fiscalYearId: number;
  contractLineIds: number[];
  basis: 'CONTRACT' | 'DELIVERY' | 'DIRECT' | 'DALALI';
  creditDays?: number;
  createdByUserId?: number;
}

export interface BillGenerationResult {
  billId: number;
  billNo: string;
  totalAmount: number;
  outstandingId: number;
  linkedLineCount: number;
}

export async function generateBillFromContractLines(
  input: BatchBillGenerationInput
): Promise<BillGenerationResult> {
  const {
    companyId,
    fiscalYearId,
    contractLineIds,
    basis,
    creditDays = 15,
    createdByUserId,
  } = input;

  if (!contractLineIds || contractLineIds.length === 0) {
    throw new Error('No contract line items specified for bill generation.');
  }

  // 1. Fetch unbilled contract lines
  const linesToBill = await db.select()
    .from(contractLines)
    .where(
      and(
        inArray(contractLines.id, contractLineIds),
        isNull(contractLines.linkedBillId)
      )
    );

  if (linesToBill.length === 0) {
    throw new Error('All selected contract lines have already been billed.');
  }

  // 2. Fetch contract header to determine primary party
  const firstLine = linesToBill[0];
  const parentContract = await db.select()
    .from(contracts)
    .where(eq(contracts.id, firstLine.contractId))
    .limit(1);

  if (parentContract.length === 0) {
    throw new Error(`Parent contract not found for contract line ID ${firstLine.id}`);
  }

  const partyId = firstLine.partyId || parentContract[0].companyId; // fallback party ID

  // 3. Generate sequential Bill Number
  const existingBills = await db.select({ count: bills.id })
    .from(bills)
    .where(
      and(
        eq(bills.companyId, companyId),
        eq(bills.fiscalYearId, fiscalYearId)
      )
    );

  const billSeq = existingBills.length + 1;
  const billNo = `BL-${String(billSeq).padStart(5, '0')}`;

  // 4. Calculate Total Bill Amount
  let totalAmount = 0;
  linesToBill.forEach((l) => {
    totalAmount += parseFloat(l.amount || '0');
  });

  totalAmount = Math.round(totalAmount * 100) / 100;

  // 5. Insert `bills` Record
  const [newBill] = await db.insert(bills).values({
    companyId,
    fiscalYearId,
    billNo,
    billDate: new Date(),
    partyId,
    basis,
    totalAmount: String(totalAmount),
    balanceAmount: String(totalAmount),
    creditDays,
    createdBy: createdByUserId,
  }).returning({ id: bills.id });

  // 6. Insert `bill_lines` & Update `contract_lines.linkedBillId`
  for (const line of linesToBill) {
    await db.insert(billLines).values({
      billId: newBill.id,
      description: `Contract Line #${line.lineNo} - Weight: ${line.weightQuintals} Qtl @ Rate ${line.rate}`,
      amount: line.amount,
      referenceType: 'CONTRACT',
      referenceId: line.id,
    });

    await db.update(contractLines)
      .set({ linkedBillId: newBill.id })
      .where(eq(contractLines.id, line.id));
  }

  // 7. Calculate Payment Due Date
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + creditDays);

  // 8. Create Entry in `outstanding`
  const [outsRecord] = await db.insert(outstanding).values({
    companyId,
    fiscalYearId,
    partyId,
    billNo,
    billAmount: String(totalAmount),
    outstandingAmount: String(totalAmount),
    receivedAmount: '0.00',
    expenseAmount: '0.00',
    clearedAmount: '0.00',
    balanceAmount: String(totalAmount),
    dueDate,
  }).returning({ id: outstanding.id });

  return {
    billId: newBill.id,
    billNo,
    totalAmount,
    outstandingId: outsRecord.id,
    linkedLineCount: linesToBill.length,
  };
}

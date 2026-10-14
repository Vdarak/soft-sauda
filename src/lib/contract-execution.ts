/**
 * Contract Execution Balance Engine
 *
 * Replicates SQL Server procedure `SP_sauda2rear`.
 * When deliveries are created, updated, or removed, recalculates:
 *   1. Cumulative dispatched weight and bags on each contract line.
 *   2. Remaining balance weight on each contract line.
 *   3. Updates contract status to COMPLETED if fully executed.
 */

import { db } from '@/db';
import { contractLines, contracts, deliveryLines } from '@/db/schema';
import { eq, sql, inArray } from 'drizzle-orm';

export interface ExecutionBalanceResult {
  contractLineId: number;
  contractId: number;
  totalWeight: number;
  dispatchedWeight: number;
  balanceWeight: number;
  isCompleted: boolean;
}

/**
 * Recalculates dispatched & balance weights for a specific set of contract line IDs.
 */
export async function updateContractExecutionBalances(
  contractLineIds: number[],
  tx?: any
): Promise<ExecutionBalanceResult[]> {
  if (!contractLineIds || contractLineIds.length === 0) return [];

  const dbCtx = tx || db;
  const uniqueLineIds = [...new Set(contractLineIds.filter((id) => id > 0))];
  if (uniqueLineIds.length === 0) return [];

  const results: ExecutionBalanceResult[] = [];
  const parentContractIds = new Set<number>();

  for (const lineId of uniqueLineIds) {
    // 1. Fetch current contract line
    const clRows = await dbCtx
      .select({
        id: contractLines.id,
        contractId: contractLines.contractId,
        weightQuintals: contractLines.weightQuintals,
      })
      .from(contractLines)
      .where(eq(contractLines.id, lineId))
      .limit(1);

    if (clRows.length === 0) continue;
    const cl = clRows[0];
    parentContractIds.add(cl.contractId);

    // 2. Sum all dispatched weight from delivery_lines
    const agg = await dbCtx
      .select({
        totalDispatchedWeight: sql<string>`COALESCE(SUM(${deliveryLines.dispatchedWeight}), 0)`,
      })
      .from(deliveryLines)
      .where(eq(deliveryLines.contractLineId, lineId));

    const totalWeight = parseFloat(cl.weightQuintals || '0');
    const dispatchedWeight = parseFloat(agg[0]?.totalDispatchedWeight || '0');
    const balanceWeight = Math.max(0, totalWeight - dispatchedWeight);

    // 3. Update contract_lines with new balances
    await dbCtx
      .update(contractLines)
      .set({
        dispatchedWeight: dispatchedWeight.toFixed(3),
        balanceWeight: balanceWeight.toFixed(3),
      })
      .where(eq(contractLines.id, lineId));

    results.push({
      contractLineId: lineId,
      contractId: cl.contractId,
      totalWeight,
      dispatchedWeight,
      balanceWeight,
      isCompleted: balanceWeight <= 0,
    });
  }

  // 4. Update parent contract status if all lines are executed
  for (const contractId of parentContractIds) {
    const allLines = await dbCtx
      .select({
        weightQuintals: contractLines.weightQuintals,
        dispatchedWeight: contractLines.dispatchedWeight,
        balanceWeight: contractLines.balanceWeight,
      })
      .from(contractLines)
      .where(eq(contractLines.contractId, contractId));

    const allExecuted =
      allLines.length > 0 &&
      allLines.every((l: any) => {
        const bal = parseFloat(l.balanceWeight ?? '0');
        const tot = parseFloat(l.weightQuintals ?? '0');
        return tot > 0 && bal <= 0;
      });

    const cRows = await dbCtx
      .select({ status: contracts.status })
      .from(contracts)
      .where(eq(contracts.id, contractId))
      .limit(1);

    if (cRows.length > 0) {
      const currentStatus = cRows[0].status;
      if (allExecuted && currentStatus === 'ACTIVE') {
        await dbCtx
          .update(contracts)
          .set({ status: 'COMPLETED' })
          .where(eq(contracts.id, contractId));
      } else if (!allExecuted && currentStatus === 'COMPLETED') {
        await dbCtx
          .update(contracts)
          .set({ status: 'ACTIVE' })
          .where(eq(contracts.id, contractId));
      }
    }
  }

  return results;
}

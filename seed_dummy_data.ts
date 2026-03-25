import * as dotenv from 'dotenv';
import { and, eq, like, sql } from 'drizzle-orm';
import {
  billLines,
  bills,
  commodityGroups,
  commodities,
  commodityPackaging,
  commoditySpecifications,
  contractLines,
  contractParties,
  contracts,
  deliveries,
  deliveryCharges,
  deliveryLines,
  ledger,
  parties,
  partyBankDetails,
  partyContacts,
  partyDeliveryAddresses,
  partyRoles,
  partyTaxIds,
  paymentAllocations,
  payments,
} from './src/db/schema';

dotenv.config({ path: '.env.local' });

async function seed() {
  const { db } = await import('./src/db/index');

  console.log('Seeding dummy data...');

  await db.transaction(async (tx) => {
    // Clean previous dummy rows.
    const dummyParties = await tx.select({ id: parties.id }).from(parties).where(like(parties.name, 'DUMMY %'));
    const partyIds = dummyParties.map((p) => p.id);

    const dummyBills = await tx.select({ id: bills.id }).from(bills).where(like(bills.billNo, 'DUMMY-%'));
    const billIds = dummyBills.map((b) => b.id);

    const dummyContracts = await tx
      .select({ id: contracts.id })
      .from(contracts)
      .where(eq(contracts.saudaBook, 'DUMMYBOOK'));
    const contractIds = dummyContracts.map((c) => c.id);

    if (billIds.length > 0) {
      await tx.delete(paymentAllocations).where(sql`${paymentAllocations.billId} = ANY(${billIds})`);
      await tx.delete(billLines).where(sql`${billLines.billId} = ANY(${billIds})`);
      await tx.delete(bills).where(sql`${bills.id} = ANY(${billIds})`);
    }

    if (contractIds.length > 0) {
      const lineIds = (await tx
        .select({ id: contractLines.id })
        .from(contractLines)
        .where(sql`${contractLines.contractId} = ANY(${contractIds})`)).map((r) => r.id);

      if (lineIds.length > 0) {
        const deliveryIds = (await tx
          .select({ id: deliveryLines.deliveryId })
          .from(deliveryLines)
          .where(sql`${deliveryLines.contractLineId} = ANY(${lineIds})`)).map((r) => r.id);

        if (deliveryIds.length > 0) {
          await tx.delete(deliveryCharges).where(sql`${deliveryCharges.deliveryId} = ANY(${deliveryIds})`);
          await tx.delete(deliveryLines).where(sql`${deliveryLines.deliveryId} = ANY(${deliveryIds})`);
          await tx.delete(deliveries).where(sql`${deliveries.id} = ANY(${deliveryIds})`);
        }

        await tx.delete(contractLines).where(sql`${contractLines.id} = ANY(${lineIds})`);
      }

      await tx.delete(contractParties).where(sql`${contractParties.contractId} = ANY(${contractIds})`);
      await tx.delete(contracts).where(sql`${contracts.id} = ANY(${contractIds})`);
    }

    const dummyCommodityIds = (await tx
      .select({ id: commodities.id })
      .from(commodities)
      .where(like(commodities.name, 'DUMMY %'))).map((r) => r.id);

    if (dummyCommodityIds.length > 0) {
      await tx.delete(commodityPackaging).where(sql`${commodityPackaging.commodityId} = ANY(${dummyCommodityIds})`);
      await tx.delete(commoditySpecifications).where(sql`${commoditySpecifications.commodityId} = ANY(${dummyCommodityIds})`);
      await tx.delete(commodities).where(sql`${commodities.id} = ANY(${dummyCommodityIds})`);
    }

    await tx.delete(commodityGroups).where(like(commodityGroups.name, 'DUMMY %'));

    const dummyPaymentIds = (await tx
      .select({ id: payments.id })
      .from(payments)
      .where(like(payments.instrumentNo, 'DUMMY-%'))).map((r) => r.id);

    if (dummyPaymentIds.length > 0) {
      await tx.delete(paymentAllocations).where(sql`${paymentAllocations.paymentId} = ANY(${dummyPaymentIds})`);
      await tx.delete(payments).where(sql`${payments.id} = ANY(${dummyPaymentIds})`);
    }

    if (partyIds.length > 0) {
      await tx.delete(ledger).where(sql`${ledger.accountId} = ANY(${partyIds})`);
      await tx.delete(partyContacts).where(sql`${partyContacts.partyId} = ANY(${partyIds})`);
      await tx.delete(partyBankDetails).where(sql`${partyBankDetails.partyId} = ANY(${partyIds})`);
      await tx.delete(partyDeliveryAddresses).where(sql`${partyDeliveryAddresses.partyId} = ANY(${partyIds})`);
      await tx.delete(partyTaxIds).where(sql`${partyTaxIds.partyId} = ANY(${partyIds})`);
      await tx.delete(partyRoles).where(sql`${partyRoles.partyId} = ANY(${partyIds})`);
      await tx.delete(parties).where(sql`${parties.id} = ANY(${partyIds})`);
    }

    // Parties and child entities.
    const partyPayload = [
      {
        name: 'DUMMY Sunrise Traders',
        place: 'Indore',
        stateName: 'Madhya Pradesh',
        pinCode: '452001',
        creditLimit: '750000.00',
        phone: '0731-4000101',
        smsMobile: '9893098901',
        address: '12 Grain Market Yard',
        landmark: 'Near Mandi Gate 2',
        mill: 'Sunrise Mill Unit 1',
        fax: '0731-4000102',
        emailIds: 'accounts@sunrise-dummy.in,sales@sunrise-dummy.in',
        designation: 'Primary Seller',
      },
      {
        name: 'DUMMY Apex Foods Pvt Ltd',
        place: 'Nagpur',
        stateName: 'Maharashtra',
        pinCode: '440001',
        creditLimit: '1200000.00',
        phone: '0712-4200202',
        smsMobile: '9822098202',
        address: '4 Processing Zone, Industrial Belt',
        landmark: 'Behind Orange Yard',
        mill: 'Apex Foods Processing',
        fax: '0712-4200203',
        emailIds: 'finance@apex-dummy.in,ops@apex-dummy.in',
        designation: 'Primary Buyer',
      },
      {
        name: 'DUMMY Northline Brokers',
        place: 'Kota',
        stateName: 'Rajasthan',
        pinCode: '324001',
        creditLimit: '300000.00',
        phone: '0744-4300303',
        smsMobile: '9818098103',
        address: '89 Broker Street',
        landmark: 'Old Grain Exchange',
        mill: 'N/A',
        fax: '0744-4300304',
        emailIds: 'desk@northline-dummy.in',
        designation: 'Seller Broker',
      },
      {
        name: 'DUMMY Westline Brokers',
        place: 'Pune',
        stateName: 'Maharashtra',
        pinCode: '411001',
        creditLimit: '280000.00',
        phone: '020-4400404',
        smsMobile: '9833098304',
        address: '17 Brokerage Plaza',
        landmark: 'Near APMC Annex',
        mill: 'N/A',
        fax: '020-4400405',
        emailIds: 'desk@westline-dummy.in',
        designation: 'Buyer Broker',
      },
      {
        name: 'DUMMY Rapid Logistics',
        place: 'Surat',
        stateName: 'Gujarat',
        pinCode: '395003',
        creditLimit: '450000.00',
        phone: '0261-4500505',
        smsMobile: '9876598705',
        address: 'Transport Hub, Ring Road',
        landmark: 'Dock Gate 5',
        mill: 'N/A',
        fax: '0261-4500506',
        emailIds: 'fleet@rapid-dummy.in',
        designation: 'Transporter',
      },
      {
        name: 'DUMMY Lotus Agro',
        place: 'Bhopal',
        stateName: 'Madhya Pradesh',
        pinCode: '462001',
        creditLimit: '650000.00',
        phone: '0755-4600606',
        smsMobile: '9907099006',
        address: '21 Agro Park',
        landmark: 'Near Ring Warehouse',
        mill: 'Lotus Unit 3',
        fax: '0755-4600607',
        emailIds: 'billing@lotus-dummy.in',
        designation: 'Secondary Buyer',
      },
    ];

    const insertedParties = await tx.insert(parties).values(partyPayload).returning({ id: parties.id, name: parties.name });
    const p = Object.fromEntries(insertedParties.map((row) => [row.name, row.id]));

    await tx.insert(partyRoles).values([
      { partyId: p['DUMMY Sunrise Traders'], role: 'SELLER' },
      { partyId: p['DUMMY Apex Foods Pvt Ltd'], role: 'BUYER' },
      { partyId: p['DUMMY Lotus Agro'], role: 'BUYER' },
      { partyId: p['DUMMY Northline Brokers'], role: 'SELLER_BROKER' },
      { partyId: p['DUMMY Westline Brokers'], role: 'BUYER_BROKER' },
      { partyId: p['DUMMY Rapid Logistics'], role: 'SELLER' },
    ]);

    for (const row of insertedParties) {
      await tx.insert(partyTaxIds).values([
        { partyId: row.id, taxType: 'GSTIN', taxValue: `27DUMMY${row.id.toString().padStart(5, '0')}Z5` },
        { partyId: row.id, taxType: 'VAT_TIN', taxValue: `VAT-DUM-${row.id}` },
        { partyId: row.id, taxType: 'CST_TIN', taxValue: `CSTTIN-DUM-${row.id}` },
        { partyId: row.id, taxType: 'CST_NO', taxValue: `CSTNO-DUM-${row.id}` },
        { partyId: row.id, taxType: 'PAN', taxValue: `DUMPA${row.id.toString().padStart(5, '0')}Q` },
      ]);

      await tx.insert(partyDeliveryAddresses).values({
        partyId: row.id,
        addressLine: `Warehouse ${row.id}, Dummy Logistics Park`,
        city: 'Dummy City',
        state: 'Dummy State',
        pincode: `40${row.id.toString().padStart(4, '0')}`,
      });

      await tx.insert(partyBankDetails).values({
        partyId: row.id,
        bankName: 'Dummy National Bank',
        accountNo: `0011223344${row.id.toString().padStart(2, '0')}`,
        ifscCode: `DUMM000${row.id.toString().padStart(3, '0')}`,
        branch: 'Main Branch',
      });

      await tx.insert(partyContacts).values({
        partyId: row.id,
        contactName: `Dummy Contact ${row.id}`,
        contactNumber: `900000${row.id.toString().padStart(4, '0')}`,
      });
    }

    // Commodity hierarchy.
    const [groupFeed, groupPulse] = await tx.insert(commodityGroups).values([
      { name: 'DUMMY FEED' },
      { name: 'DUMMY PULSE' },
    ]).returning({ id: commodityGroups.id, name: commodityGroups.name });

    const insertedCommodities = await tx.insert(commodities).values([
      {
        groupId: groupFeed.id,
        name: 'DUMMY MAIZE FEED PREMIUM',
        description: 'Dummy maize feed for QA and CRUD checks',
        shortName: 'D-MAIZE',
        unit: 'QTL',
        hsnCode: '23099090',
      },
      {
        groupId: groupPulse.id,
        name: 'DUMMY CHANA SPLIT',
        description: 'Dummy split chana lot',
        shortName: 'D-CHANA',
        unit: 'QTL',
        hsnCode: '07139010',
      },
      {
        groupId: groupFeed.id,
        name: 'DUMMY SOYA DOC',
        description: 'Dummy soy doc for testing contract flows',
        shortName: 'D-SOYA',
        unit: 'QTL',
        hsnCode: '23040000',
      },
    ]).returning({ id: commodities.id, name: commodities.name });

    const c = Object.fromEntries(insertedCommodities.map((row) => [row.name, row.id]));

    for (const comm of insertedCommodities) {
      await tx.insert(commodityPackaging).values([
        {
          commodityId: comm.id,
          packingWeight: '50.000',
          packingType: 'Katta',
          sellerBrokerageRate: '6.50',
          sellerBrokerageType: 'PQtl',
          buyerBrokerageRate: '5.75',
          buyerBrokerageType: 'PQtl',
        },
        {
          commodityId: comm.id,
          packingWeight: '25.000',
          packingType: 'Bag',
          sellerBrokerageRate: '3.50',
          sellerBrokerageType: 'PQtl',
          buyerBrokerageRate: '3.00',
          buyerBrokerageType: 'PQtl',
        },
      ]);

      await tx.insert(commoditySpecifications).values([
        { commodityId: comm.id, specification: 'MOISTURE', specValue: '11.50', minMax: 'Max', remarks: 'Dummy QA limit' },
        { commodityId: comm.id, specification: 'BROKEN', specValue: '2.00', minMax: 'Max', remarks: 'Dummy breakage' },
        { commodityId: comm.id, specification: 'FOREIGN_MATTER', specValue: '0.80', minMax: 'Max', remarks: 'Dummy impurity cap' },
      ]);
    }

    const packagingRows = await tx.select().from(commodityPackaging);

    // Contracts + lines + parties.
    const insertedContracts = await tx.insert(contracts).values([
      {
        saudaNo: 9001,
        saudaBook: 'DUMMYBOOK',
        saudaDate: new Date('2026-03-01'),
        status: 'ACTIVE',
        deliveryTerm: 'Ex-Godown',
        customRemarks: 'Dummy contract 1 for edit testing',
      },
      {
        saudaNo: 9002,
        saudaBook: 'DUMMYBOOK',
        saudaDate: new Date('2026-03-03'),
        status: 'ACTIVE',
        deliveryTerm: 'FOR Destination',
        customRemarks: 'Dummy contract 2 for delivery mapping',
      },
      {
        saudaNo: 9003,
        saudaBook: 'DUMMYBOOK',
        saudaDate: new Date('2026-03-05'),
        status: 'ACTIVE',
        deliveryTerm: 'Door Delivery',
        customRemarks: 'Dummy contract 3 with alternate buyer',
      },
    ]).returning({ id: contracts.id, saudaNo: contracts.saudaNo });

    const ct = Object.fromEntries(insertedContracts.map((row) => [row.saudaNo, row.id]));

    await tx.insert(contractParties).values([
      { contractId: ct[9001], partyId: p['DUMMY Sunrise Traders'], role: 'SELLER' },
      { contractId: ct[9001], partyId: p['DUMMY Apex Foods Pvt Ltd'], role: 'BUYER' },
      { contractId: ct[9001], partyId: p['DUMMY Northline Brokers'], role: 'SELLER_BROKER' },
      { contractId: ct[9001], partyId: p['DUMMY Westline Brokers'], role: 'BUYER_BROKER' },

      { contractId: ct[9002], partyId: p['DUMMY Sunrise Traders'], role: 'SELLER' },
      { contractId: ct[9002], partyId: p['DUMMY Lotus Agro'], role: 'BUYER' },
      { contractId: ct[9002], partyId: p['DUMMY Northline Brokers'], role: 'SELLER_BROKER' },
      { contractId: ct[9002], partyId: p['DUMMY Westline Brokers'], role: 'BUYER_BROKER' },

      { contractId: ct[9003], partyId: p['DUMMY Sunrise Traders'], role: 'SELLER' },
      { contractId: ct[9003], partyId: p['DUMMY Apex Foods Pvt Ltd'], role: 'BUYER' },
      { contractId: ct[9003], partyId: p['DUMMY Northline Brokers'], role: 'SELLER_BROKER' },
      { contractId: ct[9003], partyId: p['DUMMY Westline Brokers'], role: 'BUYER_BROKER' },
    ]);

    function pickPackaging(commodityId: number): number | null {
      const row = packagingRows.find((r) => r.commodityId === commodityId);
      return row ? row.id : null;
    }

    const insertedLines = await tx.insert(contractLines).values([
      {
        contractId: ct[9001],
        commodityId: c['DUMMY MAIZE FEED PREMIUM'],
        packagingId: pickPackaging(c['DUMMY MAIZE FEED PREMIUM']),
        brand: 'DUMMY-GOLD',
        quantityBags: '1600.00',
        weightQuintals: '800.000',
        rate: '2460.00',
        amount: '1968000.00',
      },
      {
        contractId: ct[9002],
        commodityId: c['DUMMY CHANA SPLIT'],
        packagingId: pickPackaging(c['DUMMY CHANA SPLIT']),
        brand: 'DUMMY-SILVER',
        quantityBags: '1200.00',
        weightQuintals: '600.000',
        rate: '5820.00',
        amount: '3492000.00',
      },
      {
        contractId: ct[9003],
        commodityId: c['DUMMY SOYA DOC'],
        packagingId: pickPackaging(c['DUMMY SOYA DOC']),
        brand: 'DUMMY-PLAT',
        quantityBags: '900.00',
        weightQuintals: '450.000',
        rate: '4290.00',
        amount: '1930500.00',
      },
    ]).returning({ id: contractLines.id, contractId: contractLines.contractId });

    const lineByContract = new Map<number, number>();
    for (const row of insertedLines) lineByContract.set(row.contractId, row.id);

    // Deliveries + lines + charges.
    const insertedDeliveries = await tx.insert(deliveries).values([
      { dispatchDate: new Date('2026-03-08'), truckNo: 'DUMMY-MH12-1001', transporterId: p['DUMMY Rapid Logistics'], status: 'DISPATCHED' },
      { dispatchDate: new Date('2026-03-10'), truckNo: 'DUMMY-MH12-1002', transporterId: p['DUMMY Rapid Logistics'], status: 'DELIVERED' },
      { dispatchDate: new Date('2026-03-12'), truckNo: 'DUMMY-MH12-1003', transporterId: p['DUMMY Rapid Logistics'], status: 'DISPATCHED' },
    ]).returning({ id: deliveries.id });

    await tx.insert(deliveryLines).values([
      { deliveryId: insertedDeliveries[0].id, contractLineId: lineByContract.get(ct[9001])!, dispatchedBags: '400.00', dispatchedWeight: '200.000' },
      { deliveryId: insertedDeliveries[1].id, contractLineId: lineByContract.get(ct[9002])!, dispatchedBags: '300.00', dispatchedWeight: '150.000' },
      { deliveryId: insertedDeliveries[2].id, contractLineId: lineByContract.get(ct[9003])!, dispatchedBags: '250.00', dispatchedWeight: '125.000' },
    ]);

    await tx.insert(deliveryCharges).values([
      { deliveryId: insertedDeliveries[0].id, chargeType: 'FREIGHT_ADVANCE', amount: '25000.00' },
      { deliveryId: insertedDeliveries[1].id, chargeType: 'ADD', amount: '3000.00' },
      { deliveryId: insertedDeliveries[2].id, chargeType: 'LESS', amount: '1500.00' },
    ]);

    // Bills + lines.
    const insertedBills = await tx.insert(bills).values([
      {
        billNo: 'DUMMY-BILL-001',
        billDate: new Date('2026-03-14'),
        partyId: p['DUMMY Apex Foods Pvt Ltd'],
        basis: 'CONTRACT',
        totalAmount: '410000.00',
        balanceAmount: '410000.00',
        creditDays: 21,
      },
      {
        billNo: 'DUMMY-BILL-002',
        billDate: new Date('2026-03-15'),
        partyId: p['DUMMY Lotus Agro'],
        basis: 'DELIVERY',
        totalAmount: '295000.00',
        balanceAmount: '295000.00',
        creditDays: 14,
      },
      {
        billNo: 'DUMMY-BILL-003',
        billDate: new Date('2026-03-16'),
        partyId: p['DUMMY Apex Foods Pvt Ltd'],
        basis: 'DALALI',
        totalAmount: '78500.00',
        balanceAmount: '78500.00',
        creditDays: 7,
      },
    ]).returning({ id: bills.id, billNo: bills.billNo, partyId: bills.partyId, totalAmount: bills.totalAmount });

    await tx.insert(billLines).values([
      { billId: insertedBills[0].id, description: 'Dummy contract settlement lot A', amount: '410000.00', referenceType: 'CONTRACT', referenceId: ct[9001] },
      { billId: insertedBills[1].id, description: 'Dummy dispatch-based invoice', amount: '295000.00', referenceType: 'DELIVERY', referenceId: insertedDeliveries[1].id },
      { billId: insertedBills[2].id, description: 'Dummy brokerage bill', amount: '78500.00', referenceType: 'DALALI', referenceId: ct[9003] },
    ]);

    // Payments + allocations + update bill balances.
    const insertedPayments = await tx.insert(payments).values([
      {
        paymentDate: new Date('2026-03-18'),
        partyId: p['DUMMY Apex Foods Pvt Ltd'],
        instrumentType: 'NEFT',
        instrumentNo: 'DUMMY-NEFT-001',
        amount: '150000.00',
        depositedBank: 'Dummy National Bank',
      },
      {
        paymentDate: new Date('2026-03-19'),
        partyId: p['DUMMY Lotus Agro'],
        instrumentType: 'CHEQUE',
        instrumentNo: 'DUMMY-CHQ-002',
        amount: '100000.00',
        depositedBank: 'Dummy National Bank',
      },
    ]).returning({ id: payments.id });

    await tx.insert(paymentAllocations).values([
      { paymentId: insertedPayments[0].id, billId: insertedBills[0].id, allocatedAmount: '150000.00' },
      { paymentId: insertedPayments[1].id, billId: insertedBills[1].id, allocatedAmount: '100000.00' },
    ]);

    await tx.update(bills).set({ balanceAmount: '260000.00' }).where(eq(bills.id, insertedBills[0].id));
    await tx.update(bills).set({ balanceAmount: '195000.00' }).where(eq(bills.id, insertedBills[1].id));

    // Ledger entries for full financial flow.
    await tx.insert(ledger).values([
      {
        transactionDate: new Date('2026-03-14'),
        accountId: p['DUMMY Apex Foods Pvt Ltd'],
        sourceType: 'BILL',
        sourceId: insertedBills[0].id,
        debit: '410000.00',
        credit: '0.00',
        narration: 'Dummy bill debit posted: DUMMY-BILL-001',
      },
      {
        transactionDate: new Date('2026-03-15'),
        accountId: p['DUMMY Lotus Agro'],
        sourceType: 'BILL',
        sourceId: insertedBills[1].id,
        debit: '295000.00',
        credit: '0.00',
        narration: 'Dummy bill debit posted: DUMMY-BILL-002',
      },
      {
        transactionDate: new Date('2026-03-16'),
        accountId: p['DUMMY Apex Foods Pvt Ltd'],
        sourceType: 'BILL',
        sourceId: insertedBills[2].id,
        debit: '78500.00',
        credit: '0.00',
        narration: 'Dummy bill debit posted: DUMMY-BILL-003',
      },
      {
        transactionDate: new Date('2026-03-18'),
        accountId: p['DUMMY Apex Foods Pvt Ltd'],
        sourceType: 'PAYMENT',
        sourceId: insertedPayments[0].id,
        debit: '0.00',
        credit: '150000.00',
        narration: 'Dummy payment received against DUMMY-BILL-001',
      },
      {
        transactionDate: new Date('2026-03-19'),
        accountId: p['DUMMY Lotus Agro'],
        sourceType: 'PAYMENT',
        sourceId: insertedPayments[1].id,
        debit: '0.00',
        credit: '100000.00',
        narration: 'Dummy payment received against DUMMY-BILL-002',
      },
      {
        transactionDate: new Date('2026-03-20'),
        accountId: p['DUMMY Sunrise Traders'],
        sourceType: 'MANUAL',
        sourceId: 99001,
        debit: '25000.00',
        credit: '0.00',
        narration: 'Dummy manual adjustment for testing ledger edit',
      },
    ]);
  });

  console.log('Dummy data seeded successfully.');
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});

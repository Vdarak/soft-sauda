#!/usr/bin/env python3
"""
Soft Sauda: Remaining Entities Data Migration
Transfers:
- Banks (bankmst: 48,922)
- Transporters (trptmst: 116)
- Vehicles (vehmst: 10)
- Expense Heads (expmst: 10)
- Terms & Conditions (termmst: 12)
- Couriers (coumst: 4)
- Proprietors (propmst: 3)
- Narration Templates (narrmst: 21)
- Account Groups (groupmst: 29)
- Commodity Specifications (itemspec: 205)
- Commodity Packaging (itemstp: 219)
- Payments (payment: 7,944)
- Outstanding & Bills (outstanding: 126,444)
- Outstanding Details (outsdet: 3,369)
"""

import sys
import os
import re
import time
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime

DATABASE_URL = os.environ.get('DATABASE_URL', 'postgres://postgres:postgres@localhost:5432/postgres')
SQL_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'schemawithdata.sql')

TOKEN_RE = re.compile(
    r"""
    CAST\s*\(\s*N?'(?P<cast_val>[^']*)'\s*AS\s+\w+\s*\)
    | N?'(?P<str_val>(?:''|[^'])*)'
    | (?P<num_val>NULL|-?\d+(?:\.\d+)?)
    """,
    re.VERBOSE | re.IGNORECASE
)

def read_sql_statements(file_path):
    target_prefixes = (
        'INSERT [dbo].[bankmst]',
        'INSERT [dbo].[trptmst]',
        'INSERT [dbo].[vehmst]',
        'INSERT [dbo].[expmst]',
        'INSERT [dbo].[termmst]',
        'INSERT [dbo].[coumst]',
        'INSERT [dbo].[propmst]',
        'INSERT [dbo].[narrmst]',
        'INSERT [dbo].[groupmst]',
        'INSERT [dbo].[itemspec]',
        'INSERT [dbo].[itemstp]',
        'INSERT [dbo].[payment]',
        'INSERT [dbo].[outstanding]',
        'INSERT [dbo].[outsdet]',
        'INSERT [dbo].[accountmst]',
        'INSERT [dbo].[itemmst]'
    )
    with open(file_path, 'r', encoding='utf-16le', errors='ignore') as f:
        buffer = []
        in_string = False
        for line in f:
            if not buffer:
                if not any(line.startswith(p) for p in target_prefixes):
                    continue
            buffer.append(line)
            cleaned = line.replace("''", "")
            if cleaned.count("'") % 2 != 0:
                in_string = not in_string
            if not in_string and line.rstrip().endswith(')'):
                yield ''.join(buffer)
                buffer = []

def parse_sql_insert(stmt):
    m = re.match(r'INSERT\s+(?:INTO\s+)?\[?dbo\]?\.?\[?(\w+)\]?\s*\((.*?)\)\s*VALUES\s*\((.*)\)', stmt.strip(), re.DOTALL)
    if not m:
        return None, None, None
    table_name = m.group(1)
    cols = [c.strip().strip('[]"') for c in m.group(2).split(',')]
    vals_str = m.group(3)
    
    vals = []
    for match in TOKEN_RE.finditer(vals_str):
        if match.group('cast_val') is not None:
            vals.append(match.group('cast_val'))
        elif match.group('str_val') is not None:
            vals.append(match.group('str_val').replace("''", "'").strip())
        elif match.group('num_val') is not None:
            num = match.group('num_val')
            vals.append(None if num.upper() == 'NULL' else num)
        else:
            vals.append(None)
            
    return table_name, cols, vals

def clean_str(val, max_len=None):
    if val is None:
        return None
    s = str(val).strip()
    if not s or s.upper() == 'NULL':
        return None
    if max_len and len(s) > max_len:
        s = s[:max_len]
    return s

def clean_num(val, default=None):
    if val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default

def clean_int(val, default=None):
    if val is None:
        return default
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return default

def clean_date(val):
    if not val:
        return None
    s = str(val).strip()
    if not s or s.lower() == 'null':
        return None
    m = re.match(r'^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?', s)
    if m:
        try:
            yr, mo, dy = int(m.group(1)), int(m.group(2)), int(m.group(3))
            hr = int(m.group(4) or 0)
            mn = int(m.group(5) or 0)
            sc = int(m.group(6) or 0)
            if 1900 <= yr <= 2100 and 1 <= mo <= 12 and 1 <= dy <= 31:
                return f"{yr:04d}-{mo:02d}-{dy:02d} {hr:02d}:{mn:02d}:{sc:02d}"
        except Exception:
            pass
    return None

def main():
    print("=" * 70)
    print("🚀 MIGRATING REMAINING ENTITIES FROM LEGACY SQL DUMP")
    print(f"📁 Source: {SQL_FILE}")
    print(f"🐘 Target: {DATABASE_URL}")
    print("=" * 70)

    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor()

    t_start = time.time()

    # Step 1: Preload existing IDs from DB
    print("\n[STEP 1] Preloading existing reference maps...")
    cur.execute("SELECT legacy_cocode, id FROM companies WHERE legacy_cocode IS NOT NULL;")
    cocode_to_company = {r[0]: r[1] for r in cur.fetchall()}

    cur.execute("SELECT company_id, id FROM fiscal_years;")
    comp_to_fy = {}
    for cid, fyid in cur.fetchall():
        if cid not in comp_to_fy:
            comp_to_fy[cid] = fyid

    cur.execute("SELECT id, name FROM parties;")
    party_name_to_id = {r[1].strip().upper(): r[0] for r in cur.fetchall()}

    cur.execute("SELECT id, name FROM commodities;")
    comm_name_to_id = {r[1].strip().upper(): r[0] for r in cur.fetchall()}

    cur.execute("SELECT id FROM states;")
    valid_states = {r[0] for r in cur.fetchall()}

    cur.execute("SELECT id FROM cities;")
    valid_cities = {r[0] for r in cur.fetchall()}

    default_party_id = list(party_name_to_id.values())[0] if party_name_to_id else 1
    default_comm_id = list(comm_name_to_id.values())[0] if comm_name_to_id else 1

    print(f"  ✓ Companies: {len(cocode_to_company)}, FYs: {len(comp_to_fy)}, Parties: {len(party_name_to_id)}, Commodities: {len(comm_name_to_id)}")

    # Step 2: Streaming scan of schemawithdata.sql
    print("\n[STEP 2] Scanning & Buffering records from dump...")
    legacy_account_to_name = {}
    legacy_item_to_name = {}

    banks_batch = []
    transporters_batch = []
    vehicles_batch = []
    expense_heads_batch = []
    terms_batch = []
    couriers_batch = []
    proprietors_batch = []
    narrations_batch = []
    groups_batch = []
    specs_batch = []
    packings_batch = []
    payments_raw = []
    outstanding_raw = []
    outsdet_raw = []

    t_scan = time.time()
    for stmt in read_sql_statements(SQL_FILE):
        tbl, cols, vals = parse_sql_insert(stmt)
        if not vals:
            continue
        d = dict(zip(cols, vals))

        if tbl == 'accountmst':
            sno = clean_int(d.get('sno'))
            nm = clean_str(d.get('ac_name'))
            if sno and nm:
                legacy_account_to_name[sno] = nm.strip().upper()

        elif tbl == 'itemmst':
            sno = clean_int(d.get('sno'))
            nm = clean_str(d.get('item_nm'))
            if sno and nm:
                legacy_item_to_name[sno] = nm.strip().upper()

        elif tbl == 'bankmst':
            sno = clean_int(d.get('sno'))
            name = clean_str(d.get('bnk_name'), 250) or 'Bank'
            branch = clean_str(d.get('bnk_brnch') or d.get('bnk_branch'), 250)
            ifsc = clean_str(d.get('bnk_ifsc'), 30)
            micr = clean_str(d.get('bnk_micr'), 30)
            add = clean_str(d.get('bnk_add'), 250)
            add1 = clean_str(d.get('bnk_add1'), 250)
            center = clean_str(d.get('bnk_center'), 100)
            cont = clean_str(d.get('bnk_cont'), 100)
            dist = clean_str(d.get('bnk_dist'), 100)
            st = clean_int(d.get('bnk_state'))
            st_id = st if st in valid_states else None
            banks_batch.append((sno, name, branch, ifsc, micr, add, add1, center, cont, dist, st_id))

        elif tbl == 'trptmst':
            sno = clean_int(d.get('sno'))
            name = clean_str(d.get('tr_name'), 250) or 'Transporter'
            add1 = clean_str(d.get('tr_add1'), 250)
            add2 = clean_str(d.get('tr_add2'), 250)
            plc = clean_int(d.get('tr_place'))
            city_id = plc if plc in valid_cities else None
            pin = clean_str(d.get('tr_pin'), 20)
            cont = clean_str(d.get('tr_cont'), 100)
            pho = clean_str(d.get('tr_pho'), 30)
            phr = clean_str(d.get('tr_phr'), 30)
            phm = clean_str(d.get('tr_phm'), 30)
            pan = clean_str(d.get('tr_pan'), 30)
            eml = clean_str(d.get('tr_email'), 100)
            transporters_batch.append((sno, name, add1, add2, city_id, pin, cont, pho, phr, phm, pan, eml))

        elif tbl == 'vehmst':
            sno = clean_int(d.get('sno'))
            name = clean_str(d.get('veh_name'), 100) or 'Truck'
            std_w = clean_num(d.get('veh_wght'))
            app_w = clean_str(d.get('veh_apprxwght'), 50)
            min_w = clean_num(d.get('veh_minapprx'))
            max_w = clean_num(d.get('veh_maxapprx'))
            vehicles_batch.append((sno, name, std_w, app_w, min_w, max_w))

        elif tbl == 'expmst':
            sno = clean_int(d.get('sno'))
            name = clean_str(d.get('expnm'), 100) or 'Expense'
            typ = clean_str(d.get('type'), 20)
            expense_heads_batch.append((sno, name, typ))

        elif tbl == 'termmst':
            sno = clean_int(d.get('sno'))
            term = clean_str(d.get('term'))
            if term:
                terms_batch.append((sno, term))

        elif tbl == 'coumst':
            sno = clean_int(d.get('sno'))
            name = clean_str(d.get('ac_name'), 150) or 'Courier'
            add1 = clean_str(d.get('ac_add1'), 250)
            plc = clean_int(d.get('ac_place'))
            city_id = plc if plc in valid_cities else None
            pin = clean_str(d.get('ac_pin'), 20)
            pho = clean_str(d.get('ac_pho'), 30)
            phm = clean_str(d.get('ac_phm'), 30)
            couriers_batch.append((sno, name, add1, city_id, pin, pho, phm))

        elif tbl == 'propmst':
            sno = clean_int(d.get('sno'))
            name = clean_str(d.get('ac_name'), 150) or 'Proprietor'
            add1 = clean_str(d.get('ac_add1'), 250)
            add2 = clean_str(d.get('ac_add2'), 250)
            plc = clean_int(d.get('ac_place'))
            city_id = plc if plc in valid_cities else None
            pin = clean_str(d.get('ac_pin'), 20)
            cont = clean_str(d.get('ac_cont'), 100)
            pho = clean_str(d.get('ac_pho'), 30)
            phr = clean_str(d.get('ac_phr'), 30)
            phm = clean_str(d.get('ac_phm'), 30)
            tin = clean_str(d.get('ac_tin'), 30)
            pan = clean_str(d.get('ac_pan'), 30)
            eml = clean_str(d.get('ac_email'), 100)
            proprietors_batch.append((sno, name, add1, add2, city_id, pin, cont, pho, phr, phm, tin, pan, eml))

        elif tbl == 'narrmst':
            sno = clean_int(d.get('sno'))
            nar = clean_str(d.get('narration'))
            typ = clean_str(d.get('type'), 20)
            if nar:
                narrations_batch.append((sno, nar, typ))

        elif tbl == 'groupmst':
            sno = clean_int(d.get('g_sno') or d.get('sno'))
            name = clean_str(d.get('g_name'), 100)
            typ = clean_str(d.get('g_type'), 50)
            sup = (clean_str(d.get('g_supprs')) or '').upper() == 'Y'
            p_id = clean_int(d.get('g_sgrp'))
            if name:
                groups_batch.append((sno, name, typ, sup, p_id))

        elif tbl == 'itemspec':
            sno = clean_int(d.get('sno'))
            itm_sno = clean_int(d.get('itm_sno'))
            spec_nm = clean_str(d.get('spec_nm'), 100)
            spec_val = clean_num(d.get('spec_val'))
            min_max = clean_str(d.get('spec_minmax'), 20)
            rmk = clean_str(d.get('spec_rmk'))
            specs_batch.append((sno, itm_sno, spec_nm, spec_val, min_max, rmk))

        elif tbl == 'itemstp':
            it_sno = clean_int(d.get('it_sno'))
            it_pck = clean_num(d.get('it_pck'), 50.0)
            it_bk = clean_str(d.get('it_bk'), 20) or 'BAG'
            r_sl = clean_num(d.get('it_ratesl'), 0.0)
            rt_sl = clean_str(d.get('it_ratetypsl'), 20)
            r_br = clean_num(d.get('it_ratebr'), 0.0)
            rt_br = clean_str(d.get('it_ratetypbr'), 20)
            packings_batch.append((it_sno, it_pck, it_bk, r_sl, rt_sl, r_br, rt_br))

        elif tbl == 'payment':
            payments_raw.append(d)

        elif tbl == 'outstanding':
            outstanding_raw.append(d)

        elif tbl == 'outsdet':
            outsdet_raw.append(d)

    print(f"  ✓ Scan completed in {time.time()-t_scan:.2f}s.")
    print(f"    Banks: {len(banks_batch):,}")
    print(f"    Transporters: {len(transporters_batch):,}")
    print(f"    Vehicles: {len(vehicles_batch):,}")
    print(f"    Expense Heads: {len(expense_heads_batch):,}")
    print(f"    Terms & Conditions: {len(terms_batch):,}")
    print(f"    Couriers: {len(couriers_batch):,}")
    print(f"    Proprietors: {len(proprietors_batch):,}")
    print(f"    Narration Templates: {len(narrations_batch):,}")
    print(f"    Account Groups: {len(groups_batch):,}")
    print(f"    Commodity Specs: {len(specs_batch):,}")
    print(f"    Commodity Packings: {len(packings_batch):,}")
    print(f"    Payments: {len(payments_raw):,}")
    print(f"    Outstanding: {len(outstanding_raw):,}")
    print(f"    Outstanding Details: {len(outsdet_raw):,}")

    # Step 3: Insert Masters
    print("\n[STEP 3] Inserting Masters into PostgreSQL...")

    # Banks
    if banks_batch:
        execute_values(cur, """
            INSERT INTO banks (id, bank_name, branch, ifsc_code, micr_code, address, address1, center, contact_person, district_name, state_id)
            VALUES %s
            ON CONFLICT (id) DO UPDATE SET
                bank_name = EXCLUDED.bank_name,
                branch = EXCLUDED.branch,
                ifsc_code = EXCLUDED.ifsc_code;
        """, banks_batch, page_size=5000)
        cur.execute("SELECT setval('banks_id_seq', COALESCE((SELECT MAX(id) FROM banks), 1));")
        conn.commit()
        print(f"  ✓ Banks inserted: {len(banks_batch):,}")

    # Transporters
    if transporters_batch:
        execute_values(cur, """
            INSERT INTO transporters (id, name, address1, address2, city_id, pincode, contact_person, phone_office, phone_res, mobile, pan_no, email)
            VALUES %s
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        """, transporters_batch)
        cur.execute("SELECT setval('transporters_id_seq', COALESCE((SELECT MAX(id) FROM transporters), 1));")
        conn.commit()
        print(f"  ✓ Transporters inserted: {len(transporters_batch):,}")

    # Vehicles
    if vehicles_batch:
        execute_values(cur, """
            INSERT INTO vehicles (id, vehicle_type, standard_weight, approx_weight_text, min_weight, max_weight)
            VALUES %s
            ON CONFLICT (vehicle_type) DO UPDATE SET standard_weight = EXCLUDED.standard_weight;
        """, vehicles_batch)
        cur.execute("SELECT setval('vehicles_id_seq', COALESCE((SELECT MAX(id) FROM vehicles), 1));")
        conn.commit()
        print(f"  ✓ Vehicles inserted: {len(vehicles_batch):,}")

    # Expense Heads
    if expense_heads_batch:
        execute_values(cur, """
            INSERT INTO expense_heads (id, name, expense_type)
            VALUES %s
            ON CONFLICT (name) DO UPDATE SET expense_type = EXCLUDED.expense_type;
        """, expense_heads_batch)
        cur.execute("SELECT setval('expense_heads_id_seq', COALESCE((SELECT MAX(id) FROM expense_heads), 1));")
        conn.commit()
        print(f"  ✓ Expense Heads inserted: {len(expense_heads_batch):,}")

    # Terms & Conditions
    if terms_batch:
        execute_values(cur, """
            INSERT INTO terms_conditions (id, term_text)
            VALUES %s
            ON CONFLICT (id) DO UPDATE SET term_text = EXCLUDED.term_text;
        """, terms_batch)
        cur.execute("SELECT setval('terms_conditions_id_seq', COALESCE((SELECT MAX(id) FROM terms_conditions), 1));")
        conn.commit()
        print(f"  ✓ Terms & Conditions inserted: {len(terms_batch):,}")

    # Couriers
    if couriers_batch:
        execute_values(cur, """
            INSERT INTO couriers (id, name, address1, city_id, pincode, phone, mobile)
            VALUES %s
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        """, couriers_batch)
        cur.execute("SELECT setval('couriers_id_seq', COALESCE((SELECT MAX(id) FROM couriers), 1));")
        conn.commit()
        print(f"  ✓ Couriers inserted: {len(couriers_batch):,}")

    # Proprietors
    if proprietors_batch:
        execute_values(cur, """
            INSERT INTO proprietors (id, firm_name, address1, address2, city_id, pincode, contact_person, phone, phone_res, mobile, tin_no, pan_no, email)
            VALUES %s
            ON CONFLICT (id) DO UPDATE SET firm_name = EXCLUDED.firm_name;
        """, proprietors_batch)
        cur.execute("SELECT setval('proprietors_id_seq', COALESCE((SELECT MAX(id) FROM proprietors), 1));")
        conn.commit()
        print(f"  ✓ Proprietors inserted: {len(proprietors_batch):,}")

    # Narration Templates
    if narrations_batch:
        execute_values(cur, """
            INSERT INTO narration_templates (id, template_text, voucher_type)
            VALUES %s
            ON CONFLICT (id) DO UPDATE SET template_text = EXCLUDED.template_text;
        """, narrations_batch)
        cur.execute("SELECT setval('narration_templates_id_seq', COALESCE((SELECT MAX(id) FROM narration_templates), 1));")
        conn.commit()
        print(f"  ✓ Narration Templates inserted: {len(narrations_batch):,}")

    # Account Groups
    if groups_batch:
        # First insert roots (without parent_group_id)
        roots = [(g[0], g[1], g[2], g[3], None) for g in groups_batch]
        execute_values(cur, """
            INSERT INTO account_groups (id, name, group_type, suppress_flag, parent_group_id)
            VALUES %s
            ON CONFLICT (name) DO UPDATE SET group_type = EXCLUDED.group_type;
        """, roots)
        # Then update parent_group_id
        for g in groups_batch:
            if g[4]:
                cur.execute("UPDATE account_groups SET parent_group_id = %s WHERE id = %s;", (g[4], g[0]))
        cur.execute("SELECT setval('account_groups_id_seq', COALESCE((SELECT MAX(id) FROM account_groups), 1));")
        conn.commit()
        print(f"  ✓ Account Groups inserted: {len(groups_batch):,}")

    # Build resolved party and commodity lookup:
    # sno -> name -> id
    party_id_map = {}
    for sno, nm in legacy_account_to_name.items():
        if nm in party_name_to_id:
            party_id_map[sno] = party_name_to_id[nm]
    
    comm_id_map = {}
    for sno, nm in legacy_item_to_name.items():
        if nm in comm_name_to_id:
            comm_id_map[sno] = comm_name_to_id[nm]

    # Commodity Specifications
    specs_to_insert = []
    for s in specs_batch:
        sno, itm_sno, spec_nm, spec_val, min_max, rmk = s
        cid = comm_id_map.get(itm_sno, default_comm_id)
        if spec_nm:
            specs_to_insert.append((cid, spec_nm, spec_val, min_max, rmk))

    if specs_to_insert:
        execute_values(cur, """
            INSERT INTO commodity_specifications (commodity_id, specification, spec_value, min_max, remarks)
            VALUES %s
            ON CONFLICT DO NOTHING;
        """, specs_to_insert, page_size=2000)
        conn.commit()
        print(f"  ✓ Commodity Specifications inserted: {len(specs_to_insert):,}")

    # Commodity Packaging
    packings_to_insert = []
    for p in packings_batch:
        it_sno, it_pck, it_bk, r_sl, rt_sl, r_br, rt_br = p
        cid = comm_id_map.get(it_sno, default_comm_id)
        packings_to_insert.append((cid, it_pck, it_bk, r_sl, rt_sl, r_br, rt_br))

    if packings_to_insert:
        execute_values(cur, """
            INSERT INTO commodity_packaging (commodity_id, packing_weight, packing_type, seller_brokerage_rate, seller_brokerage_type, buyer_brokerage_rate, buyer_brokerage_type)
            VALUES %s
            ON CONFLICT DO NOTHING;
        """, packings_to_insert, page_size=2000)
        conn.commit()
        print(f"  ✓ Commodity Packings inserted: {len(packings_to_insert):,}")

    # Step 4: Payments
    print("\n[STEP 4] Ingesting Payments...")
    cur.execute("SELECT id FROM banks;")
    valid_banks = {r[0] for r in cur.fetchall()}
    cur.execute("SELECT id FROM couriers;")
    valid_couriers = {r[0] for r in cur.fetchall()}

    payments_to_insert = []
    for d in payments_raw:
        sno = clean_int(d.get('sno'))
        cocode = clean_int(d.get('cocode'), 1)
        comp_id = cocode_to_company.get(cocode, 1)
        fy_id = comp_to_fy.get(comp_id, 67)
        pdate = clean_date(d.get('pay_date')) or '2012-04-01 00:00:00'
        sl_code = clean_int(d.get('sl_code'))
        p_id = party_id_map.get(sl_code, default_party_id)
        itype = clean_str(d.get('chkddtyp'), 20) or 'CHEQUE'
        ino = clean_str(d.get('chkddno'), 50)
        idt = clean_date(d.get('chkdddt'))
        amt = clean_num(d.get('chkddamt'), 0.0)
        dep_bnk = clean_int(d.get('dep_bnk'))
        dep_bnk_id = dep_bnk if dep_bnk in valid_banks else None
        dep_ac = clean_str(d.get('dep_ac'), 50)
        cou = clean_int(d.get('courier'))
        cou_id = cou if cou in valid_couriers else None
        cou_rec = clean_str(d.get('cou_rec'), 50)
        cou_chg = clean_num(d.get('cou_chgs'))
        rmk1 = clean_str(d.get('rmks1'), 250)
        rmk2 = clean_str(d.get('rmks2'), 250)

        payments_to_insert.append((
            sno, comp_id, fy_id, pdate, p_id, itype, ino, idt, amt,
            dep_bnk_id, dep_ac, cou_id, cou_rec, cou_chg, rmk1, rmk2
        ))

    if payments_to_insert:
        execute_values(cur, """
            INSERT INTO payments (
                id, company_id, fiscal_year_id, payment_date, party_id, instrument_type,
                instrument_no, instrument_date, amount, deposit_bank_id, deposit_account_no,
                courier_id, courier_receipt_no, courier_charges, remarks1, remarks2
            )
            VALUES %s
            ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount;
        """, payments_to_insert, page_size=2000)
        cur.execute("SELECT setval('payments_id_seq', COALESCE((SELECT MAX(id) FROM payments), 1));")
        conn.commit()
        print(f"  ✓ Payments inserted: {len(payments_to_insert):,}")

    # Step 5: Outstanding & Bills
    print("\n[STEP 5] Ingesting Outstanding & Bills...")
    outstanding_to_insert = []
    bills_to_insert = []
    seen_bills = set()

    for d in outstanding_raw:
        sno = clean_int(d.get('sno'))
        cocode = clean_int(d.get('cocode'), 1)
        comp_id = cocode_to_company.get(cocode, 1)
        fy_id = comp_to_fy.get(comp_id, 67)
        vouc_code = clean_str(d.get('vouc_code'), 50) or str(sno)
        sl_code = clean_int(d.get('sl_code'))
        p_id = party_id_map.get(sl_code, default_party_id)
        sdate = clean_date(d.get('sd_date')) or '2012-04-01 00:00:00'
        b_amt = clean_num(d.get('bill_amt') or d.get('vouc_amt'), 0.0)
        bal_amt = clean_num(d.get('bal_amt'), b_amt)
        adj_amt = clean_num(d.get('adj_amt'), 0.0)
        exp_amt = clean_num(d.get('exp_amt'), 0.0)
        clr_amt = clean_num(d.get('clr_amt'), 0.0)

        outstanding_to_insert.append((
            sno, comp_id, fy_id, p_id, vouc_code, sdate, b_amt, b_amt,
            adj_amt, exp_amt, clr_amt, bal_amt
        ))

        bill_key = (comp_id, fy_id, vouc_code)
        if bill_key not in seen_bills:
            seen_bills.add(bill_key)
            bills_to_insert.append((
                comp_id, fy_id, vouc_code, sdate, p_id, 'CONTRACT', b_amt, bal_amt
            ))

    if outstanding_to_insert:
        execute_values(cur, """
            INSERT INTO outstanding (
                id, company_id, fiscal_year_id, party_id, bill_no, po_date,
                bill_amount, outstanding_amount, received_amount, expense_amount,
                cleared_amount, balance_amount
            )
            VALUES %s
            ON CONFLICT (id) DO UPDATE SET
                bill_amount = EXCLUDED.bill_amount,
                balance_amount = EXCLUDED.balance_amount;
        """, outstanding_to_insert, page_size=5000)
        cur.execute("SELECT setval('outstanding_id_seq', COALESCE((SELECT MAX(id) FROM outstanding), 1));")
        conn.commit()
        print(f"  ✓ Outstanding records inserted: {len(outstanding_to_insert):,}")

    if bills_to_insert:
        execute_values(cur, """
            INSERT INTO bills (
                company_id, fiscal_year_id, bill_no, bill_date, party_id,
                basis, total_amount, balance_amount
            )
            VALUES %s
            ON CONFLICT (company_id, fiscal_year_id, bill_no) DO UPDATE SET
                total_amount = EXCLUDED.total_amount,
                balance_amount = EXCLUDED.balance_amount;
        """, bills_to_insert, page_size=5000)
        cur.execute("SELECT setval('bills_id_seq', COALESCE((SELECT MAX(id) FROM bills), 1));")
        conn.commit()
        print(f"  ✓ Bills inserted: {len(bills_to_insert):,}")

    # Step 6: Outstanding Details
    print("\n[STEP 6] Ingesting Outstanding Details...")
    cur.execute("SELECT id FROM outstanding;")
    valid_outs = {r[0] for r in cur.fetchall()}
    cur.execute("SELECT id FROM expense_heads;")
    valid_exps = {r[0] for r in cur.fetchall()}

    outsdet_to_insert = []
    for d in outsdet_raw:
        sno = clean_int(d.get('sno'))
        if sno not in valid_outs:
            continue
        exp_code = clean_int(d.get('exp_code'))
        exp_id = exp_code if exp_code in valid_exps else None
        rate = clean_num(d.get('exp_rate'), 0.0)
        amt = clean_num(d.get('exp_amt'), 0.0)
        outsdet_to_insert.append((sno, exp_id, rate, amt))

    if outsdet_to_insert:
        execute_values(cur, """
            INSERT INTO outstanding_details (outstanding_id, expense_head_id, expense_rate, expense_amount)
            VALUES %s;
        """, outsdet_to_insert, page_size=2000)
        conn.commit()
        print(f"  ✓ Outstanding Details inserted: {len(outsdet_to_insert):,}")

    cur.close()
    conn.close()

    print("\n" + "=" * 70)
    print(f"🎉 ALL REMAINING ENTITIES MIGRATED SUCCESSFULLY IN {time.time()-t_start:.2f}s!")
    print("=" * 70)

if __name__ == '__main__':
    main()

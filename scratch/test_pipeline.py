#!/usr/bin/env python3
"""
Test Pipeline for Soft Sauda Migration with 50 contracts limit.
"""
import os
import re
import sys
import time
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime

DATABASE_URL = os.environ.get('DATABASE_URL', 'postgres://postgres:postgres@localhost:5432/postgres')
SQL_FILE = 'schemawithdata.sql'

TOKEN_RE = re.compile(
    r"""
    CAST\s*\(\s*N?'(?P<cast_val>[^']*)'\s*AS\s+\w+\s*\)
    | N?'(?P<str_val>(?:''|[^'])*)'
    | (?P<num_val>NULL|-?\d+(?:\.\d+)?)
    """,
    re.VERBOSE | re.IGNORECASE
)

def read_sql_statements(file_path):
    with open(file_path, 'r', encoding='utf-16le', errors='ignore') as f:
        buffer = []
        in_string = False
        for line in f:
            if not buffer and not line.startswith('INSERT [dbo].['):
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
    if not s:
        return None
    if max_len and len(s) > max_len:
        s = s[:max_len]
    return s

def clean_num(val):
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None

def clean_date(val):
    if not val:
        return None
    s = str(val).strip()
    if not s or s.lower() == 'null':
        return None
    try:
        if '-' in s:
            return s.split('.')[0].replace('T', ' ')
        if '/' in s:
            parts = s.split('/')
            if len(parts) == 3:
                d, m, y = parts
                if len(y) == 2:
                    y = '20' + y
                return f"{y.zfill(4)}-{m.zfill(2)}-{d.zfill(2)}"
        return None
    except Exception:
        return None

def main():
    limit_contracts = 50
    print("=" * 60)
    print(f"🚀 RUNNING TEST PIPELINE (limit: {limit_contracts} contracts)")
    print("=" * 60)

    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor()

    t_start = time.time()

    # In-memory master buffers
    raw_states = []
    raw_districts = []
    raw_stations = []
    raw_groups = []
    raw_items = []
    raw_terms = []
    raw_accounts = []
    raw_banks = []
    distinct_cocodes = {1, 9, 17, 33, 47}
    distinct_fys = set()

    print("\n[PASS 1] Ingesting all Masters & Scanning Companies from SQL dump...")
    t_pass1 = time.time()

    for stmt in read_sql_statements(SQL_FILE):
        if stmt.startswith('INSERT [dbo].[statemst]'):
            _, cols, vals = parse_sql_insert(stmt)
            if vals: raw_states.append(dict(zip(cols, vals)))
        elif stmt.startswith('INSERT [dbo].[distmst]'):
            _, cols, vals = parse_sql_insert(stmt)
            if vals: raw_districts.append(dict(zip(cols, vals)))
        elif stmt.startswith('INSERT [dbo].[stationmst]'):
            _, cols, vals = parse_sql_insert(stmt)
            if vals: raw_stations.append(dict(zip(cols, vals)))
        elif stmt.startswith('INSERT [dbo].[groupmst]'):
            _, cols, vals = parse_sql_insert(stmt)
            if vals: raw_groups.append(dict(zip(cols, vals)))
        elif stmt.startswith('INSERT [dbo].[itemmst]'):
            _, cols, vals = parse_sql_insert(stmt)
            if vals: raw_items.append(dict(zip(cols, vals)))
        elif stmt.startswith('INSERT [dbo].[termmst]'):
            _, cols, vals = parse_sql_insert(stmt)
            if vals: raw_terms.append(dict(zip(cols, vals)))
        elif stmt.startswith('INSERT [dbo].[accountmst]'):
            _, cols, vals = parse_sql_insert(stmt)
            if vals: raw_accounts.append(dict(zip(cols, vals)))
        elif stmt.startswith('INSERT [dbo].[bankmst]'):
            _, cols, vals = parse_sql_insert(stmt)
            if vals: raw_banks.append(dict(zip(cols, vals)))
        elif stmt.startswith('INSERT [dbo].[sauda1]'):
            m_co = re.search(r'VALUES\s*\(\s*\d+,\s*N?\'([^\']+)\',\s*(\d+)', stmt)
            if m_co:
                yr = m_co.group(1).strip()
                co = int(m_co.group(2))
                distinct_cocodes.add(co)
                distinct_fys.add((co, yr))

    print(f"  ✓ Ingested in {time.time()-t_pass1:.2f}s:")
    print(f"    States: {len(raw_states)}, Districts: {len(raw_districts)}, Stations: {len(raw_stations)}")
    print(f"    Groups: {len(raw_groups)}, Items: {len(raw_items)}, Accounts: {len(raw_accounts)}, Banks: {len(raw_banks)}")
    print(f"    Distinct Firms: {len(distinct_cocodes)}, Firm-FYs: {len(distinct_fys)}")

    # 1. Departments & Companies
    depts = [
        ('Pulses', 'PULSES', '🌾', 'Pulses & Grains Trading Division'),
        ('Soybean & Wheat', 'SOYWHEAT', '🌻', 'Soybean, Wheat & Oilseeds Division'),
        ('Oil & Cake', 'OILCAKE', '🫒', 'Edible Oils & Cottonseed Cake Division'),
        ('MAFI', 'MAFI', '🏭', 'MAFI Division'),
    ]
    execute_values(cur, """
        INSERT INTO departments (name, short_code, icon, description)
        VALUES %s
        ON CONFLICT (name) DO UPDATE SET short_code = EXCLUDED.short_code;
    """, depts)
    cur.execute("SELECT id, short_code FROM departments;")
    dept_map = {row[1]: row[0] for row in cur.fetchall()}
    pulses_dept_id = dept_map.get('PULSES', 1)

    known_firms = {
        1: ('Ganesh Canvassing Company', 'GCC', 'Ganesh Canvassing Company - Pulses Brokerage'),
        9: ('Saraswati Enterprises', 'SARASWATI', 'Saraswati Enterprises'),
        17: ('South India Corporation', 'SIC', 'South India Corporation'),
        33: ('Gokul Enterprises', 'GOKUL', 'Gokul Enterprises'),
        47: ('Siddhant Commercial Corporation', 'SIDDHANT', 'Siddhant Commercial Corporation'),
    }

    company_map = {}
    for cocode in sorted(list(distinct_cocodes)):
        if cocode in known_firms:
            name, short_code, desc = known_firms[cocode]
        else:
            name = f"Firm {cocode}"
            short_code = f"FIRM{cocode}"
            desc = f"Legacy trading firm #{cocode}"

        cur.execute("""
            INSERT INTO companies (department_id, legacy_cocode, name, short_code, description)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (name) DO UPDATE SET legacy_cocode = EXCLUDED.legacy_cocode, department_id = EXCLUDED.department_id
            RETURNING id;
        """, (pulses_dept_id, cocode, name, short_code, desc))
        company_map[cocode] = cur.fetchone()[0]

    fy_map = {}
    for cocode, yr_str in distinct_fys:
        comp_id = company_map[cocode]
        parts = yr_str.replace(' ', '').split('-')
        if len(parts) == 2 and len(parts[0]) == 4:
            s_yr = int(parts[0])
            e_yr = int(parts[1]) if len(parts[1]) == 4 else s_yr + 1
            s_dt = f"{s_yr}-04-01 00:00:00"
            e_dt = f"{e_yr}-03-31 23:59:59"
            label = f"FY {s_yr}-{str(e_yr)[-2:]}"
        else:
            s_dt = "2020-04-01 00:00:00"
            e_dt = "2021-03-31 23:59:59"
            label = f"FY {yr_str.strip()}"

        cur.execute("""
            INSERT INTO fiscal_years (company_id, label, start_date, end_date, is_current, is_locked)
            VALUES (%s, %s, %s, %s, false, true)
            ON CONFLICT (company_id, label) DO UPDATE SET start_date = EXCLUDED.start_date
            RETURNING id;
        """, (comp_id, label, s_dt, e_dt))
        fy_map[(cocode, yr_str.strip())] = cur.fetchone()[0]

    # 2. Geography
    state_map = {}
    for d in raw_states:
        sno = int(d['sno'])
        name = clean_str(d.get('state_nm'))
        if name:
            cur.execute("""
                INSERT INTO states (name) VALUES (%s)
                ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
                RETURNING id;
            """, (name,))
            state_map[sno] = cur.fetchone()[0]

    default_dist_map = {}
    for sno, st_id in state_map.items():
        cur.execute("""
            INSERT INTO districts (state_id, name) VALUES (%s, 'General')
            ON CONFLICT (state_id, name) DO UPDATE SET name = EXCLUDED.name
            RETURNING id;
        """, (st_id,))
        default_dist_map[st_id] = cur.fetchone()[0]

    dist_map = {}
    for d in raw_districts:
        sno = int(d['sno'])
        name = clean_str(d.get('dist_nm'))
        st_sno = int(d.get('state_cd', 0) or 0)
        st_id = state_map.get(st_sno)
        if name and st_id:
            cur.execute("""
                INSERT INTO districts (state_id, name) VALUES (%s, %s)
                ON CONFLICT (state_id, name) DO UPDATE SET state_id = EXCLUDED.state_id
                RETURNING id;
            """, (st_id, name))
            dist_map[sno] = cur.fetchone()[0]

    city_map = {}
    for d in raw_stations:
        sno = int(d['sno'])
        name = clean_str(d.get('st_name'))
        st_sno = int(d.get('st_state', 0) or 0)
        d_sno = int(d.get('st_district', 0) or 0)
        pin = clean_str(d.get('st_pincode'), 10)
        std = clean_str(d.get('st_stdcd'), 10)
        st_id = state_map.get(st_sno)
        dist_id = dist_map.get(d_sno) or default_dist_map.get(st_id)
        if not dist_id:
            dist_id = list(default_dist_map.values())[0] if default_dist_map else 1
        if name:
            cur.execute("""
                INSERT INTO cities (district_id, name, pincode, std_code)
                VALUES (%s, %s, %s, %s)
                RETURNING id;
            """, (dist_id, name, pin, std))
            city_map[sno] = cur.fetchone()[0]

    # 3. Commodities & Terms
    comm_group_map = {}
    for d in raw_groups:
        sno = int(d.get('g_sno') or d.get('sno') or 0)
        name = clean_str(d.get('g_name') or d.get('grp_nm'))
        if name and sno:
            cur.execute("""
                INSERT INTO commodity_groups (name) VALUES (%s)
                ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
                RETURNING id;
            """, (name,))
            comm_group_map[sno] = cur.fetchone()[0]

    comm_map = {}
    for d in raw_items:
        sno = int(d['sno'])
        name = clean_str(d.get('item_nm'))
        unit = clean_str(d.get('item_unit'), 20) or 'Quintal'
        if name:
            cur.execute("""
                INSERT INTO commodities (name, unit)
                VALUES (%s, %s)
                ON CONFLICT (name) DO UPDATE SET unit = EXCLUDED.unit
                RETURNING id;
            """, (name, unit))
            comm_map[sno] = cur.fetchone()[0]

    for d in raw_terms:
        term = clean_str(d.get('term'))
        if term:
            cur.execute("INSERT INTO terms_conditions (term_text) VALUES (%s);", (term,))

    # Master directory of banks
    bank_dir = {}
    for d in raw_banks:
        sno = int(d['sno'])
        nm = clean_str(d.get('bnk_name'), 100) or 'Bank'
        br = clean_str(d.get('bnk_brnch') or d.get('bnk_branch'), 100)
        ifsc = clean_str(d.get('bnk_ifsc'), 20)
        bank_dir[sno] = (nm, br, ifsc)

    # 4. Parties, Roles, Tax, Banks
    party_map = {}
    party_roles_batch = []
    party_tax_batch = []
    bank_batch = []

    for d in raw_accounts:
        sno = int(d['sno'])
        name = clean_str(d.get('ac_name'))
        if not name: continue
        add1 = clean_str(d.get('ac_add1'))
        add2 = clean_str(d.get('ac_add2'))
        addr = f"{add1 or ''} {add2 or ''}".strip() or None
        place = clean_str(d.get('ac_place'))
        pin = clean_str(d.get('ac_pin'), 10)
        phone = clean_str(d.get('ac_pho') or d.get('ac_phm'), 20)
        email = clean_str(d.get('ac_email'), 100)
        pan = clean_str(d.get('ac_pan'), 20)
        vat = clean_str(d.get('ac_vat'), 30)
        gstin = clean_str(d.get('ac_gstin'), 30)

        cur.execute("""
            INSERT INTO parties (name, address, place, pin_code, phone, email_ids)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (name) DO UPDATE SET place = COALESCE(EXCLUDED.place, parties.place)
            RETURNING id;
        """, (name, addr, place, pin, phone, email))
        p_id = cur.fetchone()[0]
        party_map[sno] = p_id

        if pan: party_tax_batch.append((p_id, 'PAN', pan))
        if vat: party_tax_batch.append((p_id, 'VAT_TIN', vat))
        if gstin: party_tax_batch.append((p_id, 'GSTIN', gstin))

        p_type = clean_str(d.get('p_type'), 10) or 'BOTH'
        roles = []
        if 'B' in p_type.upper(): roles.append('BUYER')
        if 'S' in p_type.upper(): roles.append('SELLER')
        if 'R' in p_type.upper(): roles.extend(['BUYER_BROKER', 'SELLER_BROKER'])
        if not roles: roles = ['BUYER', 'SELLER']
        for r in roles: party_roles_batch.append((p_id, r))

        # Check bank accounts 1, 2, 3
        for b_idx in [1, 2, 3]:
            b_sno = int(d.get(f'ac_bnk{b_idx}', 0) or 0)
            ac_no = clean_str(d.get(f'ac_bnkac{b_idx}'), 50)
            if ac_no or b_sno:
                b_info = bank_dir.get(b_sno, ('Bank', None, None))
                bank_batch.append((p_id, b_info[0], b_info[1], ac_no or '-', b_info[2]))

    if party_roles_batch:
        execute_values(cur, "INSERT INTO party_roles (party_id, role) VALUES %s ON CONFLICT DO NOTHING;", party_roles_batch)
    if party_tax_batch:
        execute_values(cur, "INSERT INTO party_tax_ids (party_id, tax_type, tax_value) VALUES %s ON CONFLICT DO NOTHING;", party_tax_batch)
    if bank_batch:
        execute_values(cur, "INSERT INTO party_bank_details (party_id, bank_name, branch, account_no, ifsc_code) VALUES %s;", bank_batch)

    conn.commit()
    print("  ✓ All Masters committed into PostgreSQL.")

    # ══════════════════════════════════════════════════════════════
    # PASS 2: TRANSACTIONS (sauda1, sauda2, saudaspec, saudatrms)
    # ══════════════════════════════════════════════════════════════
    print(f"\n[PASS 2] Streaming Transactions (Test limit: {limit_contracts} contracts)...")
    t_pass2 = time.time()
    legacy_sno_to_contract_id = {}
    vouc_to_contract_id = {}
    contract_parties_batch = []
    sauda1_count = 0

    sauda2_count = 0
    lines_batch = []
    seen_lines = set()

    spec_batch = []
    spec_count = 0

    terms_batch = []
    terms_count = 0

    docs_batch = []
    docs_count = 0

    target_contract_ids = set()

    for stmt in read_sql_statements(SQL_FILE):
        if stmt.startswith('INSERT [dbo].[sauda1]'):
            if sauda1_count >= limit_contracts:
                continue
            _, cols, vals = parse_sql_insert(stmt)
            if vals:
                d = dict(zip(cols, vals))
                sno = int(d['sno'])
                yr_str = clean_str(d.get('yr'))
                cocode = int(d.get('cocode', 1) or 1)
                vouc_code = int(d.get('vouc_code', 0) or 0)
                sd_date = clean_date(d.get('sd_date')) or datetime.now().strftime('%Y-%m-%d')
                prefix = clean_str(d.get('c_j_s_p'), 10) or 'SD'
                
                comp_id = company_map.get(cocode, 1)
                fy_id = fy_map.get((cocode, yr_str), 1)

                delv_to = clean_date(d.get('delv_to'))
                delv_term = clean_str(d.get('term') or d.get('delvdet'), 100)
                orig = clean_str(d.get('from_ct') or d.get('origin'), 100)
                dest = clean_str(d.get('to_ct'), 100)
                apprx = clean_num(d.get('apprxwght'))
                paycond = clean_str(d.get('paycond'), 50)
                discrt = clean_num(d.get('paydiscrt'))
                pono = clean_str(d.get('pono'), 50)
                podt = clean_date(d.get('podt'))
                rmks = clean_str(d.get('rmks'))
                book = clean_str(d.get('main_bk'), 20) or prefix or 'SD'

                pay_term = 'DISCOUNT'
                if paycond:
                    if 'CRED' in paycond.upper():
                        pay_term = 'CREDIT'
                    elif 'PAY' in paycond.upper() or 'IMM' in paycond.upper():
                        pay_term = 'PAYMENT'

                cur.execute("""
                    INSERT INTO contracts (
                        company_id, fiscal_year_id, sauda_no, sauda_book, sauda_prefix, sauda_date,
                        delivery_term, delivery_deadline_date, origin_station, destination_station,
                        approx_weight, payment_term_type, cash_discount_rate, po_number, po_date,
                        custom_remarks, status, created_by, updated_by
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s,
                        %s, %s, %s, %s, %s,
                        %s, 'ACTIVE', 1, 1
                    )
                    ON CONFLICT (company_id, fiscal_year_id, sauda_book, sauda_no) DO UPDATE
                    SET sauda_date = EXCLUDED.sauda_date
                    RETURNING id;
                """, (
                    comp_id, fy_id, vouc_code, book, prefix, sd_date,
                    delv_term, delv_to, orig, dest,
                    apprx, pay_term, discrt, pono, podt,
                    rmks
                ))
                contract_id = cur.fetchone()[0]
                legacy_sno_to_contract_id[sno] = contract_id
                vouc_to_contract_id[(cocode, yr_str, vouc_code)] = contract_id
                target_contract_ids.add(contract_id)

                sl_code = int(d.get('sl_code', 0) or 0)
                br_code = int(d.get('br_code', 0) or 0)
                sb_code = int(d.get('sb_code', 0) or 0)
                bb_code = int(d.get('bb_code', 0) or 0)

                if sl_code in party_map:
                    contract_parties_batch.append((contract_id, party_map[sl_code], 'SELLER'))
                if br_code in party_map:
                    contract_parties_batch.append((contract_id, party_map[br_code], 'BUYER'))
                if sb_code in party_map:
                    contract_parties_batch.append((contract_id, party_map[sb_code], 'SELLER_BROKER'))
                if bb_code in party_map:
                    contract_parties_batch.append((contract_id, party_map[bb_code], 'BUYER_BROKER'))

                sauda1_count += 1

        elif stmt.startswith('INSERT [dbo].[sauda2]'):
            _, cols, vals = parse_sql_insert(stmt)
            if vals:
                d = dict(zip(cols, vals))
                cont_sno = int(d.get('cont_sno', 0) or 0)
                contract_id = legacy_sno_to_contract_id.get(cont_sno)
                if not contract_id: continue

                sr_no = int(d.get('sr_no', 1) or 1)
                if (cont_sno, sr_no) in seen_lines: continue
                seen_lines.add((cont_sno, sr_no))

                it_code = int(d.get('it_code', 0) or 0)
                comm_id = comm_map.get(it_code, 1)
                bag = clean_num(d.get('bag'))
                pck = clean_num(d.get('pck'))
                wght = clean_num(d.get('wght')) or 0.0
                rate = clean_num(d.get('b_rate')) or 0.0
                amt = clean_num(d.get('amount')) or (wght * rate) or 0.0
                slbrk = clean_num(d.get('slbrk_rt'))
                brbrk = clean_num(d.get('brbrk_rt'))
                brand = clean_str(d.get('brnd_code'), 50)

                lines_batch.append((
                    contract_id, sr_no, comm_id, brand,
                    bag, pck, wght, rate, amt, slbrk, brbrk
                ))
                sauda2_count += 1

        elif stmt.startswith('INSERT [dbo].[saudaspec]'):
            _, cols, vals = parse_sql_insert(stmt)
            if vals:
                d = dict(zip(cols, vals))
                cocode = int(d.get('cocode', 1) or 1)
                yr = clean_str(d.get('yr'))
                vouc = int(d.get('vouc_code', 0) or 0)
                contract_id = vouc_to_contract_id.get((cocode, yr, vouc))
                if contract_id:
                    name = clean_str(d.get('spec_nm'))
                    val = clean_num(d.get('spec_val'))
                    mm = clean_str(d.get('spec_minmax'), 20)
                    rem = clean_str(d.get('spec_rmk'))
                    if name:
                        spec_batch.append((contract_id, name, val, mm, rem))
                        spec_count += 1

        elif stmt.startswith('INSERT [dbo].[saudatrms]'):
            _, cols, vals = parse_sql_insert(stmt)
            if vals:
                d = dict(zip(cols, vals))
                cocode = int(d.get('cocode', 1) or 1)
                yr = clean_str(d.get('yr'))
                vouc = int(d.get('vouc_code', 0) or 0)
                contract_id = vouc_to_contract_id.get((cocode, yr, vouc))
                if contract_id:
                    narr = clean_str(d.get('narration'))
                    if narr:
                        terms_batch.append((contract_id, narr, terms_count))
                        terms_count += 1

        elif stmt.startswith('INSERT [dbo].[saudadocu]'):
            _, cols, vals = parse_sql_insert(stmt)
            if vals:
                d = dict(zip(cols, vals))
                cocode = int(d.get('cocode', 1) or 1)
                yr = clean_str(d.get('yr'))
                vouc = int(d.get('vouc_code', 0) or 0)
                contract_id = vouc_to_contract_id.get((cocode, yr, vouc))
                if contract_id:
                    narr = clean_str(d.get('narration'))
                    if narr:
                        docs_batch.append((contract_id, narr, docs_count))
                        docs_count += 1

    # Flush all transactions
    if contract_parties_batch:
        execute_values(cur, "INSERT INTO contract_parties (contract_id, party_id, role) VALUES %s;", contract_parties_batch)
    if lines_batch:
        execute_values(cur, """
            INSERT INTO contract_lines (
                contract_id, line_no, commodity_id, brand,
                quantity_bags, pack_weight, weight_quintals, rate, amount,
                seller_brokerage_rate, buyer_brokerage_rate
            ) VALUES %s;
        """, lines_batch)
    if spec_batch:
        execute_values(cur, """
            INSERT INTO contract_specifications (contract_id, spec_name, spec_value, min_max, remarks)
            VALUES %s;
        """, spec_batch)
    if terms_batch:
        execute_values(cur, """
            INSERT INTO contract_terms (contract_id, narration, sort_order)
            VALUES %s;
        """, terms_batch)
    if docs_batch:
        execute_values(cur, """
            INSERT INTO contract_documents (contract_id, narration, sort_order)
            VALUES %s;
        """, docs_batch)

    conn.commit()

    print(f"  ✓ Contracts migrated: {sauda1_count}")
    print(f"  ✓ Contract Lines migrated: {sauda2_count}")
    print(f"  ✓ Contract Specifications migrated: {spec_count}")
    print(f"  ✓ Contract Terms migrated: {terms_count}")
    print(f"  ✓ Contract Documents migrated: {docs_count}")
    print(f"  ✓ Pass 2 completed in {time.time()-t_pass2:.2f}s")

    cur.close()
    conn.close()
    print("\n" + "=" * 60)
    print(f"🎉 TEST PIPELINE COMPLETED IN {time.time()-t_start:.2f}s!")
    print("=" * 60)

if __name__ == '__main__':
    main()

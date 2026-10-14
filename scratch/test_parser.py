import re
from datetime import datetime

# Regex for SQL Server tokens:
# 1. CAST(N'...' AS DateTime) or CAST('...' AS DateTime)
# 2. String literal: N'...' or '...'
# 3. Numeric / identifier / NULL
TOKEN_RE = re.compile(
    r"""
    CAST\s*\(\s*N?'(?P<cast_val>[^']*)'\s*AS\s+\w+\s*\)  # CAST date
    | N?'(?P<str_val>(?:''|[^'])*)'                     # String (with '' escapes)
    | (?P<num_val>NULL|-?\d+(?:\.\d+)?)                 # NULL or numbers
    """,
    re.VERBOSE | re.IGNORECASE
)

def parse_sql_insert(line):
    # Format: INSERT [dbo].[table_name] ([c1], [c2], ...) VALUES (v1, v2, ...)
    m = re.match(r'INSERT\s+(?:INTO\s+)?\[?dbo\]?\.?\[?(\w+)\]?\s*\((.*?)\)\s*VALUES\s*\((.*)\)', line.strip(), re.DOTALL)
    if not m:
        return None, None, None
    table_name = m.group(1)
    cols_str = m.group(2)
    vals_str = m.group(3)
    
    cols = [c.strip().strip('[]"') for c in cols_str.split(',')]
    
    vals = []
    for match in TOKEN_RE.finditer(vals_str):
        if match.group('cast_val') is not None:
            # e.g. 2012-04-01T00:00:00.000
            dt_str = match.group('cast_val')
            vals.append(dt_str)
        elif match.group('str_val') is not None:
            vals.append(match.group('str_val').replace("''", "'").strip())
        elif match.group('num_val') is not None:
            num = match.group('num_val')
            if num.upper() == 'NULL':
                vals.append(None)
            else:
                vals.append(num)
        else:
            vals.append(None)
            
    return table_name, cols, vals

if __name__ == '__main__':
    with open('schemawithdata.sql', 'r', encoding='utf-16le', errors='ignore') as f:
        count = 0
        for line in f:
            if line.startswith('INSERT [dbo].['):
                tbl, cols, vals = parse_sql_insert(line)
                if tbl in ('statemst', 'distmst', 'stationmst', 'groupmst', 'itemmst', 'accountmst', 'sauda1', 'saudaspec'):
                    print(f"Table: {tbl}")
                    print(f"Cols ({len(cols)}): {cols[:5]}")
                    print(f"Vals ({len(vals)}): {vals[:5]}")
                    print("-" * 40)
                    count += 1
                    if count >= 8:
                        break

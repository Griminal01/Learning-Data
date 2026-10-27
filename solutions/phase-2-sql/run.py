import sqlite3, sys, re, os
db = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'line_d.db')
con = sqlite3.connect(db)
sql = open(sys.argv[1]).read()
for stmt in [s.strip() for s in sql.split(';') if s.strip() and not all(l.strip().startswith('--') or not l.strip() for l in s.strip().splitlines())]:
    title = [l for l in stmt.splitlines() if l.startswith('--')]
    print('====', title[-1] if title else stmt[:60])
    cur = con.execute(stmt)
    rows = cur.fetchall()
    print([d[0] for d in cur.description])
    for r in rows[:int(sys.argv[2]) if len(sys.argv) > 2 else 12]: print(r)
    print(f'({len(rows)} rows)')

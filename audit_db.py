import psycopg
conn = psycopg.connect('dbname=plataforma_questoes user=joao_xavier password=sua_senha_segura12 host=localhost port=5432')
cur = conn.cursor()

cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'feedbacks_questoes' ORDER BY ordinal_position")
print('feedbacks_questoes columns:')
for r in cur.fetchall(): print(' ', r)

cur.execute("SELECT indexname, tablename, indexdef FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename")
print('\nIndexes:')
for r in cur.fetchall(): print(' ', r)

cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name")
print('\nAll tables:')
for r in cur.fetchall(): print(' ', r)
conn.close()

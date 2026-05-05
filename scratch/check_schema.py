import psycopg2
from database import DB_CONFIG

def check_schema():
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    tables = ['sessoes_estudo', 'questoes', 'usuarios', 'sessoes_questoes']
    for table in tables:
        print(f"\n--- {table} ---")
        cur.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{table}'")
        for row in cur.fetchall():
            print(row)
    
    conn.close()

if __name__ == "__main__":
    check_schema()

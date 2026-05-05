import os
from dotenv import load_dotenv
import psycopg

load_dotenv()

DB_CONFIG = {
    "host":     os.getenv("DB_HOST", "localhost"),
    "port":     int(os.getenv("DB_PORT", 5432)),
    "dbname":   os.getenv("DB_NAME", "plataforma_questoes"),
    "user":     os.getenv("DB_USER", ""),
    "password": os.getenv("DB_PASSWORD", ""),
}

CONN_STR = f"host={DB_CONFIG['host']} port={DB_CONFIG['port']} dbname={DB_CONFIG['dbname']} user={DB_CONFIG['user']} password={DB_CONFIG['password']}"

def check_schema():
    conn = psycopg.connect(CONN_STR)
    cur = conn.cursor()
    
    tables = ['sessoes_estudo', 'questoes', 'usuarios', 'sessoes_questoes', 'questoes_materias', 'materias']
    for table in tables:
        print(f"\n--- {table} ---")
        try:
            cur.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{table}'")
            rows = cur.fetchall()
            if not rows:
                print("Table not found or has no columns.")
            for row in rows:
                print(row)
        except Exception as e:
            print(f"Error checking {table}: {e}")
            conn.rollback()
    
    conn.close()

if __name__ == "__main__":
    check_schema()

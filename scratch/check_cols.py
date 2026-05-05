import os
from dotenv import load_dotenv
import psycopg

load_dotenv()
CONN_STR = f"host={os.getenv('DB_HOST')} port={os.getenv('DB_PORT')} dbname={os.getenv('DB_NAME')} user={os.getenv('DB_USER')} password={os.getenv('DB_PASSWORD')}"

def check():
    conn = psycopg.connect(CONN_STR)
    cur = conn.cursor()
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'sessoes_estudo'")
    print("sessoes_estudo columns:", [r[0] for r in cur.fetchall()])
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'questoes'")
    print("questoes columns:", [r[0] for r in cur.fetchall()])
    conn.close()

if __name__ == "__main__":
    check()

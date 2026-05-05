from database import get_conexao, iniciar_pool, encerrar_pool
try:
    iniciar_pool()
    with get_conexao() as conn:
        cur = conn.cursor()
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
        tables = cur.fetchall()
        print("Tabelas encontradas:")
        for t in tables:
            print(f"- {t[0]}")
        
        cur.execute("SELECT COUNT(*) FROM materias")
        count = cur.fetchone()[0]
        print(f"\nTotal de matérias: {count}")
    encerrar_pool()
except Exception as e:
    print(f"Erro: {e}")

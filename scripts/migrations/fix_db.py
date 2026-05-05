from database import get_conexao

try:
    conn = get_conexao()
    c = conn.cursor()
    c.execute("ALTER TABLE questoes DROP CONSTRAINT questoes_resposta_correta_check;")
    c.execute("ALTER TABLE questoes ADD CONSTRAINT questoes_resposta_correta_check CHECK (resposta_correta IN ('A','B','C','D','E'));")
    c.execute("ALTER TABLE questoes ADD COLUMN IF NOT EXISTS opcao_e TEXT DEFAULT null;")
    conn.commit()
    conn.close()
    print("Sucesso! Constraint CHECK atualizada e opcao_e preparada.")
except Exception as e:
    print(f"Erro: {e}")

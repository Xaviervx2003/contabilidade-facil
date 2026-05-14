import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.environ.get("DATABASE_URL")

SQL = """
-- 1. Cria a tabela de missoes_concluidas que o Claude tentou usar
CREATE TABLE IF NOT EXISTS missoes_concluidas (
    id SERIAL PRIMARY KEY,
    matricula VARCHAR(50) NOT NULL REFERENCES usuarios(matricula) ON DELETE CASCADE,
    missao_id INT NOT NULL REFERENCES missoes_globais(id) ON DELETE CASCADE,
    concluida_em TIMESTAMP DEFAULT NOW(),
    UNIQUE(matricula, missao_id)
);

-- 2. Adiciona XP na tabela de usuarios (o Claude tentou acessar a tabela 'alunos' que nem existe, o correto é 'usuarios')
ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS xp INT DEFAULT 0;

-- 3. Adiciona as colunas XP e COR na tabela de missoes_globais que o Claude inseriu no Python
ALTER TABLE missoes_globais
    ADD COLUMN IF NOT EXISTS xp INT DEFAULT 100,
    ADD COLUMN IF NOT EXISTS cor VARCHAR(20) DEFAULT '#FF385C';
"""

def main():
    if not DATABASE_URL:
        raise EnvironmentError("DATABASE_URL não definida. Exporte-a antes de rodar.")

    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    try:
        with conn.cursor() as cur:
            cur.execute(SQL)
        conn.commit()
        print("✅  Migração (Correções do Claude) concluída com sucesso.")
    except Exception as e:
        conn.rollback()
        print(f"❌  Erro — rollback executado: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    main()

"""
migration_melhorias.py — Migração segura: Enriquecimento do perfil do aluno,
tabela de eventos, e tracking por questão nas sessões.
"""
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.environ.get("DATABASE_URL")

SQL = """
-- ─── 1. Enriquecimento do perfil do aluno ───────────────────────────────────
ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS periodo              INTEGER DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS objetivo             VARCHAR(100) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS status_aluno         VARCHAR(30) DEFAULT 'ativo',
    ADD COLUMN IF NOT EXISTS celular              VARCHAR(25) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS avatar_url           TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS data_nascimento      DATE DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS ultimo_acesso        TIMESTAMP DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS plataforma_preferida VARCHAR(20) DEFAULT 'web';

-- CHECK constraints (safe — adds only if not exists via DO block)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_periodo_check'
    ) THEN
        ALTER TABLE usuarios ADD CONSTRAINT usuarios_periodo_check
            CHECK (periodo IS NULL OR (periodo BETWEEN 1 AND 8));
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_status_aluno_check'
    ) THEN
        ALTER TABLE usuarios ADD CONSTRAINT usuarios_status_aluno_check
            CHECK (status_aluno IN ('ativo', 'trancado', 'formado', 'suspenso'));
    END IF;
END$$;

-- ─── 2. Nova tabela de eventos do aluno (tracking de comportamento) ──────────
CREATE TABLE IF NOT EXISTS eventos_aluno (
    id          BIGSERIAL PRIMARY KEY,
    matricula   VARCHAR(50)  NOT NULL REFERENCES usuarios(matricula) ON DELETE CASCADE,
    evento      VARCHAR(100) NOT NULL,
    payload     JSONB        DEFAULT '{}',
    criado_em   TIMESTAMP    DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_eventos_matricula      ON eventos_aluno (matricula, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_eventos_tipo_criado_em ON eventos_aluno (evento, criado_em DESC);

-- ─── 3. Tracking por questão nas sessões ────────────────────────────────────
ALTER TABLE sessoes_questoes
    ADD COLUMN IF NOT EXISTS tempo_segundos INTEGER DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS opcao_marcada  CHAR(1) DEFAULT NULL;
"""


def main():
    if not DATABASE_URL:
        raise EnvironmentError("DATABASE_URL nao definida.")

    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    try:
        with conn.cursor() as cur:
            cur.execute(SQL)
        conn.commit()
        print("Migracao concluida com sucesso.")
    except Exception as e:
        conn.rollback()
        print(f"Erro — rollback executado: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()

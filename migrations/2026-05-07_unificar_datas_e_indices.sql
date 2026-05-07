-- Unifica colunas de data em sessoes_estudo e cria indices de escala.
-- Objetivo: manter apenas "criado_em" como timestamp canonico.

BEGIN;

-- 1) Garantir coluna canonica.
ALTER TABLE sessoes_estudo
    ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP;

-- 2) Se a coluna legado existir, funde os dados para nao perder historico.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'sessoes_estudo'
          AND column_name = 'data_sessao'
    ) THEN
        EXECUTE '
            UPDATE sessoes_estudo
            SET criado_em = COALESCE(criado_em, data_sessao, NOW())
            WHERE criado_em IS NULL OR data_sessao IS NOT NULL
        ';

        EXECUTE 'ALTER TABLE sessoes_estudo DROP COLUMN data_sessao';
    END IF;
END $$;

-- 3) Garantir preenchimento e default para novos registros.
UPDATE sessoes_estudo
SET criado_em = NOW()
WHERE criado_em IS NULL;

ALTER TABLE sessoes_estudo
    ALTER COLUMN criado_em SET DEFAULT NOW(),
    ALTER COLUMN criado_em SET NOT NULL;

-- 4) Indices para crescer com alto volume de sessoes/questoes.
CREATE INDEX IF NOT EXISTS idx_sessoes_nome_criado_em
    ON sessoes_estudo (nome_aluno, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_sessoes_eh_teste_criado_em
    ON sessoes_estudo (eh_teste_professor, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_questoes_ano
    ON questoes (ano);

COMMIT;

-- =============================================================
-- migration_002_indexes_e_dificuldade.sql
-- Aplica índices compostos para performance e adiciona coluna
-- dificuldade na tabela questoes.
-- Execute via: psql $DATABASE_URL -f migrations/002_indexes_e_dificuldade.sql
-- Seguro para rodar múltiplas vezes (IF NOT EXISTS / IF NOT EXISTS).
-- =============================================================

-- ── 1. Coluna dificuldade (adicionar ANTES dos índices) ───────
ALTER TABLE questoes
    ADD COLUMN IF NOT EXISTS dificuldade VARCHAR(20)
    DEFAULT NULL;

-- Adiciona CHECK constraint apenas se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'questoes_dificuldade_check'
    ) THEN
        ALTER TABLE questoes
            ADD CONSTRAINT questoes_dificuldade_check
            CHECK (dificuldade IN ('facil', 'medio', 'dificil'));
    END IF;
END$$;

-- ── 2. Índices simples (novos) ────────────────────────────────

-- Partial index: só indexa rows que têm dificuldade definida
CREATE INDEX IF NOT EXISTS idx_questoes_dificuldade
    ON questoes(dificuldade)
    WHERE dificuldade IS NOT NULL;

-- ── 3. Índices compostos (performance nas queries mais comuns) ─

-- Busca por banca + ano (filtros dropdown — match exato, sem ILIKE)
CREATE INDEX IF NOT EXISTS idx_questoes_banca_ano
    ON questoes(banca, ano DESC);

-- Busca por dificuldade + banca + ano (query mais comum descrita)
CREATE INDEX IF NOT EXISTS idx_questoes_dif_banca_ano
    ON questoes(dificuldade, banca, ano DESC)
    WHERE dificuldade IS NOT NULL;

-- Covering index para JOIN questoes_materias → questoes
-- Elimina heap fetch: o índice já carrega questao_id para o JOIN
CREATE INDEX IF NOT EXISTS idx_qm_materia_questao
    ON questoes_materias(materia_id, questao_id);

-- Contar acertos por questão (dashboard e relatórios)
CREATE INDEX IF NOT EXISTS idx_sq_questao_acertou
    ON sessoes_questoes(questao_id, acertou);

-- Contar acertos por sessão (histórico do aluno — já tem idx_sq_sessao_id)
-- Este cobre: WHERE sessao_id = X AND acertou = TRUE
CREATE INDEX IF NOT EXISTS idx_sq_sessao_acertou
    ON sessoes_questoes(sessao_id, acertou);

-- ── 4. Atualizar estatísticas do planner ─────────────────────
-- Importante após criar muitos índices de uma vez
ANALYZE questoes;
ANALYZE questoes_materias;
ANALYZE sessoes_questoes;

-- ── 5. Verificação (opcional — descomentar para conferir) ─────
-- SELECT indexname, indexdef FROM pg_indexes
-- WHERE tablename IN ('questoes','questoes_materias','sessoes_questoes')
-- ORDER BY tablename, indexname;

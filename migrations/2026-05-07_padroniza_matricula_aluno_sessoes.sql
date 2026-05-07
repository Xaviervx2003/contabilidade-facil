-- Padroniza sessoes_estudo para usar matricula_aluno como identidade canonica.
-- Mantem nome como snapshot para exibicao/auditoria.

BEGIN;

ALTER TABLE sessoes_estudo
    ADD COLUMN IF NOT EXISTS matricula_aluno VARCHAR(50),
    ADD COLUMN IF NOT EXISTS nome_aluno_snapshot VARCHAR(255);

-- Backfill de matricula a partir da coluna legado.
UPDATE sessoes_estudo s
SET matricula_aluno = u.matricula
FROM usuarios u
WHERE s.matricula_aluno IS NULL
  AND (
      s.nome_aluno = u.matricula
      OR LOWER(TRIM(s.nome_aluno)) = LOWER(TRIM(u.nome))
  );

-- Snapshot preferencialmente com o nome oficial atual do cadastro.
UPDATE sessoes_estudo s
SET nome_aluno_snapshot = COALESCE(s.nome_aluno_snapshot, u.nome, s.nome_aluno)
FROM usuarios u
WHERE u.matricula = s.matricula_aluno
  AND s.nome_aluno_snapshot IS NULL;

-- Fallback para não perder visualização em registros antigos sem match.
UPDATE sessoes_estudo
SET nome_aluno_snapshot = COALESCE(nome_aluno_snapshot, nome_aluno, matricula_aluno)
WHERE nome_aluno_snapshot IS NULL;

-- Remove matrículas inválidas para não quebrar FK (mantemos dados via nome_aluno/nome_snapshot).
UPDATE sessoes_estudo s
SET matricula_aluno = NULL
WHERE s.matricula_aluno IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM usuarios u WHERE u.matricula = s.matricula_aluno
  );

-- Chaves e índices para consultas por matrícula.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'sessoes_estudo'
          AND constraint_name = 'fk_sessoes_estudo_matricula_aluno'
    ) THEN
        ALTER TABLE sessoes_estudo
            ADD CONSTRAINT fk_sessoes_estudo_matricula_aluno
            FOREIGN KEY (matricula_aluno) REFERENCES usuarios(matricula);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sessoes_matricula_aluno
    ON sessoes_estudo (matricula_aluno);

CREATE INDEX IF NOT EXISTS idx_sessoes_matricula_criado_em
    ON sessoes_estudo (matricula_aluno, criado_em DESC);

COMMIT;

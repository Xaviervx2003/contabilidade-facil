-- Escalabilidade: paginação de feedbacks + índices textuais com pg_trgm.
-- Cache de dashboard foi implementado no código (TTL 60s).

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_questoes_enunciado_trgm
    ON questoes USING gin (enunciado gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_questoes_banca_trgm
    ON questoes USING gin (banca gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_questoes_orgao_trgm
    ON questoes USING gin (orgao gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_questoes_cargo_trgm
    ON questoes USING gin (cargo gin_trgm_ops);

COMMIT;

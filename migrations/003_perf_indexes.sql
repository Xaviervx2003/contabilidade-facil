-- migrations/003_perf_indexes.sql
-- Aplicação de índices concorrentes para evitar table locks
-- Parciais para melhor seletividade e cobertura de buscas nas rotas de analytics/gamificação

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessoes_estudo_matricula_data 
  ON sessoes_estudo(matricula_aluno, criado_em) 
  WHERE matricula_aluno IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessoes_estudo_nome_data 
  ON sessoes_estudo(nome_aluno, criado_em) 
  WHERE nome_aluno IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessoes_questoes_sessao 
  ON sessoes_questoes(sessao_id);

-- ROLLBACK:
-- DROP INDEX CONCURRENTLY IF EXISTS idx_sessoes_estudo_matricula_data;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_sessoes_estudo_nome_data;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_sessoes_questoes_sessao;

-- =============================================================
-- migration_2026_melhorias_aluno_quiz.sql
-- Melhorias: Perfil do Aluno + Tracking de Eventos + Quiz Analytics
-- Baseado em: awesome-scalability, sql-style-guide, python-clean-architecture
-- =============================================================

-- ─── 1. ENRIQUECIMENTO DA TABELA USUARIOS ─────────────────────
-- Adiciona campos para categorização acadêmica, contato e metadata de engajamento

ALTER TABLE usuarios
    -- Gamificação (já usado no backend)
    ADD COLUMN IF NOT EXISTS xp              INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS streak_atual    INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS streak_maximo   INTEGER DEFAULT 0,
    -- Categorização acadêmica
    ADD COLUMN IF NOT EXISTS periodo        INTEGER DEFAULT NULL CHECK (periodo BETWEEN 1 AND 8),
    ADD COLUMN IF NOT EXISTS objetivo       VARCHAR(100) DEFAULT NULL,  -- 'CFC', 'Concurso', 'Reforco', 'Outro'
    ADD COLUMN IF NOT EXISTS status_aluno   VARCHAR(30) DEFAULT 'ativo' 
                                            CHECK (status_aluno IN ('ativo', 'trancado', 'formado', 'suspenso')),
    -- Contato e perfil
    ADD COLUMN IF NOT EXISTS celular        VARCHAR(25) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS avatar_url     TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS data_nascimento DATE DEFAULT NULL,
    -- Metadata de engajamento
    ADD COLUMN IF NOT EXISTS ultimo_acesso  TIMESTAMP DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS plataforma_preferida VARCHAR(20) DEFAULT 'web'; -- 'web', 'mobile'

-- Índice para buscar alunos por status e período
CREATE INDEX IF NOT EXISTS idx_usuarios_status_periodo ON usuarios(status_aluno, periodo);
CREATE INDEX IF NOT EXISTS idx_usuarios_ultimo_acesso ON usuarios(ultimo_acesso DESC);


-- ─── 2. TABELA DE TRACKING DE EVENTOS (eventos_aluno) ─────────
-- Inspirado em Distributed Tracking (LinkedIn/Uber) e Event Tracking (Udemy)
-- Captura comportamento do aluno para analytics e recomendação inteligente

CREATE TABLE IF NOT EXISTS eventos_aluno (
    id          BIGSERIAL PRIMARY KEY,
    matricula   VARCHAR(50)  NOT NULL REFERENCES usuarios(matricula) ON DELETE CASCADE,
    evento      VARCHAR(100) NOT NULL,  -- 'quiz_iniciou', 'modulo_abriu', 'video_assistiu', etc.
    payload     JSONB        DEFAULT '{}',  -- dados extras (materia_id, modulo_id, etc.)
    criado_em   TIMESTAMP    DEFAULT NOW()
);

-- Índices para consultas eficientes de tracking
CREATE INDEX IF NOT EXISTS idx_eventos_matricula       ON eventos_aluno (matricula, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_eventos_tipo_criado_em  ON eventos_aluno (evento, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_eventos_payload_gin     ON eventos_aluno USING GIN (payload jsonb_path_ops);


-- ─── 3. MELHORIAS NA TABELA SESSOES_QUESTOES ──────────────────
-- Adiciona tracking de tempo por questão e opção marcada
-- Permite identificar questões difíceis e padrões de erro

ALTER TABLE sessoes_questoes
    ADD COLUMN IF NOT EXISTS tempo_segundos INTEGER DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS opcao_marcada  CHAR(1) DEFAULT NULL CHECK (opcao_marcada IN ('A','B','C','D','E'));

-- Índice para análise de tempo por questão
CREATE INDEX IF NOT EXISTS idx_sq_tempo ON sessoes_questoes (tempo_segundos) WHERE tempo_segundos IS NOT NULL;


-- ─── 4. ÍNDICES ADICIONAIS PARA PERFORMANCE ───────────────────
-- Otimizações baseadas no sql-style-guide para queries frequentes

-- Acelera busca de questões por matéria no quiz analytics
CREATE INDEX IF NOT EXISTS idx_questoes_materias_materia ON questoes_materias (materia_id, questao_id);

-- Otimiza agregações de histórico por aluno
CREATE INDEX IF NOT EXISTS idx_sessoes_estudo_matricula_criado_em 
    ON sessoes_estudo (matricula_aluno, criado_em DESC) 
    WHERE matricula_aluno IS NOT NULL;


-- ─── 5. COMENTÁRIOS NAS COLUNAS (Documentação) ────────────────
-- Melhora a legibilidade do schema para desenvolvedores

COMMENT ON COLUMN usuarios.periodo IS 'Semestre atual do curso (1-8)';
COMMENT ON COLUMN usuarios.objetivo IS 'Objetivo do aluno: CFC, Concurso, Reforco, Outro';
COMMENT ON COLUMN usuarios.status_aluno IS 'Status: ativo, trancado, formado, suspenso';
COMMENT ON COLUMN usuarios.plataforma_preferida IS 'Plataforma principal de acesso: web ou mobile';
COMMENT ON COLUMN usuarios.ultimo_acesso IS 'Última vez que o aluno fez login';
COMMENT ON COLUMN eventos_aluno.evento IS 'Tipo de evento rastreado: quiz_iniciou, quiz_concluiu, modulo_abriu, video_assistiu, favorito_adicionou, login_realizado';
COMMENT ON COLUMN eventos_aluno.payload IS 'Dados contextuais do evento em formato JSONB';
COMMENT ON COLUMN sessoes_questoes.tempo_segundos IS 'Tempo gasto nesta questão específica (segundos)';
COMMENT ON COLUMN sessoes_questoes.opcao_marcada IS 'Opção selecionada pelo aluno (mesmo se errou)';


-- ─── 6. VIEW DE ANALYTICS DO ALUNO (Opcional) ─────────────────
-- Facilita consultas de dashboard sem repetir SQL complexo

CREATE OR REPLACE VIEW vw_analytics_aluno AS
SELECT
    u.matricula,
    u.nome,
    u.periodo,
    u.objetivo,
    COUNT(DISTINCT se.id) AS total_sessoes,
    COALESCE(SUM(se.questoes_respondidas), 0) AS total_questoes,
    ROUND(AVG(se.taxa_acerto)::numeric, 1) AS media_acerto_geral,
    ROUND(AVG(se.tempo_gasto_segundos)::numeric, 0) AS tempo_medio_sessao_seg,
    MAX(se.criado_em) AS ultima_sessao,
    COUNT(DISTINCT DATE(se.criado_em)) FILTER (WHERE se.criado_em >= NOW() - INTERVAL '7 days') AS dias_ativos_semana
FROM usuarios u
LEFT JOIN sessoes_estudo se ON se.matricula_aluno = u.matricula
WHERE u.papel = 'aluno'
GROUP BY u.matricula, u.nome, u.periodo, u.objetivo;


-- ─── 7. FUNÇÃO PARA LIMPEZA DE EVENTOS ANTIGOS ────────────────
-- Mantém apenas últimos 90 dias de eventos detalhados (economia de espaço)
-- Executar periodicamente via cron job ou scheduler

CREATE OR REPLACE FUNCTION fn_limpar_eventos_antigos(dias_reter INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    registros_excluidos INTEGER;
BEGIN
    DELETE FROM eventos_aluno
    WHERE criado_em < NOW() - (dias_reter || ' days')::INTERVAL;
    
    GET DIAGNOSTICS registros_excluidos = ROW_COUNT;
    RETURN registros_excluidos;
END;
$$ LANGUAGE plpgsql;


-- =============================================================
-- FIM DA MIGRAÇÃO
-- =============================================================
-- Para aplicar: psql -d seu_banco -f migration_2026_melhorias_aluno_quiz.sql
-- 
-- Próximos passos recomendados:
-- 1. Atualizar backend (routes/auth.py, routes/aluno.py)
-- 2. Implementar frontend de atualização de perfil
-- 3. Criar dashboard de analytics para o aluno
-- 4. Configurar job periódico para fn_limpar_eventos_antigos()
-- =============================================================

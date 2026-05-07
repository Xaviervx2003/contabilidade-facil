-- =============================================================
-- init.sql — Script completo e corrigido
-- PostgreSQL — Plataforma de Questões de Contabilidade
-- Versão 2.0 — Suporte a Admin, Professor e Aluno
-- =============================================================

-- ─── 1. USUÁRIOS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
    id          SERIAL PRIMARY KEY,
    nome        VARCHAR(255) NOT NULL,
    matricula   VARCHAR(50)  UNIQUE NOT NULL,
    email       VARCHAR(255) UNIQUE,                        -- novo: email para login futuro
    senha       VARCHAR(255) NOT NULL,
    papel       VARCHAR(20)  NOT NULL DEFAULT 'aluno'
                CHECK (papel IN ('admin', 'professor', 'aluno')),
    criado_em   TIMESTAMP    DEFAULT NOW()
);

-- Admin padrão (matrícula: admin | senha: admin123)
INSERT INTO usuarios (nome, matricula, senha, papel)
VALUES ('Administrador', 'admin', 'admin123', 'admin')
ON CONFLICT (matricula) DO NOTHING;

-- ─── 2. MATÉRIAS (Hierárquica com suporte a API externa) ─────
CREATE TABLE IF NOT EXISTS materias (
    id         SERIAL PRIMARY KEY,
    nome       VARCHAR(255) NOT NULL,
    id_externo INTEGER UNIQUE,
    parent_id  INT REFERENCES materias(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_materias_parent_id ON materias(parent_id);

INSERT INTO materias (nome) VALUES
    ('Contabilidade Básica'),
    ('Fiscal'),
    ('Custos'),
    ('Auditoria')
ON CONFLICT (nome) DO NOTHING;

-- ─── 3. VÍNCULO PROFESSOR ↔ MATÉRIA ──────────────────────────
CREATE TABLE IF NOT EXISTS professores_materias (
    usuario_id  INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    materia_id  INT NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, materia_id)
);

-- ─── 4. QUESTÕES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questoes (
    id               SERIAL PRIMARY KEY,
    assunto          VARCHAR(255),
    enunciado        TEXT         NOT NULL,
    opcao_a          TEXT         NOT NULL,
    opcao_b          TEXT         NOT NULL,
    opcao_c          TEXT         NOT NULL,
    opcao_d          TEXT         NOT NULL,
    opcao_e          TEXT         DEFAULT NULL,
    resposta_correta CHAR(1)      NOT NULL CHECK (resposta_correta IN ('A','B','C','D','E')),
    explicacao       TEXT         DEFAULT NULL,
    criado_por       INT          REFERENCES usuarios(id) ON DELETE SET NULL,  -- novo: qual professor criou
    tentativas       INT          DEFAULT 0,
    acertos          INT          DEFAULT 0,
    link_video       TEXT         DEFAULT NULL,
    id_externo       INTEGER      UNIQUE,
    banca            VARCHAR(255),
    orgao            VARCHAR(255),
    cargo            VARCHAR(255),
    ano              INT,
    escolaridade     VARCHAR(255),
    modalidade       VARCHAR(255),
    criado_em        TIMESTAMP    DEFAULT NOW()
);

-- ─── 4b. VÍNCULO QUESTÃO ↔ MATÉRIA ────────────────────────────
CREATE TABLE IF NOT EXISTS questoes_materias (
    questao_id  INT NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
    materia_id  INT NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
    PRIMARY KEY (questao_id, materia_id)
);

-- ─── 5. SESSÕES DE ESTUDO ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessoes_estudo (
    id                      SERIAL PRIMARY KEY,
    matricula_aluno         VARCHAR(50)  REFERENCES usuarios(matricula),
    nome_aluno              VARCHAR(255),
    nome_aluno_snapshot     VARCHAR(255),
    assunto_estudado        VARCHAR(255) NOT NULL,
    questoes_respondidas    INT          NOT NULL,
    taxa_acerto             FLOAT        NOT NULL,
    tempo_gasto_segundos    INT          NOT NULL,
    eh_teste_professor      BOOLEAN      DEFAULT FALSE,
    criado_em               TIMESTAMP    DEFAULT NOW()
);

-- ─── 5b. DETALHES POR QUESTÃO EM CADA SESSÃO ──────────────────
CREATE TABLE IF NOT EXISTS sessoes_questoes (
    sessao_id   INT NOT NULL REFERENCES sessoes_estudo(id) ON DELETE CASCADE,
    questao_id  INT NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
    acertou     BOOLEAN NOT NULL,
    PRIMARY KEY (sessao_id, questao_id)
);

-- ─── 5c. FEEDBACKS DE QUESTÕES ────────────────────────────────
CREATE TABLE IF NOT EXISTS feedbacks_questoes (
    id               SERIAL PRIMARY KEY,
    questao_id       INT          NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
    nome_aluno       VARCHAR(255) NOT NULL,
    texto            TEXT,
    marcada_confusa  BOOLEAN      DEFAULT FALSE,
    resolvido        BOOLEAN      NOT NULL DEFAULT FALSE,
    resolvido_em     TIMESTAMP    DEFAULT NULL,
    publico          BOOLEAN      NOT NULL DEFAULT FALSE,
    resposta_professor TEXT       DEFAULT NULL,
    data_criacao     TIMESTAMP    DEFAULT NOW()
);

-- ─── 5d. FAVORITOS DO ALUNO ───────────────────────────────────
CREATE TABLE IF NOT EXISTS favoritos_aluno (
    id              SERIAL PRIMARY KEY,
    matricula_aluno VARCHAR(20)  NOT NULL REFERENCES usuarios(matricula),
    questao_id      INT          NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
    data_adicao     TIMESTAMP    DEFAULT NOW(),
    UNIQUE (matricula_aluno, questao_id)
);

-- ─── 6. MIGRAÇÃO SEGURA (banco já existente) ──────────────────
-- Roda sem erro mesmo se as colunas já existirem.

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;

ALTER TABLE questoes
    ADD COLUMN IF NOT EXISTS criado_por  INT REFERENCES usuarios(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS criado_em   TIMESTAMP DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS explicacao  TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS tentativas  INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS acertos     INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS link_video  TEXT DEFAULT NULL;

ALTER TABLE sessoes_estudo
    ADD COLUMN IF NOT EXISTS matricula_aluno VARCHAR(50),
    ADD COLUMN IF NOT EXISTS nome_aluno_snapshot VARCHAR(255),
    ADD COLUMN IF NOT EXISTS eh_teste_professor BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP DEFAULT NOW();

ALTER TABLE feedbacks_questoes
    ADD COLUMN IF NOT EXISTS resolvido BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS resolvido_em TIMESTAMP DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS publico BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS resposta_professor TEXT DEFAULT NULL;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── 6b. ÍNDICES ESTRATÉGICOS (desempenho) ────────────────────
CREATE INDEX IF NOT EXISTS idx_sessoes_nome_aluno   ON sessoes_estudo (nome_aluno);
CREATE INDEX IF NOT EXISTS idx_sessoes_matricula_aluno ON sessoes_estudo (matricula_aluno);
CREATE INDEX IF NOT EXISTS idx_sessoes_criado_em    ON sessoes_estudo (criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_sessoes_nome_criado_em ON sessoes_estudo (nome_aluno, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_sessoes_matricula_criado_em ON sessoes_estudo (matricula_aluno, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_sessoes_eh_teste_criado_em ON sessoes_estudo (eh_teste_professor, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_resolvido  ON feedbacks_questoes (resolvido);
CREATE INDEX IF NOT EXISTS idx_favoritos_questao ON favoritos_aluno(questao_id);
CREATE INDEX IF NOT EXISTS idx_questoes_ano ON questoes(ano);
CREATE INDEX IF NOT EXISTS idx_questoes_enunciado_trgm ON questoes USING gin (enunciado gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_questoes_banca_trgm ON questoes USING gin (banca gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_questoes_orgao_trgm ON questoes USING gin (orgao gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_questoes_cargo_trgm ON questoes USING gin (cargo gin_trgm_ops);

-- ─── 8. TRILHAS DE APRENDIZAGEM (Cursos e Módulos) ────────────
CREATE TABLE IF NOT EXISTS trilhas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    criado_por INT REFERENCES usuarios(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'publicado')),
    criado_em TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modulos (
    id SERIAL PRIMARY KEY,
    trilha_id INT NOT NULL REFERENCES trilhas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    ordem INT NOT NULL,
    link_video VARCHAR(255) DEFAULT NULL,
    texto_teorico TEXT DEFAULT NULL,
    materia_id INT REFERENCES materias(id) ON DELETE SET NULL, 
    criado_em TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS progresso_trilhas (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    modulo_id INT NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
    concluido BOOLEAN DEFAULT FALSE,
    concluido_em TIMESTAMP DEFAULT NULL,
    UNIQUE(usuario_id, modulo_id)
);

CREATE INDEX IF NOT EXISTS idx_qm_materia_id        ON questoes_materias (materia_id);
CREATE INDEX IF NOT EXISTS idx_qm_questao_id        ON questoes_materias (questao_id);
CREATE INDEX IF NOT EXISTS idx_pm_usuario_id        ON professores_materias (usuario_id);
CREATE INDEX IF NOT EXISTS idx_sq_sessao_id         ON sessoes_questoes (sessao_id);
CREATE INDEX IF NOT EXISTS idx_sq_questao_id        ON sessoes_questoes (questao_id);
CREATE INDEX IF NOT EXISTS idx_fav_matricula        ON favoritos_aluno (matricula_aluno);

-- Garante que o CHECK de papel existe (só cria a constraint se não houver)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'usuarios_papel_check'
    ) THEN
        ALTER TABLE usuarios
            ADD CONSTRAINT usuarios_papel_check
            CHECK (papel IN ('admin', 'professor', 'aluno'));
    END IF;
END$$;

-- ─── 7. QUESTÕES DE EXEMPLO ───────────────────────────────────
INSERT INTO questoes (assunto, enunciado, opcao_a, opcao_b, opcao_c, opcao_d, resposta_correta) VALUES
(
    'Contabilidade Básica',
    'O que é o Balanço Patrimonial?',
    'Demonstração de receitas e despesas',
    'Relatório de fluxo de caixa',
    'Demonstração da posição financeira da empresa em determinada data',
    'Relatório de vendas mensais',
    'C'
),
(
    'Contabilidade Básica',
    'Qual é a equação fundamental da contabilidade?',
    'Ativo = Passivo - Patrimônio Líquido',
    'Ativo = Passivo + Patrimônio Líquido',
    'Passivo = Ativo + Patrimônio Líquido',
    'Receita = Despesa + Lucro',
    'B'
),
(
    'Fiscal',
    'O que significa ICMS?',
    'Imposto sobre Circulação de Mercadorias e Serviços',
    'Imposto sobre Consumo de Mercadorias Simples',
    'Imposto sobre Controle de Mercadorias e Serviços',
    'Imposto Comum de Mercadorias e Serviços',
    'A'
)
ON CONFLICT DO NOTHING;
ALTER TABLE questoes
    ADD COLUMN IF NOT EXISTS dica TEXT DEFAULT NULL;
ALTER TABLE questoes
    ADD COLUMN IF NOT EXISTS dica TEXT DEFAULT NULL;
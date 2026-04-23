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

-- ─── 2. MATÉRIAS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS materias (
    id    SERIAL PRIMARY KEY,
    nome  VARCHAR(255) UNIQUE NOT NULL
);

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
    nome_aluno              VARCHAR(255) NOT NULL,
    assunto_estudado        VARCHAR(255) NOT NULL,
    questoes_respondidas    INT          NOT NULL,
    taxa_acerto             FLOAT        NOT NULL,
    tempo_gasto_segundos    INT          NOT NULL,
    eh_teste_professor      BOOLEAN      DEFAULT FALSE,
    criado_em               TIMESTAMP    DEFAULT NOW()
);

-- ─── 5b. FEEDBACKS DE QUESTÕES ────────────────────────────────
CREATE TABLE IF NOT EXISTS feedbacks_questoes (
    id               SERIAL PRIMARY KEY,
    questao_id       INT          NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
    nome_aluno       VARCHAR(255) NOT NULL,
    texto            TEXT,
    marcada_confusa  BOOLEAN      DEFAULT FALSE,
    resolvido        BOOLEAN      NOT NULL DEFAULT FALSE,
    resolvido_em     TIMESTAMP    DEFAULT NULL,
    publico          BOOLEAN      NOT NULL DEFAULT FALSE,
    data_criacao     TIMESTAMP    DEFAULT NOW()
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
    ADD COLUMN IF NOT EXISTS acertos     INT DEFAULT 0;

ALTER TABLE sessoes_estudo
    ADD COLUMN IF NOT EXISTS eh_teste_professor BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP DEFAULT NOW();

ALTER TABLE feedbacks_questoes
    ADD COLUMN IF NOT EXISTS resolvido BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS resolvido_em TIMESTAMP DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS publico BOOLEAN NOT NULL DEFAULT FALSE;

-- ─── 6b. ÍNDICES ESTRATÉGICOS (desempenho) ────────────────────
CREATE INDEX IF NOT EXISTS idx_sessoes_nome_aluno   ON sessoes_estudo (nome_aluno);
CREATE INDEX IF NOT EXISTS idx_sessoes_criado_em    ON sessoes_estudo (criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_resolvido  ON feedbacks_questoes (resolvido);
CREATE INDEX IF NOT EXISTS idx_feedbacks_questao_id ON feedbacks_questoes (questao_id);
CREATE INDEX IF NOT EXISTS idx_qm_materia_id        ON questoes_materias (materia_id);
CREATE INDEX IF NOT EXISTS idx_qm_questao_id        ON questoes_materias (questao_id);
CREATE INDEX IF NOT EXISTS idx_pm_usuario_id        ON professores_materias (usuario_id);

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
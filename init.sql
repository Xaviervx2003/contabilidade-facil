-- =============================================================
-- init.sql — Executado automaticamente na primeira inicialização
-- do container PostgreSQL (apenas se o volume ainda não existir)
-- =============================================================

-- Tabela de usuários (alunos e administradores)
CREATE TABLE IF NOT EXISTS usuarios (
    id          SERIAL PRIMARY KEY,
    nome        VARCHAR(255) NOT NULL,
    matricula   VARCHAR(50)  UNIQUE NOT NULL,
    senha       VARCHAR(255) NOT NULL,
    papel       VARCHAR(20)  NOT NULL DEFAULT 'aluno',
    criado_em   TIMESTAMP    DEFAULT NOW()
);

-- Usuário admin padrão (matrícula: admin | senha: admin123)
INSERT INTO usuarios (nome, matricula, senha, papel)
VALUES ('Administrador', 'admin', 'admin123', 'admin')
ON CONFLICT (matricula) DO NOTHING;

-- Tabela de sessões de estudo dos alunos
CREATE TABLE IF NOT EXISTS sessoes_estudo (
    id                      SERIAL PRIMARY KEY,
    nome_aluno              VARCHAR(255) NOT NULL,
    assunto_estudado        VARCHAR(255) NOT NULL,
    questoes_respondidas    INT          NOT NULL,
    taxa_acerto             FLOAT        NOT NULL,
    tempo_gasto_segundos    INT          NOT NULL,
    criado_em               TIMESTAMP    DEFAULT NOW()
);

-- Tabela de questões da plataforma
CREATE TABLE IF NOT EXISTS questoes (
    id               SERIAL PRIMARY KEY,
    assunto          VARCHAR(255) NOT NULL,
    enunciado        TEXT         NOT NULL,
    opcao_a          TEXT         NOT NULL,
    opcao_b          TEXT         NOT NULL,
    opcao_c          TEXT         NOT NULL,
    opcao_d          TEXT         NOT NULL,
    resposta_correta CHAR(1)      NOT NULL CHECK (resposta_correta IN ('A','B','C','D'))
);

-- Dados de exemplo
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
);

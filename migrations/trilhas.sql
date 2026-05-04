-- =============================================================
-- Migration: Trilhas de Aprendizagem
-- Cria as tabelas necessárias para os cursos e módulos
-- =============================================================

-- 1. TRILHAS (Cursos)
CREATE TABLE IF NOT EXISTS trilhas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    criado_por INT REFERENCES usuarios(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'publicado')),
    criado_em TIMESTAMP DEFAULT NOW()
);

-- 2. MÓDULOS (Aulas/Passos da Trilha)
CREATE TABLE IF NOT EXISTS modulos (
    id SERIAL PRIMARY KEY,
    trilha_id INT NOT NULL REFERENCES trilhas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    ordem INT NOT NULL,
    -- Opcionais: O módulo pode ter vídeo, texto ou ser um quiz prático
    link_video VARCHAR(255) DEFAULT NULL,
    texto_teorico TEXT DEFAULT NULL,
    materia_id INT REFERENCES materias(id) ON DELETE SET NULL, 
    criado_em TIMESTAMP DEFAULT NOW()
);

-- 3. PROGRESSO DO ALUNO
CREATE TABLE IF NOT EXISTS progresso_trilhas (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    modulo_id INT NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
    concluido BOOLEAN DEFAULT FALSE,
    concluido_em TIMESTAMP DEFAULT NULL,
    UNIQUE(usuario_id, modulo_id)
);

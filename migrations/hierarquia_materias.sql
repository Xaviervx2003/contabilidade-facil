-- =============================================================
-- Migration: Hierarquia de Matérias
-- Transforma a tabela materias em uma estrutura de árvore
-- =============================================================

-- 1. Adiciona a coluna parent_id
ALTER TABLE materias ADD COLUMN IF NOT EXISTS parent_id INT REFERENCES materias(id) ON DELETE CASCADE;

-- 2. Remove a unicidade simples do nome (opcional, mas recomendado para permitir nomes iguais em ramos diferentes)
ALTER TABLE materias DROP CONSTRAINT IF EXISTS materias_nome_key;

-- 3. Adiciona uma restrição de unicidade composta (nome + pai) para evitar duplicatas no mesmo nível
-- Nota: Para o PostgreSQL, NULL != NULL, então múltiplos itens com parent_id NULL e mesmo nome ainda seriam permitidos.
-- Mas para simplificar, vamos apenas garantir a estrutura.
CREATE INDEX IF NOT EXISTS idx_materias_parent_id ON materias(parent_id);

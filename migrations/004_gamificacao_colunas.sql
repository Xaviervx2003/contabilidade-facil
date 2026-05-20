-- Adiciona colunas de gamificação e perfil do usuário na tabela usuarios
ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS streak_atual INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS streak_maximo INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS periodo INTEGER,
    ADD COLUMN IF NOT EXISTS objetivo VARCHAR(100),
    ADD COLUMN IF NOT EXISTS avatar_url TEXT;

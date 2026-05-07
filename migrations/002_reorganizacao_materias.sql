-- migration: solicitacoes_reorganizacao
CREATE TABLE IF NOT EXISTS solicitacoes_reorganizacao (
    id          SERIAL PRIMARY KEY,
    materia_id  INT NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
    novo_parent_id INT REFERENCES materias(id) ON DELETE CASCADE,
    solicitado_por INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    status      VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
    criado_em   TIMESTAMP DEFAULT NOW(),
    processado_em TIMESTAMP DEFAULT NULL,
    processado_por INT REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS videos_assistidos_aluno (
    id SERIAL PRIMARY KEY,
    matricula_aluno TEXT NOT NULL,
    video_id INTEGER NOT NULL,
    origem VARCHAR(20) NOT NULL DEFAULT 'video',
    assistido_em TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (matricula_aluno, video_id, origem)
);

CREATE INDEX IF NOT EXISTS idx_videos_assistidos_aluno_matricula
    ON videos_assistidos_aluno (matricula_aluno);

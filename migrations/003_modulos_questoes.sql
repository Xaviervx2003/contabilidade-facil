-- migration: modulos_questoes_selecionadas
ALTER TABLE modulos ADD COLUMN IF NOT EXISTS questoes_selecionadas INT[] DEFAULT NULL;

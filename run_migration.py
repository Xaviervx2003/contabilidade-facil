
from database import iniciar_pool, encerrar_pool, get_conexao
import os

def run_migration():
    iniciar_pool()
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            
            # Criar tabela
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sessoes_questoes (
                    id          SERIAL PRIMARY KEY,
                    sessao_id   INT NOT NULL REFERENCES sessoes_estudo(id) ON DELETE CASCADE,
                    questao_id  INT NOT NULL REFERENCES questoes(id)       ON DELETE CASCADE,
                    acertou     BOOLEAN NOT NULL DEFAULT FALSE,
                    criado_em   TIMESTAMP DEFAULT NOW()
                );
            """)
            
            # Criar índices
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_sq_sessao_id  ON sessoes_questoes (sessao_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_sq_questao_id ON sessoes_questoes (questao_id);")
            
            conn.commit()
            print("Migração concluída com sucesso!")
    except Exception as e:
        print(f"Erro na migração: {e}")
    finally:
        encerrar_pool()

if __name__ == "__main__":
    run_migration()

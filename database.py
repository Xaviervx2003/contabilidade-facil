"""
database.py – Pool de conexões PostgreSQL com psycopg (v3).
Substitui o get_conexao() antigo por um sistema de pool mais eficiente.
"""

import os
import time
from dotenv import load_dotenv
import psycopg
from psycopg_pool import ConnectionPool
from contextlib import contextmanager

# Carrega o .env na raiz do projeto
load_dotenv()

# Configurações vindas do seu arquivo antigo
DB_CONFIG = {
    "host":     os.getenv("DB_HOST", "localhost"),
    "port":     int(os.getenv("DB_PORT", 5432)),
    "dbname":   os.getenv("DB_NAME", "plataforma_questoes"),
    "user":     os.getenv("DB_USER", "joao_xavier"),
    "password": os.getenv("DB_PASSWORD", "sua_senha_segura12"),
}

# String de conexão formatada para o psycopg v3
CONN_STR = f"host={DB_CONFIG['host']} port={DB_CONFIG['port']} dbname={DB_CONFIG['dbname']} user={DB_CONFIG['user']} password={DB_CONFIG['password']}"

# Pool de conexões
_pool = None

def iniciar_pool(tentativas: int = 10, espera_segundos: int = 2):
    """Inicia o pool de conexões com retentativa para subir junto do Docker."""
    global _pool

    if _pool is not None:
        return

    ultimo_erro = None

    for tentativa in range(1, tentativas + 1):
        try:
            _pool = ConnectionPool(
                conninfo=CONN_STR,
                min_size=2,
                max_size=10,
                open=True,
            )

            # valida conexão inicial para evitar API subir sem banco
            with _pool.connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("SELECT 1")
                    cursor.fetchone()
<<<<<<< HEAD
=======
                    # Migração defensiva para ambientes já existentes:
                    # algumas rotas do dashboard dependem desta tabela.
                    cursor.execute("""
                        SELECT
                            to_regclass('public.sessoes_estudo') IS NOT NULL,
                            to_regclass('public.questoes') IS NOT NULL;
                    """)
                    tem_sessoes_estudo, tem_questoes = cursor.fetchone()

                    # Só cria se as tabelas-base já existirem (evita derrubar startup
                    # em banco novo antes do init.sql terminar).
                    if tem_sessoes_estudo and tem_questoes:
                        cursor.execute("""
                            CREATE TABLE IF NOT EXISTS sessoes_questoes (
                                sessao_id   INT NOT NULL REFERENCES sessoes_estudo(id) ON DELETE CASCADE,
                                questao_id  INT NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
                                acertou     BOOLEAN NOT NULL,
                                PRIMARY KEY (sessao_id, questao_id)
                            );
                        """)
                        cursor.execute("""
                            CREATE INDEX IF NOT EXISTS idx_sq_sessao_id
                            ON sessoes_questoes (sessao_id);
                        """)
                        cursor.execute("""
                            CREATE INDEX IF NOT EXISTS idx_sq_questao_id
                            ON sessoes_questoes (questao_id);
                        """)
>>>>>>> origin/codex/analyze-project-for-api-login-failure-1dl44n
            return
        except Exception as erro:
            ultimo_erro = erro
            if _pool is not None:
                _pool.close()
                _pool = None

            if tentativa < tentativas:
                time.sleep(espera_segundos)

    raise RuntimeError(
        f"Não foi possível conectar ao banco após {tentativas} tentativas: {ultimo_erro}"
    )

def encerrar_pool():
    """Fecha todas as conexões do pool. Deve ser chamado no shutdown do FastAPI."""
    global _pool
    if _pool:
        _pool.close()
        _pool = None

@contextmanager
def get_conexao():
    """
    Context manager que pega uma conexão do pool e a devolve ao final.
    Uso: with get_conexao() as conn: ...
    """
    if _pool is None:
        raise RuntimeError("Pool não iniciado. Verifique o startup da aplicação.")

    with _pool.connection() as conn:
        yield conn

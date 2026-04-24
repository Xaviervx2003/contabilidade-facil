"""
database.py – Pool de conexões PostgreSQL com psycopg (v3).
Substitui o get_conexao() antigo por um sistema de pool mais eficiente.
"""

import os
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

def iniciar_pool():
    """Inicia o pool de conexões. Deve ser chamado no startup do FastAPI."""
    global _pool
    if _pool is None:
        _pool = ConnectionPool(
            conninfo=CONN_STR,
            min_size=2,
            max_size=10,
            open=True
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


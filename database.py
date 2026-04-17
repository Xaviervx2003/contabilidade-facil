"""
database.py — Módulo centralizado de conexão com PostgreSQL.
Carrega credenciais de forma segura via variáveis de ambiente (.env).
"""

import os
from dotenv import load_dotenv
import psycopg

# Carrega o .env na raiz do projeto
load_dotenv()

def get_conexao():
    """Retorna uma conexão ativa com o PostgreSQL."""
    return psycopg.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        dbname=os.getenv('DB_NAME', 'plataforma_questoes'),
        user=os.getenv('DB_USER', 'joao_xavier'),
        password=os.getenv('DB_PASSWORD', 'sua_senha_segura12'),
        port=int(os.getenv('DB_PORT', 5432))
    )

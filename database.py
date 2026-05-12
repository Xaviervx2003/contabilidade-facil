"""
database.py – Pool de conexões PostgreSQL com psycopg (v3).
"""

import os
import time
from dotenv import load_dotenv
import psycopg
from psycopg_pool import ConnectionPool
from contextlib import contextmanager

load_dotenv()

DB_CONFIG = {
    "host":     os.getenv("DB_HOST", "localhost"),
    "port":     int(os.getenv("DB_PORT", 5432)),
    "dbname":   os.getenv("DB_NAME", "plataforma_questoes"),
    "user":     os.getenv("DB_USER", ""),
    "password": os.getenv("DB_PASSWORD", ""),
}

CONN_STR = f"host={DB_CONFIG['host']} port={DB_CONFIG['port']} dbname={DB_CONFIG['dbname']} user={DB_CONFIG['user']} password={DB_CONFIG['password']}"

_pool = None

def iniciar_pool(tentativas: int = 10, espera_segundos: int = 2):
    global _pool

    if _pool is not None:
        return

    ultimo_erro = None

    for tentativa in range(1, tentativas + 1):
        try:
            _pool = ConnectionPool(
                conninfo=CONN_STR,
                min_size=2,
                max_size=20,
                max_idle=5,
                timeout=30.0,
                open=True,
            )

            with _pool.connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("SELECT 1")
                    cursor.fetchone()

                    cursor.execute("""
                        SELECT
                            to_regclass('public.sessoes_estudo') IS NOT NULL,
                            to_regclass('public.questoes') IS NOT NULL;
                    """)
                    tem_sessoes_estudo, tem_questoes = cursor.fetchone()

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
                            CREATE INDEX IF NOT EXISTS idx_sq_sessao_id ON sessoes_questoes (sessao_id);
                        """)
                        cursor.execute("""
                            CREATE INDEX IF NOT EXISTS idx_sq_questao_id ON sessoes_questoes (questao_id);
                        """)

                        # MIGRATION: Adicionar link_video na tabela questoes
                        cursor.execute("ALTER TABLE questoes ADD COLUMN IF NOT EXISTS link_video TEXT DEFAULT NULL;")

                        cursor.execute("SELECT to_regclass('public.modulos') IS NOT NULL;")
                        if cursor.fetchone()[0]:
                            cursor.execute("ALTER TABLE modulos ADD COLUMN IF NOT EXISTS questoes_selecionadas INT[] DEFAULT NULL;")
                            # NOVAS COLUNAS: duração e material de apoio
                            cursor.execute("ALTER TABLE modulos ADD COLUMN IF NOT EXISTS duracao_minutos INT DEFAULT NULL;")
                            cursor.execute("ALTER TABLE modulos ADD COLUMN IF NOT EXISTS material_apoio_url TEXT DEFAULT NULL;")

                        cursor.execute("""
                            CREATE TABLE IF NOT EXISTS progresso_trilhas (
                                id SERIAL PRIMARY KEY,
                                usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
                                modulo_id INT NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
                                concluido BOOLEAN DEFAULT FALSE,
                                concluido_em TIMESTAMP DEFAULT NULL,
                                UNIQUE(usuario_id, modulo_id)
                            );
                        """)

                        # NOVAS COLUNAS na tabela trilhas: capa e nível
                        cursor.execute("SELECT to_regclass('public.trilhas') IS NOT NULL;")
                        if cursor.fetchone()[0]:
                            cursor.execute("ALTER TABLE trilhas ADD COLUMN IF NOT EXISTS capa_url TEXT DEFAULT NULL;")
                            cursor.execute("ALTER TABLE trilhas ADD COLUMN IF NOT EXISTS nivel TEXT DEFAULT NULL;")
                        
                        # NOVA TABELA: Dúvidas e Comentários nas Trilhas
                        cursor.execute("""
                            CREATE TABLE IF NOT EXISTS duvidas_trilhas (
                                id SERIAL PRIMARY KEY,
                                modulo_id INT REFERENCES modulos(id) ON DELETE CASCADE,
                                usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
                                texto TEXT NOT NULL,
                                resposta_professor TEXT DEFAULT NULL,
                                data_criacao TIMESTAMP DEFAULT NOW(),
                                respondida_em TIMESTAMP DEFAULT NULL
                            );
                        """)
                        cursor.execute("CREATE INDEX IF NOT EXISTS idx_duvidas_modulo ON duvidas_trilhas(modulo_id);")

                        # NOVA TABELA: Notificações
                        cursor.execute("""
                            CREATE TABLE IF NOT EXISTS notificacoes (
                                id SERIAL PRIMARY KEY,
                                usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
                                titulo TEXT NOT NULL,
                                mensagem TEXT NOT NULL,
                                link TEXT,
                                lida BOOLEAN DEFAULT FALSE,
                                data_criacao TIMESTAMP DEFAULT NOW()
                            );
                        """)
                        cursor.execute("CREATE INDEX IF NOT EXISTS idx_notif_usuario ON notificacoes(usuario_id);")

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
    global _pool
    if _pool:
        _pool.close()
        _pool = None

@contextmanager
def get_conexao():
    if _pool is None:
        raise RuntimeError("Pool não iniciado. Verifique o startup da aplicação.")

    with _pool.connection() as conn:
        yield conn
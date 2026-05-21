"""
utils/db_helpers.py – Funções auxiliares de banco de dados compartilhadas.

Centraliza consultas simples que estavam duplicadas em múltiplos arquivos de rota.
"""
from typing import Optional


def get_papel_usuario(cursor, usuario_id: int) -> Optional[str]:
    """Retorna o papel (aluno/professor/admin) de um usuário pelo ID."""
    cursor.execute("SELECT papel FROM usuarios WHERE id = %s", (usuario_id,))
    row = cursor.fetchone()
    return row[0] if row else None


def get_matricula_usuario(cursor, usuario_id: int) -> Optional[str]:
    """Retorna a matrícula de um usuário pelo ID."""
    cursor.execute("SELECT matricula FROM usuarios WHERE id = %s", (usuario_id,))
    row = cursor.fetchone()
    return row[0] if row else None

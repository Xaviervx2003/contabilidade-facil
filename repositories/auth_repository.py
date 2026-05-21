from typing import Optional, Dict, Any
from psycopg import errors as pg_errors
from database import get_conexao
from utils.security import get_password_hash, verify_password
import uuid
import os
import shutil
from fastapi import UploadFile

class AuthRepository:
    """
    Camada de acesso a dados (Repository) para fluxos de autenticação.
    Centraliza as validações e inserções focadas em login, registro e senhas.
    """

    @staticmethod
    def verificar_credenciais(matricula: str, senha_plana: str) -> Optional[Dict[str, Any]]:
        """Busca usuário pela matrícula e verifica se a senha bate. Retorna dict ou None."""
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, nome, matricula, papel, senha, xp, streak_atual, periodo, objetivo, avatar_url FROM usuarios WHERE matricula = %s;",
                (matricula,)
            )
            u = cursor.fetchone()

        if u and verify_password(senha_plana, u[4]):
            # Atualiza o último acesso
            with get_conexao() as conn2:
                conn2.execute(
                    "UPDATE usuarios SET ultimo_acesso = NOW() WHERE matricula = %s",
                    (matricula,)
                )
                conn2.commit()
            
            return {
                "id": u[0], "nome": u[1], "matricula": u[2], "papel": u[3],
                "xp": u[5] or 0, "streak": u[6] or 0, "periodo": u[7],
                "objetivo": u[8], "avatar_url": u[9]
            }
        return None

    @staticmethod
    def registrar(nome: str, matricula: str, senha_plana: str) -> int:
        """Registra novo aluno. Retorna o ID gerado ou levanta exceções."""
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM usuarios WHERE matricula = %s;", (matricula,))
            if cursor.fetchone():
                raise ValueError("Esta matrícula já está cadastrada.")

            senha_hash = get_password_hash(senha_plana)
            email = matricula if "@" in matricula else None
            
            cursor.execute(
                "INSERT INTO usuarios (nome, matricula, senha, email, papel) VALUES (%s, %s, %s, %s, 'aluno') RETURNING id;",
                (nome, matricula, senha_hash, email)
            )
            novo_id = cursor.fetchone()[0]
            conn.commit()
            return novo_id

    @staticmethod
    def salvar_avatar(usuario_id: int, matricula: str, file: UploadFile) -> str:
        """Salva arquivo de imagem e atualiza o banco. Retorna a URL relativa."""
        extensao = os.path.splitext(file.filename)[1] or ".png"
        nome_arquivo = f"{matricula}_{uuid.uuid4().hex[:8]}{extensao}"
        caminho_salvar = os.path.join("uploads", "avatars", nome_arquivo)
        
        os.makedirs(os.path.dirname(caminho_salvar), exist_ok=True)
        with open(caminho_salvar, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        path_relativo = f"/uploads/avatars/{nome_arquivo}"
        
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE usuarios SET avatar_url = %s WHERE id = %s;", (path_relativo, usuario_id))
            conn.commit()
            
        return path_relativo

    @staticmethod
    def verificar_identidade(matricula: str, nome: str) -> bool:
        """Usado para recuperação de senha."""
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id FROM usuarios WHERE matricula = %s AND LOWER(nome) = LOWER(%s);",
                (matricula, nome)
            )
            return cursor.fetchone() is not None

    @staticmethod
    def redefinir_senha(matricula: str, nova_senha_plana: str) -> bool:
        """Atualiza a senha sem pedir a atual (fluxo de 'esqueci a senha')."""
        senha_hash = get_password_hash(nova_senha_plana)
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE usuarios SET senha = %s WHERE matricula = %s;",
                (senha_hash, matricula)
            )
            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def alterar_senha_segura(matricula: str, senha_atual: str, nova_senha_plana: str) -> bool:
        """Altera a senha apenas se a senha_atual conferir com a do banco."""
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT senha FROM usuarios WHERE matricula = %s;", (matricula,))
            row = cursor.fetchone()

            if not row or not verify_password(senha_atual, row[0]):
                return False

            senha_hash = get_password_hash(nova_senha_plana)
            cursor.execute(
                "UPDATE usuarios SET senha = %s WHERE matricula = %s;",
                (senha_hash, matricula)
            )
            conn.commit()
            return True

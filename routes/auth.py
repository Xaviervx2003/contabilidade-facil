"""
routes/auth.py — Autenticação: login, registro, verificação de identidade, 
                 redefinição e alteração de senha.
"""

from fastapi import APIRouter, HTTPException
from database import get_conexao
from models import (
    LoginRequest,
    RegistroRequest,
    VerificaIdentidadeRequest,
    RedefineSenhaRequest,
    AlteraSenhaRequest,
)
from utils.security import get_password_hash, verify_password
from utils.responses import api_response
from utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter(prefix="/api", tags=["Autenticação"])


@router.post("/login")
def fazer_login(credenciais: LoginRequest):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            # Agora buscamos apenas pela matrícula, a verificação de senha é via hash
            cursor.execute(
                "SELECT id, nome, matricula, papel, senha FROM usuarios WHERE matricula = %s;",
                (credenciais.matricula,),
            )
            usuario = cursor.fetchone()

        if usuario and verify_password(credenciais.senha, usuario[4]):
            logger.info(f"Login bem-sucedido: {credenciais.matricula}")
            return api_response(sucesso=True, dados={
                "id": usuario[0],
                "nome": usuario[1],
                "matricula": usuario[2],
                "papel": usuario[3],
            })
        else:
            logger.warning(f"Tentativa de login falhou: {credenciais.matricula}")
            return api_response(sucesso=False, mensagem="Matrícula ou senha incorretos.", status_code=401)
    except Exception as e:
        logger.exception("Erro crítico no login")
        return api_response(sucesso=False, mensagem="Erro interno no servidor.", status_code=500)


@router.post("/register")
def registrar_usuario(dados: RegistroRequest):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            
            cursor.execute("SELECT id FROM usuarios WHERE matricula = %s;", (dados.matricula,))
            if cursor.fetchone():
                return api_response(sucesso=False, mensagem="Esta matrícula já está cadastrada.", status_code=400)

            # Hashing da senha antes de salvar
            senha_hash = get_password_hash(dados.senha)
            cursor.execute(
                "INSERT INTO usuarios (nome, matricula, senha, papel) VALUES (%s, %s, %s, 'aluno');",
                (dados.nome, dados.matricula, senha_hash),
            )
            conn.commit()
        
        logger.info(f"Novo usuário registrado: {dados.matricula}")
        return api_response(sucesso=True, mensagem="Conta criada com sucesso!")
    except Exception as e:
        logger.exception("Erro no registro de usuário")
        return api_response(sucesso=False, mensagem="Erro ao criar conta.", status_code=500)


@router.post("/verificar-identidade")
def verificar_identidade(dados: VerificaIdentidadeRequest):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id FROM usuarios WHERE matricula = %s AND LOWER(nome) = LOWER(%s);",
                (dados.matricula, dados.nome),
            )
            usuario = cursor.fetchone()

        if usuario:
            return api_response(sucesso=True)
        else:
            return api_response(sucesso=False, mensagem="Dados não conferem.", status_code=404)
    except Exception as e:
        logger.exception("Erro na verificação de identidade")
        return api_response(sucesso=False, mensagem="Erro na verificação.", status_code=500)


@router.post("/redefinir-senha")
def redefinir_senha(dados: RedefineSenhaRequest):
    try:
        if len(dados.nova_senha) < 6:
            return api_response(sucesso=False, mensagem="Senha muito curta.", status_code=400)

        senha_hash = get_password_hash(dados.nova_senha)
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE usuarios SET senha = %s WHERE matricula = %s;",
                (senha_hash, dados.matricula),
            )
            conn.commit()
            linhas_afetadas = cursor.rowcount

        if linhas_afetadas > 0:
            return api_response(sucesso=True, mensagem="Senha redefinida com sucesso!")
        else:
            return api_response(sucesso=False, mensagem="Usuário não encontrado.", status_code=404)
    except Exception as e:
        logger.exception("Erro na redefinição de senha")
        return api_response(sucesso=False, mensagem="Erro ao redefinir.", status_code=500)


@router.post("/alterar-senha")
def alterar_senha(dados: AlteraSenhaRequest):
    try:
        if len(dados.nova_senha) < 6:
            return api_response(sucesso=False, mensagem="A nova senha deve ter pelo menos 6 caracteres.", status_code=400)

        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT senha FROM usuarios WHERE matricula = %s;", (dados.matricula,))
            usuario = cursor.fetchone()

            if not usuario or not verify_password(dados.senha_atual, usuario[0]):
                return api_response(sucesso=False, mensagem="Senha atual incorreta.", status_code=401)

            senha_hash = get_password_hash(dados.nova_senha)
            cursor.execute(
                "UPDATE usuarios SET senha = %s WHERE matricula = %s;",
                (senha_hash, dados.matricula),
            )
            conn.commit()
        return api_response(sucesso=True, mensagem="Senha alterada com sucesso!")
    except Exception as e:
        logger.exception("Erro ao alterar senha")
        return api_response(sucesso=False, mensagem="Erro interno.", status_code=500)


@router.get("/perfil/{matricula}")
def obter_perfil(matricula: str):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, nome, matricula, papel FROM usuarios WHERE matricula = %s;",
                (matricula,),
            )
            usuario = cursor.fetchone()

        if usuario:
            return api_response(sucesso=True, dados={
                "id": usuario[0],
                "nome": usuario[1],
                "matricula": usuario[2],
                "papel": usuario[3],
            })
        else:
            return api_response(sucesso=False, mensagem="Usuário não encontrado.", status_code=404)
    except Exception as e:
        logger.exception(f"Erro ao buscar perfil: {matricula}")
        return api_response(sucesso=False, mensagem="Erro ao buscar perfil.", status_code=500)
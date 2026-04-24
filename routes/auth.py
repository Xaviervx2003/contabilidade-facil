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

router = APIRouter(prefix="/api", tags=["Autenticação"])


@router.post("/login")
def fazer_login(credenciais: LoginRequest):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            # CORREÇÃO: matricula::VARCHAR adicionado
            cursor.execute(
                "SELECT id, nome, matricula, papel FROM usuarios WHERE matricula::VARCHAR = %s AND senha = %s;",
                (credenciais.matricula, credenciais.senha),
            )
            usuario = cursor.fetchone()

        if usuario:
            return {
                "sucesso": True,
                "dados": {
                    "id": usuario[0],
                    "nome": usuario[1],
                    "matricula": usuario[2],
                    "papel": usuario[3],
                },
            }
        else:
            return {"sucesso": False, "mensagem": "Matrícula ou senha incorretos."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no login: {str(e)}")


@router.post("/register")
def registrar_usuario(dados: RegistroRequest):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            
            # CORREÇÃO: matricula::VARCHAR adicionado
            cursor.execute("SELECT id FROM usuarios WHERE matricula::VARCHAR = %s;", (dados.matricula,))
            if cursor.fetchone():
                return {"sucesso": False, "mensagem": "Esta matrícula já está cadastrada."}

            cursor.execute(
                "INSERT INTO usuarios (nome, matricula, senha, papel) VALUES (%s, %s, %s, 'aluno');",
                (dados.nome, dados.matricula, dados.senha),
            )
            conn.commit()
        return {"sucesso": True, "mensagem": "Conta criada com sucesso!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no registro: {str(e)}")


@router.post("/verificar-identidade")
def verificar_identidade(dados: VerificaIdentidadeRequest):
    """Passo 1 da redefinição: confirma que a matrícula + nome batem no banco."""
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            # CORREÇÃO: matricula::VARCHAR adicionado
            cursor.execute(
                "SELECT id FROM usuarios WHERE matricula::VARCHAR = %s AND LOWER(nome) = LOWER(%s);",
                (dados.matricula, dados.nome),
            )
            usuario = cursor.fetchone()

        if usuario:
            return {"sucesso": True}
        else:
            return {
                "sucesso": False,
                "mensagem": "Matrícula ou nome não encontrados. Verifique os dados e tente novamente.",
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na verificação: {str(e)}")


@router.post("/redefinir-senha")
def redefinir_senha(dados: RedefineSenhaRequest):
    """Passo 2 da redefinição: atualiza a senha do usuário identificado pela matrícula."""
    try:
        if len(dados.nova_senha) < 6:
            return {"sucesso": False, "mensagem": "A senha deve ter pelo menos 6 caracteres."}

        with get_conexao() as conn:
            cursor = conn.cursor()
            # CORREÇÃO: matricula::VARCHAR adicionado
            cursor.execute(
                "UPDATE usuarios SET senha = %s WHERE matricula::VARCHAR = %s;",
                (dados.nova_senha, dados.matricula),
            )
            conn.commit()
            linhas_afetadas = cursor.rowcount

        if linhas_afetadas > 0:
            return {"sucesso": True, "mensagem": "Senha redefinida com sucesso!"}
        else:
            return {"sucesso": False, "mensagem": "Usuário não encontrado."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na redefinição: {str(e)}")


@router.post("/alterar-senha")
def alterar_senha(dados: AlteraSenhaRequest):
    """Alteração de senha pelo próprio usuário logado (requer senha atual)."""
    try:
        if len(dados.nova_senha) < 6:
            return {"sucesso": False, "mensagem": "A nova senha deve ter pelo menos 6 caracteres."}

        with get_conexao() as conn:
            cursor = conn.cursor()

            # Verifica se a senha atual bate (CORREÇÃO: matricula::VARCHAR adicionado)
            cursor.execute(
                "SELECT id FROM usuarios WHERE matricula::VARCHAR = %s AND senha = %s;",
                (dados.matricula, dados.senha_atual),
            )
            if not cursor.fetchone():
                return {"sucesso": False, "mensagem": "Senha atual incorreta."}

            # Atualiza (CORREÇÃO: matricula::VARCHAR adicionado)
            cursor.execute(
                "UPDATE usuarios SET senha = %s WHERE matricula::VARCHAR = %s;",
                (dados.nova_senha, dados.matricula),
            )
            conn.commit()
        return {"sucesso": True, "mensagem": "Senha alterada com sucesso!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao alterar senha: {str(e)}")


@router.get("/perfil/{matricula}")
def obter_perfil(matricula: str):
    """Retorna dados do perfil do usuário."""
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            # CORREÇÃO: matricula::VARCHAR adicionado
            cursor.execute(
                "SELECT id, nome, matricula, papel FROM usuarios WHERE matricula::VARCHAR = %s;",
                (matricula,),
            )
            usuario = cursor.fetchone()

        if usuario:
            return {
                "id": usuario[0],
                "nome": usuario[1],
                "matricula": usuario[2],
                "papel": usuario[3],
            }
        else:
            return {"erro": "Usuário não encontrado."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar perfil: {str(e)}")
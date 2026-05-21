"""
routes/auth.py — Autenticação: login, registro, verificação de identidade, 
                 redefinição e alteração de senha.
"""

from fastapi import APIRouter, HTTPException, Request, Depends, UploadFile, File
import os
import shutil
import uuid
from psycopg import errors as pg_errors
from database import get_conexao
from models import (
    LoginRequest,
    RegistroRequest,
    VerificaIdentidadeRequest,
    RedefineSenhaRequest,
    AlteraSenhaRequest,
    AtualizaPerfilRequest,
    EventoAlunoRequest,
)
from utils.security import get_password_hash, verify_password
from utils.responses import api_response
from utils.logger import setup_logger
from utils.rate_limit import rate_limiter
from utils.jwt_auth import criar_token, verificar_proprio_ou_admin, usuario_autenticado

logger = setup_logger(__name__)
router = APIRouter(prefix="/api", tags=["Autenticação"])


@router.post("/login")
def fazer_login(credenciais: LoginRequest, request: Request):
    try:
        host = request.client.host if request.client else "unknown"
        rate_key = f"login:{host}:{credenciais.matricula}"
        allowed, retry_after = rate_limiter.allow(rate_key, limit=10, window_seconds=60)
        if not allowed:
            return api_response(
                sucesso=False,
                mensagem=f"Muitas tentativas de login. Tente novamente em {retry_after}s.",
                status_code=429,
            )

        with get_conexao() as conn:
            cursor = conn.cursor()
            # Agora buscamos apenas pela matrícula, a verificação de senha é via hash
            cursor.execute(
                "SELECT id, nome, matricula, papel, senha, xp, streak_atual, periodo, objetivo, avatar_url FROM usuarios WHERE matricula = %s;",
                (credenciais.matricula,),
            )
            usuario = cursor.fetchone()

        if usuario and verify_password(credenciais.senha, usuario[4]):
            logger.info(f"Login bem-sucedido: {credenciais.matricula}")
            # Atualiza ultimo_acesso
            with get_conexao() as conn2:
                conn2.execute(
                    "UPDATE usuarios SET ultimo_acesso = NOW() WHERE matricula = %s",
                    (credenciais.matricula,)
                )
                conn2.commit()
            token = criar_token(usuario[2], usuario[3], usuario[0])
            return api_response(sucesso=True, dados={
                "id":         usuario[0],
                "nome":       usuario[1],
                "matricula":  usuario[2],
                "papel":      usuario[3],
                "token":      token,
                "xp":         usuario[5] or 0,
                "streak":     usuario[6] or 0,
                "periodo":    usuario[7],
                "objetivo":   usuario[8],
                "avatar_url": usuario[9],
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
        nome = (dados.nome or "").strip()
        matricula = (dados.matricula or "").strip().lower()
        senha = (dados.senha or "").strip()

        if not nome or not matricula or not senha:
            return api_response(sucesso=False, mensagem="Preencha nome, matrícula e senha.", status_code=400)
        if len(senha) < 6:
            return api_response(sucesso=False, mensagem="A senha deve ter pelo menos 6 caracteres.", status_code=400)

        with get_conexao() as conn:
            cursor = conn.cursor()
            
            cursor.execute("SELECT id FROM usuarios WHERE matricula = %s;", (matricula,))
            if cursor.fetchone():
                return api_response(sucesso=False, mensagem="Esta matrícula já está cadastrada.", status_code=400)

            # Hashing da senha antes de salvar
            senha_hash = get_password_hash(senha)
            email = matricula if "@" in matricula else None
            cursor.execute(
                "INSERT INTO usuarios (nome, matricula, senha, email, papel) VALUES (%s, %s, %s, %s, 'aluno');",
                (nome, matricula, senha_hash, email),
            )
            conn.commit()
        
        logger.info(f"Novo usuário registrado: {matricula}")
        return api_response(sucesso=True, mensagem="Conta criada com sucesso!")
    except pg_errors.UniqueViolation:
        return api_response(
            sucesso=False,
            mensagem="Já existe conta com esta matrícula ou e-mail.",
            status_code=400,
        )
    except pg_errors.NotNullViolation as e:
        logger.exception("Schema incompatível no cadastro")
        return api_response(
            sucesso=False,
            mensagem=f"Configuração do banco incompatível para cadastro ({e.diag.column_name or 'coluna obrigatória'}).",
            status_code=500,
        )
    except pg_errors.StringDataRightTruncation:
        return api_response(
            sucesso=False,
            mensagem="Matrícula/nome excede o limite permitido.",
            status_code=400,
        )
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
def alterar_senha(dados: AlteraSenhaRequest, token_data: dict = Depends(usuario_autenticado)):
    try:
        # Garante que só pode alterar a própria senha, exceto se for admin
        if token_data.get("sub") != dados.matricula and token_data.get("papel") != "admin":
            return api_response(sucesso=False, mensagem="Você só pode alterar sua própria senha.", status_code=403)

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
def obter_perfil(matricula: str, token_data: dict = Depends(verificar_proprio_ou_admin)):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """SELECT id, nome, matricula, papel, email, xp, streak_atual, streak_maximo,
                          periodo, objetivo, status_aluno, avatar_url, celular, data_nascimento, criado_em
                   FROM usuarios WHERE matricula = %s;""",
                (matricula,),
            )
            u = cursor.fetchone()

        if u:
            return api_response(sucesso=True, dados={
                "id": u[0], "nome": u[1], "matricula": u[2], "papel": u[3],
                "email": u[4], "xp": u[5] or 0, "streak_atual": u[6] or 0,
                "streak_maximo": u[7] or 0, "periodo": u[8], "objetivo": u[9],
                "status_aluno": u[10], "avatar_url": u[11], "celular": u[12],
                "data_nascimento": u[13].isoformat() if u[13] else None,
                "criado_em": u[14].isoformat() if u[14] else None,
            })
        else:
            return api_response(sucesso=False, mensagem="Usuário não encontrado.", status_code=404)
    except Exception as e:
        logger.exception(f"Erro ao buscar perfil: {matricula}")
        return api_response(sucesso=False, mensagem="Erro ao buscar perfil.", status_code=500)


@router.put("/perfil/{matricula}")
def atualizar_perfil(matricula: str, dados: AtualizaPerfilRequest,
                     token_data: dict = Depends(verificar_proprio_ou_admin)):
    """Atualiza campos opcionais do perfil do aluno autenticado."""
    campos = {
        "periodo": dados.periodo,
        "objetivo": dados.objetivo,
        "celular": dados.celular,
        "avatar_url": dados.avatar_url,
        "data_nascimento": dados.data_nascimento,
        "plataforma_preferida": dados.plataforma_preferida,
    }
    # Filtra apenas campos fornecidos (não None)
    updates = {k: v for k, v in campos.items() if v is not None}
    if not updates:
        return api_response(sucesso=False, mensagem="Nenhum campo para atualizar.", status_code=400)

    set_clause = ", ".join(f"{k} = %({k})s" for k in updates)
    updates["matricula"] = matricula
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute(f"UPDATE usuarios SET {set_clause} WHERE matricula = %(matricula)s", updates)
            conn.commit()
        return api_response(sucesso=True, mensagem="Perfil atualizado com sucesso!")
    except Exception as e:
        logger.exception(f"Erro ao atualizar perfil: {matricula}")
        return api_response(sucesso=False, mensagem="Erro ao atualizar perfil.", status_code=500)


@router.post("/aluno/evento")
def registrar_evento(dados: EventoAlunoRequest, token_data: dict = Depends(usuario_autenticado)):
    """Registra um evento de comportamento do aluno (tracking analítico)."""
    matricula = token_data.get("sub")
    if not matricula:
        raise HTTPException(status_code=401, detail="Token inválido.")
    import json
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO eventos_aluno (matricula, evento, payload) VALUES (%s, %s, %s)",
                (matricula, dados.evento, json.dumps(dados.payload))
            )
            conn.commit()
        return {"ok": True}
    except Exception as e:
        logger.exception("Erro ao registrar evento")
        raise HTTPException(status_code=500, detail="Erro ao registrar evento.")

@router.post("/perfil/upload-avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    token_data: dict = Depends(usuario_autenticado)
):
    """Faz o upload da foto do usuário e retorna a URL."""
    matricula = token_data.get("sub")
    if not matricula:
        raise HTTPException(status_code=401, detail="Token inválido.")
    
    if not file.content_type.startswith("image/"):
        return api_response(sucesso=False, mensagem="O arquivo deve ser uma imagem.", status_code=400)
    
    extensao = os.path.splitext(file.filename)[1]
    if not extensao:
        extensao = ".png"
    
    nome_arquivo = f"{matricula}_{uuid.uuid4().hex[:8]}{extensao}"
    caminho_salvar = os.path.join("uploads", "avatars", nome_arquivo)
    
    os.makedirs(os.path.dirname(caminho_salvar), exist_ok=True)
    
    try:
        with open(caminho_salvar, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.exception("Erro ao salvar arquivo de avatar")
        return api_response(sucesso=False, mensagem="Erro ao processar imagem.", status_code=500)
    
    path_relativo = f"/uploads/avatars/{nome_arquivo}"
    
    return api_response(sucesso=True, mensagem="Avatar atualizado!", dados={"url": path_relativo})
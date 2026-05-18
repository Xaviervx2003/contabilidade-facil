"""
utils/jwt_auth.py — Autenticação JWT para FastAPI.

Gera tokens no login e valida via Depends() nas rotas protegidas.
Chave secreta lida de JWT_SECRET (env var obrigatória em produção).
"""

import os
import time
from typing import Optional, List

from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

import hmac
import hashlib
import base64
import json

from utils.logger import setup_logger

logger = setup_logger(__name__)

# ── Configuração ─────────────────────────────────────────────────
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET não configurada. Defina a variável de ambiente.")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_SECONDS = int(os.getenv("JWT_EXPIRATION", 86400))  # 24h padrão

_security = HTTPBearer(auto_error=False)


# ── Helpers de JWT manual (sem PyJWT) ────────────────────────────

def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(s: str) -> bytes:
    padding = -len(s) % 4
    s += "=" * padding
    return base64.urlsafe_b64decode(s)


def criar_token(matricula: str, papel: str, user_id: int) -> str:
    """Gera um JWT HS256 com payload {sub, papel, id, exp, iat}."""
    header = {"alg": JWT_ALGORITHM, "typ": "JWT"}
    now = int(time.time())
    payload = {
        "sub": matricula,
        "papel": papel,
        "id": user_id,
        "iat": now,
        "exp": now + JWT_EXPIRATION_SECONDS,
    }
    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode())
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode())
    signing_input = f"{header_b64}.{payload_b64}"
    signature = hmac.new(
        JWT_SECRET.encode(), 
        signing_input.encode(), 
        digestmod=hashlib.sha256
    ).digest()
    sig_b64 = _b64url_encode(signature)
    return f"{signing_input}.{sig_b64}"


def decodificar_token(token: str) -> dict:
    """Decodifica e valida um JWT HS256. Levanta HTTPException se inválido."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Token malformado")

        signing_input = f"{parts[0]}.{parts[1]}"
        expected_sig = hmac.new(
            JWT_SECRET.encode(), 
            signing_input.encode(), 
            digestmod=hashlib.sha256
        ).digest()
        actual_sig = _b64url_decode(parts[2])

        if not hmac.compare_digest(expected_sig, actual_sig):
            raise ValueError("Assinatura inválida")

        payload = json.loads(_b64url_decode(parts[1]))

        if payload.get("exp", 0) < int(time.time()):
            raise ValueError("Token expirado")

        return payload
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")


# ── Dependencies para FastAPI ────────────────────────────────────

async def _extrair_token(request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(_security)) -> dict:
    """Extrai e valida o token JWT do header Authorization."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Token de autenticação não fornecido.")
    return decodificar_token(credentials.credentials)


async def usuario_autenticado(payload: dict = Depends(_extrair_token)) -> dict:
    """Retorna o payload do token. Qualquer usuário logado pode acessar."""
    return payload


async def verificar_admin(payload: dict = Depends(_extrair_token)) -> dict:
    """Requer papel 'admin'."""
    if payload.get("papel") != "admin":
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores.")
    return payload


async def verificar_admin_ou_professor(payload: dict = Depends(_extrair_token)) -> dict:
    """Requer papel 'admin' ou 'professor'."""
    if payload.get("papel") not in ("admin", "professor"):
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores e professores.")
    return payload


async def verificar_proprio_ou_admin(request: Request, payload: dict = Depends(_extrair_token)) -> dict:
    """Permite acesso se o usuário é o próprio (matricula no path) ou admin."""
    matricula_path = request.path_params.get("matricula")
    if matricula_path and payload.get("sub") != matricula_path and payload.get("papel") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado. Você só pode acessar seus próprios dados.")
    return payload

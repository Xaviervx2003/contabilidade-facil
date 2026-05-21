"""
routes/sessoes.py — Sessões de estudo + Histórico individual do aluno.
"""

from fastapi import APIRouter, HTTPException
from models import SessaoEstudo
from routes.dashboard import invalidate_dashboard_cache
from repositories.sessao_repository import SessaoRepository

router = APIRouter(prefix="/api", tags=["Sessões"])
repo = SessaoRepository()


@router.post("/sessoes")
def salvar_sessao(sessao: SessaoEstudo):
    try:
        sessao_id = repo.salvar_sessao(sessao)
        invalidate_dashboard_cache()
        return {"status": "Dados salvos com sucesso!", "id": sessao_id}
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao salvar sessão: {str(e)}")


@router.get("/sessoes/{matricula}")
def obter_historico_aluno(matricula: str):
    """Retorna o histórico completo de sessões de um aluno específico."""
    try:
        return repo.obter_historico_aluno(matricula)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao buscar histórico: {str(e)}"
        )

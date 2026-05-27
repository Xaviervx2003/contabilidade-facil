"""
routes/sessoes.py — Sessões de estudo + Histórico individual do aluno.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from models import SessaoEstudo
from utils.jwt_auth import verificar_proprio_ou_admin, usuario_autenticado
from routes.dashboard import invalidate_dashboard_cache
from repositories.sessao_repository import SessaoRepository

router = APIRouter(prefix="/api", tags=["Sessões"])
repo = SessaoRepository()

def _salvar_sessao_background(sessao: SessaoEstudo):
    try:
        repo.salvar_sessao(sessao)
        invalidate_dashboard_cache()
    except Exception as e:
        print(f"Erro no background saving sessao: {e}")

@router.post("/sessoes")
def salvar_sessao(sessao: SessaoEstudo, background_tasks: BackgroundTasks, token: dict = Depends(usuario_autenticado)):
    try:
        # Segurança: Validar se a matrícula da sessão é a mesma do usuário autenticado (ou se é admin)
        if sessao.matricula_aluno != token.get("sub") and token.get("papel") != "admin":
            raise HTTPException(status_code=403, detail="Não autorizado a inserir sessões para este usuário")

        # Enfileira a tarefa de banco de dados pesada
        background_tasks.add_task(_salvar_sessao_background, sessao)
        return {"status": "Sessão enfileirada com sucesso!", "id": -1}
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao enfileirar sessão: {str(e)}")


@router.get("/sessoes/{matricula}")
def obter_historico_aluno(matricula: str, token: dict = Depends(verificar_proprio_ou_admin)):
    """Retorna o histórico completo de sessões de um aluno específico."""
    try:
        return repo.obter_historico_aluno(matricula)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao buscar histórico: {str(e)}"
        )

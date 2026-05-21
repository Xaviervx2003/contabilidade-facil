"""
routes/dashboard_aluno.py — Dashboard personalizado do aluno.

Endpoint único que agrega todas as métricas do aluno para a home:
  - Resumo do dia (questões hoje, tempo hoje)
  - Resumo da semana
  - Streak atual
  - Matérias mais fracas
  - Últimas sessões
  - Progresso geral no banco de questões
"""

from fastapi import APIRouter, HTTPException
import logging
from repositories.analytics_repository import AnalyticsRepository

router = APIRouter(prefix="/api/aluno", tags=["Dashboard Aluno"])
logger = logging.getLogger(__name__)
repo = AnalyticsRepository()

@router.get("/dashboard/{matricula}")
def dashboard_aluno(matricula: str):
    """
    Retorna todos os dados necessários para a home do aluno em uma única chamada.
    """
    try:
        if not matricula or not matricula.strip():
            raise HTTPException(status_code=422, detail="Matrícula inválida")

        matricula = matricula.strip()
        return repo.get_dashboard_aluno(matricula)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no dashboard do aluno {matricula}: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao carregar dashboard: {str(e)}")

"""
routes/relatorios.py – Relatório de estudo mensal com filtros avançados.
Refatorado para utilizar a camada de serviços (Analytics Service).
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from services.analytics_service import get_relatorio_estudo
from utils.db_helpers import get_papel_usuario
from database import get_conexao

router = APIRouter(prefix="/api", tags=["Relatórios"])

@router.get("/relatorios/estudo")
def relatorio_estudo(
    usuario_id: Optional[int] = Query(None),
    mes: Optional[int] = Query(None),
    ano: Optional[int] = Query(None),
    materia_id: Optional[int] = Query(None),
    aluno_matricula: Optional[str] = Query(None),
):
    """
    Retorna resumo mensal, série diária e métricas de engajamento.
    - Se mes/ano omitidos, usa o mês corrente.
    - Se materia_id informado, filtra por questões daquela matéria.
    - Professor só vê dados das próprias questões.
    """
    try:
        papel = None
        if usuario_id:
            with get_conexao() as conn:
                cursor = conn.cursor()
                papel = get_papel_usuario(cursor, usuario_id)

        return get_relatorio_estudo(
            papel=papel,
            usuario_id=usuario_id,
            mes=mes,
            ano=ano,
            materia_id=materia_id,
            aluno_matricula=aluno_matricula
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar relatório: {str(e)}")
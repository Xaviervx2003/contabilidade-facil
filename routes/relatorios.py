"""
routes/relatorios.py – Relatório de estudo mensal com filtros avançados.
Refatorado para utilizar a camada de serviços (Analytics Service).
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional
from services.analytics_service import get_relatorio_estudo
from utils.db_helpers import get_papel_usuario
from utils.jwt_auth import usuario_autenticado
from database import get_conexao

router = APIRouter(prefix="/api", tags=["Relatórios"])

@router.get("/relatorios/estudo")
def relatorio_estudo(
    usuario_id: Optional[int] = Query(None),
    mes: Optional[int] = Query(None),
    ano: Optional[int] = Query(None),
    materia_id: Optional[int] = Query(None),
    aluno_matricula: Optional[str] = Query(None),
    token: dict = Depends(usuario_autenticado),
):
    """
    Retorna resumo mensal, série diária e métricas de engajamento.
    - Se mes/ano omitidos, usa o mês corrente.
    - Se materia_id informado, filtra por questões daquela matéria.
    - Professor só vê dados das próprias questões.
    """
    try:
        # Segurança: IDOR Prevention
        papel = token.get("papel")
        id_autenticado = token.get("id")
        matricula_autenticada = token.get("sub")

        # Se for aluno, só pode ver seu próprio relatório
        if papel == "aluno":
            if aluno_matricula and aluno_matricula != matricula_autenticada:
                raise HTTPException(status_code=403, detail="Não autorizado a ver relatórios de outros alunos.")
            aluno_matricula = matricula_autenticada
            # Aluno não deveria usar 'usuario_id' para ver filtros de professores
            usuario_id = None
        else:
            # Professor/Admin - ignora o usuario_id da URL e usa o do Token (para não falsificar identidade)
            usuario_id = id_autenticado


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
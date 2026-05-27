# routes/metricas_estudantes.py
"""
Métricas e desempenho detalhado dos estudantes.
Visão administrativa/professora com paginação server-side.
Refatorado para utilizar a camada de serviços.
"""
from datetime import datetime
from typing import Optional, List
import logging
import time

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field

from utils.rate_limit import rate_limiter
from services.analytics_service import get_desempenho_estudantes, get_metricas_individual, get_central_risco, get_ranking_turma
from utils.db_helpers import get_papel_usuario
from utils.formatters import formatar_tempo_segundos
from database import get_conexao

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/metricas-estudantes", tags=["Métricas Estudantes"])

# --- Modelos de Resposta ---
class ErrosPorMateriaItem(BaseModel):
    total: int
    erros: int

class MetricasEstudanteResponse(BaseModel):
    matricula: str
    nome: str
    sessoes: int
    questoes: int
    media_numero: float = Field(..., ge=0, le=100)
    media_formatada: str
    tempo_medio_segundos: float
    tempo_medio_formatado: str
    erros_por_materia: dict[str, ErrosPorMateriaItem]
    ultima_atividade: Optional[datetime] = None
    progresso_edital: Optional[float] = None
    ranking_percentil: Optional[float] = None
    streak_dias: Optional[int] = None
    retencao_30d_percentual: Optional[float] = None
    churn_risco_percentual: Optional[float] = None
    conclusao_simulado_percentual: Optional[float] = None

    class Config:
        from_attributes = True

class MetricasPaginadasResponse(BaseModel):
    estudantes: List[MetricasEstudanteResponse]
    total: int
    pagina: int
    por_pagina: int
    total_paginas: int
    tempo_consulta_ms: Optional[float] = None

class CentralRiscoItem(BaseModel):
    matricula: str
    nome: str
    sessoes: int
    ultima_atividade: Optional[datetime] = None
    retencao_30d_percentual: float
    churn_risco_percentual: float
    conclusao_simulado_percentual: float
    nivel_risco: str
    sem_atividade: bool

class CentralRiscoPaginadaResponse(BaseModel):
    estudantes: List[CentralRiscoItem]
    total: int
    pagina: int
    por_pagina: int
    total_paginas: int

# --- Rota Principal ---
@router.get("/desempenho", response_model=MetricasPaginadasResponse)
def obter_desempenho_estudantes(
    request: Request,
    usuario_id: Optional[int] = Query(None),
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(10, ge=1, le=100),
    materia_id: Optional[int] = Query(None),
    data_inicio: Optional[datetime] = Query(None),
    data_fim: Optional[datetime] = Query(None),
):
    start_time = time.time()
    try:
        host = request.client.host if request.client else "unknown"
        rate_key = f"metricas_desempenho:{host}:{usuario_id or 'anon'}"
        allowed, retry_after = rate_limiter.allow(rate_key, limit=30, window_seconds=60)
        if not allowed:
            raise HTTPException(status_code=429, detail=f"Limite temporário excedido. Tente novamente em {retry_after}s.")

        papel = None
        if usuario_id:
            with get_conexao() as conn:
                cursor = conn.cursor()
                papel = get_papel_usuario(cursor, usuario_id)

        linhas, total_alunos = get_desempenho_estudantes(papel, usuario_id, pagina, por_pagina, materia_id, data_inicio, data_fim)

        resultados = []
        for row in linhas:
            nome, matricula, sessoes, total_q, media, tempo_m, ultima, erros_mat, retencao_30d, churn_risco, conclusao_simulado = row
            resultados.append(MetricasEstudanteResponse(
                matricula=matricula, nome=nome, sessoes=int(sessoes), questoes=int(total_q),
                media_numero=float(media or 0), media_formatada=f"{media or 0}%",
                tempo_medio_segundos=float(tempo_m or 0), tempo_medio_formatado=formatar_tempo_segundos(tempo_m),
                erros_por_materia=erros_mat or {}, ultima_atividade=ultima,
                retencao_30d_percentual=float(retencao_30d or 0),
                churn_risco_percentual=float(churn_risco or 0),
                conclusao_simulado_percentual=float(conclusao_simulado or 0)
            ))
        
        return MetricasPaginadasResponse(
            estudantes=resultados, total=total_alunos, pagina=pagina,
            por_pagina=por_pagina, total_paginas=-(-total_alunos // por_pagina),
            tempo_consulta_ms=round((time.time() - start_time) * 1000, 2)
        )
    except Exception as e:
        logger.error(f"Erro métricas: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno ao processar métricas.")

from utils.jwt_auth import verificar_proprio_ou_admin
from fastapi import Depends

@router.get("/desempenho/{matricula}", response_model=MetricasEstudanteResponse)
def obter_metricas_individual_route(
    matricula: str,
    usuario_id: Optional[int] = Query(None),
    token: dict = Depends(verificar_proprio_ou_admin)
):
    try:
        row = get_metricas_individual(matricula)
        if not row: raise HTTPException(status_code=404, detail="Estudante não encontrado")

        nome, matricula_db, sessoes, total_q, media, tempo_m, ultima, erros_mat, retencao_30d, churn_risco, conclusao_simulado = row
        return MetricasEstudanteResponse(
            matricula=matricula_db, nome=nome, sessoes=int(sessoes), questoes=int(total_q),
            media_numero=float(media or 0), media_formatada=f"{media or 0}%",
            tempo_medio_segundos=float(tempo_m or 0), tempo_medio_formatado=formatar_tempo_segundos(tempo_m),
            erros_por_materia=erros_mat or {}, ultima_atividade=ultima,
            retencao_30d_percentual=float(retencao_30d or 0),
            churn_risco_percentual=float(churn_risco or 0),
            conclusao_simulado_percentual=float(conclusao_simulado or 0)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/central-risco", response_model=CentralRiscoPaginadaResponse)
def obter_central_risco_route(
    usuario_id: Optional[int] = Query(None),
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(20, ge=1, le=100),
):
    try:
        papel = None
        if usuario_id:
            with get_conexao() as conn:
                cursor = conn.cursor()
                papel = get_papel_usuario(cursor, usuario_id)

        rows, total = get_central_risco(papel, usuario_id, pagina, por_pagina)

        estudantes = []
        for nome, matricula, sessoes, ultima, ret30, churn, concl in rows:
            nivel = "alto" if churn >= 70 else "médio" if churn >= 40 else "baixo"
            estudantes.append(CentralRiscoItem(
                nome=nome,
                matricula=matricula,
                sessoes=int(sessoes or 0),
                ultima_atividade=ultima,
                retencao_30d_percentual=float(ret30 or 0),
                churn_risco_percentual=float(churn or 0),
                conclusao_simulado_percentual=float(concl or 0),
                nivel_risco=nivel,
                sem_atividade=int(sessoes or 0) == 0,
            ))

        return CentralRiscoPaginadaResponse(
            estudantes=estudantes,
            total=total,
            pagina=pagina,
            por_pagina=por_pagina,
            total_paginas=-(-total // por_pagina),
        )
    except Exception as e:
        logger.error(f"Erro central de risco: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno ao processar central de risco.")

@router.get("/ranking")
def obter_ranking_turma_route(limite: int = Query(50, ge=1, le=100)):
    try:
        return get_ranking_turma(limite)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

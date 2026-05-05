# routes/metricas_estudantes.py
"""
Métricas e desempenho detalhado dos estudantes.
Visão administrativa/professora com paginação server-side.
"""
from datetime import datetime
from typing import Optional, List
import logging
import time

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

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

    class Config:
        from_attributes = True

class MetricasPaginadasResponse(BaseModel):
    estudantes: List[MetricasEstudanteResponse]
    total: int
    pagina: int
    por_pagina: int
    total_paginas: int
    tempo_consulta_ms: Optional[float] = None

# --- Funções Auxiliares ---
def _formatar_tempo(segundos: float) -> str:
    if not segundos or segundos < 60: return f"{int(segundos or 0)}s"
    mins, secs = divmod(int(segundos), 60)
    return f"{mins}m {secs}s" if mins > 0 else f"{secs}s"

def _get_papel_usuario(cursor, usuario_id: int) -> Optional[str]:
    cursor.execute("SELECT papel FROM usuarios WHERE id = %s", (usuario_id,))
    row = cursor.fetchone()
    return row[0] if row else None

def _contar_total_filtrado(cursor, papel: Optional[str], usuario_id: Optional[int]) -> int:
    if papel == "professor" and usuario_id:
        query = """
            SELECT COUNT(DISTINCT u.id) FROM usuarios u
            INNER JOIN sessoes_estudo s ON s.matricula_aluno = u.matricula
            INNER JOIN sessoes_questoes sq ON sq.sessao_id = s.id
            INNER JOIN questoes q ON q.id = sq.questao_id
            WHERE u.papel = 'aluno' AND s.eh_teste_professor IS NOT TRUE AND q.criado_por = %(uid)s
        """
        cursor.execute(query, {"uid": usuario_id})
    else:
        cursor.execute("SELECT COUNT(*) FROM usuarios WHERE papel = 'aluno'")
    return cursor.fetchone()[0]

# --- Rota Principal ---
@router.get("/desempenho", response_model=MetricasPaginadasResponse)
def obter_desempenho_estudantes(
    usuario_id: Optional[int] = Query(None),
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(10, ge=1, le=100),
    materia_id: Optional[int] = Query(None),
    data_inicio: Optional[datetime] = Query(None),
    data_fim: Optional[datetime] = Query(None),
):
    start_time = time.time()
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            papel = _get_papel_usuario(cursor, usuario_id) if usuario_id else None
            
            filtros_adicionais = []
            params_base = {"uid": usuario_id, "limit": por_pagina, "offset": (pagina - 1) * por_pagina}
            
            if materia_id:
                filtros_adicionais.append("AND qm.materia_id = %(materia_id)s")
                params_base["materia_id"] = materia_id
            if data_inicio:
                filtros_adicionais.append("AND s.data_sessao >= %(data_inicio)s")
                params_base["data_inicio"] = data_inicio
            if data_fim:
                filtros_adicionais.append("AND s.data_sessao <= %(data_fim)s")
                params_base["data_fim"] = data_fim
            
            filtro_professor = ""
            if papel == "professor" and usuario_id:
                filtro_professor = "AND EXISTS (SELECT 1 FROM sessoes_questoes sqp JOIN questoes qp ON qp.id = sqp.questao_id WHERE sqp.sessao_id = s.id AND qp.criado_por = %(uid)s)"
            
            filtros_str = " ".join(filtros_adicionais)
            
            query = """
                WITH sessoes_filtradas AS (
                    SELECT u.nome, u.matricula, s.id AS sessao_id, s.questoes_respondidas,
                           s.taxa_acerto, s.tempo_gasto_segundos, s.data_sessao, qm.materia_id,
                           COALESCE(NULLIF(TRIM(s.assunto_estudado), ''), 'Sem assunto') AS assunto_estudado
                    FROM usuarios u
                    INNER JOIN sessoes_estudo s ON s.matricula_aluno = u.matricula
                    LEFT JOIN sessoes_questoes sq_idx ON sq_idx.sessao_id = s.id
                    LEFT JOIN questoes_materias qm ON qm.questao_id = sq_idx.questao_id
                    WHERE u.papel = 'aluno' AND s.eh_teste_professor IS NOT TRUE {filtro_p} {filtros_a}
                ),
                resumo AS (
                    SELECT nome, matricula, COUNT(DISTINCT sessao_id) AS sessoes,
                           SUM(questoes_respondidas) AS total_q,
                           ROUND(AVG(taxa_acerto)::numeric, 1) AS media,
                           AVG(tempo_gasto_segundos) AS tempo_m, MAX(data_sessao) AS ultima
                    FROM sessoes_filtradas GROUP BY nome, matricula
                ),
                erros AS (
                    SELECT matricula, jsonb_object_agg(assunto_estudado, jsonb_build_object('total', t_q, 'erros', t_e)) AS erros_mat
                    FROM (SELECT matricula, assunto_estudado, SUM(questoes_respondidas) as t_q, 
                                 SUM(ROUND(questoes_respondidas * (100 - taxa_acerto) / 100.0)) as t_e
                          FROM sessoes_filtradas GROUP BY matricula, assunto_estudado) sub GROUP BY matricula
                )
                SELECT r.*, COALESCE(e.erros_mat, '{}'::jsonb) FROM resumo r 
                LEFT JOIN erros e ON e.matricula = r.matricula
                ORDER BY r.media DESC LIMIT %(limit)s OFFSET %(offset)s;
            """.replace("{filtro_p}", filtro_professor).replace("{filtros_a}", filtros_str)
            
            try:
                cursor.execute(query, params_base)
                linhas = cursor.fetchall()
            except Exception as e:
                logger.error(f"❌ ERRO NA QUERY: {e}")
                logger.error(f"📝 Query: {query}")
                logger.error(f"📦 Params: {params_base}")
                raise

            total_alunos = _contar_total_filtrado(cursor, papel, usuario_id)
            
            resultados = []
            for row in linhas:
                nome, matricula, sessoes, total_q, media, tempo_m, ultima, erros_mat = row
                resultados.append(MetricasEstudanteResponse(
                    matricula=matricula, nome=nome, sessoes=int(sessoes), questoes=int(total_q),
                    media_numero=float(media or 0), media_formatada=f"{media or 0}%",
                    tempo_medio_segundos=float(tempo_m or 0), tempo_medio_formatado=_formatar_tempo(tempo_m),
                    erros_por_materia=erros_mat or {}, ultima_atividade=ultima
                ))
            
            return MetricasPaginadasResponse(
                estudantes=resultados, total=total_alunos, pagina=pagina,
                por_pagina=por_pagina, total_paginas=-(-total_alunos // por_pagina),
                tempo_consulta_ms=round((time.time() - start_time) * 1000, 2)
            )
    except Exception as e:
        logger.error(f"Erro métricas: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno ao processar métricas.")

@router.get("/desempenho/{matricula}", response_model=MetricasEstudanteResponse)
def obter_metricas_individual(
    matricula: str,
    usuario_id: Optional[int] = Query(None)
):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            query = """
                WITH sessoes_aluno AS (
                    SELECT u.nome, u.matricula, s.id AS sessao_id, s.questoes_respondidas,
                           s.taxa_acerto, s.tempo_gasto_segundos, s.data_sessao,
                           COALESCE(NULLIF(TRIM(s.assunto_estudado), ''), 'Sem assunto') AS assunto_estudado
                    FROM usuarios u
                    INNER JOIN sessoes_estudo s ON s.matricula_aluno = u.matricula
                    WHERE u.matricula = %(matricula)s AND s.eh_teste_professor IS NOT TRUE
                ),
                resumo AS (
                    SELECT nome, matricula, COUNT(sessao_id) AS sessoes,
                           SUM(questoes_respondidas) AS total_q,
                           ROUND(AVG(taxa_acerto)::numeric, 1) AS media,
                           AVG(tempo_gasto_segundos) AS tempo_m, MAX(data_sessao) AS ultima
                    FROM sessoes_aluno GROUP BY nome, matricula
                ),
                erros AS (
                    SELECT jsonb_object_agg(assunto_estudado, jsonb_build_object('total', t_q, 'erros', t_e)) AS erros_mat
                    FROM (SELECT assunto_estudado, SUM(questoes_respondidas) as t_q, 
                                 SUM(ROUND(questoes_respondidas * (100 - taxa_acerto) / 100.0)) as t_e
                          FROM sessoes_aluno GROUP BY assunto_estudado) sub
                )
                SELECT r.*, e.erros_mat FROM resumo r, erros e;
            """
            cursor.execute(query, {"matricula": matricula})
            row = cursor.fetchone()
            if not row: raise HTTPException(status_code=404, detail="Estudante não encontrado")

            nome, matricula, sessoes, total_q, media, tempo_m, ultima, erros_mat = row
            return MetricasEstudanteResponse(
                matricula=matricula, nome=nome, sessoes=int(sessoes), questoes=int(total_q),
                media_numero=float(media or 0), media_formatada=f"{media or 0}%",
                tempo_medio_segundos=float(tempo_m or 0), tempo_medio_formatado=_formatar_tempo(tempo_m),
                erros_por_materia=erros_mat or {}, ultima_atividade=ultima
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ranking")
def obter_ranking_turma(limite: int = Query(50, ge=1, le=100)):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            query = """
                SELECT u.nome, u.matricula, ROUND(AVG(s.taxa_acerto)::numeric, 1) as media,
                       SUM(s.questoes_respondidas) as total_q
                FROM usuarios u
                JOIN sessoes_estudo s ON s.matricula_aluno = u.matricula
                WHERE u.papel = 'aluno'
                GROUP BY u.nome, u.matricula
                HAVING SUM(s.questoes_respondidas) > 0
                ORDER BY media DESC, total_q DESC LIMIT %(limite)s;
            """
            cursor.execute(query, {"limite": limite})
            rows = cursor.fetchall()
            return [{"posicao": i+1, "nome": r[0], "matricula": r[1], "media": float(r[2]), "questoes": int(r[3])} for i, r in enumerate(rows)]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

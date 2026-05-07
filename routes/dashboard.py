# routes/dashboard.py
"""
routes/dashboard.py – Métricas do dashboard geral e visões consolidadas.
Focado em resumo de questões, gráficos de evolução e últimas atividades.
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from database import get_conexao
import time

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])
_cache_store = {}
_CACHE_TTL_SECONDS = 60


def _cache_get(key: str):
    entry = _cache_store.get(key)
    if not entry:
        return None
    if time.time() - entry["ts"] > _CACHE_TTL_SECONDS:
        _cache_store.pop(key, None)
        return None
    return entry["value"]


def _cache_set(key: str, value):
    _cache_store[key] = {"ts": time.time(), "value": value}


def invalidate_dashboard_cache():
    _cache_store.clear()

def _get_papel_usuario(cursor, usuario_id: int) -> Optional[str]:
    cursor.execute("SELECT papel FROM usuarios WHERE id = %s", (usuario_id,))
    row = cursor.fetchone()
    return row[0] if row else None

def _get_matricula(cursor, usuario_id: int) -> Optional[str]:
    cursor.execute("SELECT matricula FROM usuarios WHERE id = %s", (usuario_id,))
    row = cursor.fetchone()
    return row[0] if row else None

@router.get("")
def resumo_dashboard(usuario_id: int = Query(..., description="ID do usuário logado")):
    """Métricas principais para os cards do dashboard."""
    try:
        cache_key = f"dashboard:resumo:{usuario_id}"
        cached = _cache_get(cache_key)
        if cached is not None:
            return cached

        with get_conexao() as conn:
            cursor = conn.cursor()
            papel = _get_papel_usuario(cursor, usuario_id)

            if not papel:
                raise HTTPException(status_code=403, detail="Acesso não autorizado")

            params = [usuario_id]
            filtro_prof = ""
            
            if papel == "professor":
                filtro_prof = """
                    AND EXISTS (
                        SELECT 1 FROM sessoes_questoes sq
                        JOIN questoes q ON q.id = sq.questao_id
                        WHERE sq.sessao_id = s.id AND q.criado_por = %s
                    )
                """
                cursor.execute(f"""
                    SELECT COUNT(DISTINCT s.matricula_aluno) as alunos_ativos,
                           SUM(s.questoes_respondidas) as total_questoes,
                           AVG(s.tempo_gasto_segundos) / 60.0 as tempo_medio
                    FROM sessoes_estudo s
                    WHERE s.eh_teste_professor IS NOT TRUE {filtro_prof}
                """, (usuario_id,))
                
                dados = cursor.fetchone()
                cursor.execute("SELECT COUNT(*) FROM questoes WHERE criado_por = %s", (usuario_id,))
                total_questoes_banco = cursor.fetchone()[0] or 0
                
            else: # aluno ou admin
                matricula = _get_matricula(cursor, usuario_id)
                if papel == "aluno":
                    cursor.execute("""
                        SELECT 1, SUM(questoes_respondidas), AVG(tempo_gasto_segundos) / 60.0
                        FROM sessoes_estudo WHERE matricula_aluno = %s
                    """, (matricula,))
                else: # admin
                    cursor.execute("""
                        SELECT COUNT(DISTINCT matricula_aluno), SUM(questoes_respondidas), 
                               AVG(tempo_gasto_segundos) / 60.0
                        FROM sessoes_estudo WHERE eh_teste_professor IS NOT TRUE
                    """)
                
                dados = cursor.fetchone()
                cursor.execute("SELECT COUNT(*) FROM questoes")
                total_questoes_banco = cursor.fetchone()[0] or 0

        payload = {
            "alunos_ativos": int(dados[0] or 0),
            "total_questoes_resolvidas": int(dados[1] or 0),
            "tempo_medio_minutos": round(float(dados[2] or 0), 1),
            "total_questoes_banco": int(total_questoes_banco)
        }
        _cache_set(cache_key, payload)
        return payload
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sessoes-por-mes")
def sessoes_por_mes(usuario_id: int = Query(..., description="ID do usuário logado")):
    """Dados para o gráfico de evolução mensal."""
    try:
        cache_key = f"dashboard:sessoes_por_mes:{usuario_id}"
        cached = _cache_get(cache_key)
        if cached is not None:
            return cached

        with get_conexao() as conn:
            cursor = conn.cursor()
            papel = _get_papel_usuario(cursor, usuario_id)
            
            filtro = ""
            params = []
            
            if papel == "professor":
                filtro = "AND EXISTS (SELECT 1 FROM sessoes_questoes sq JOIN questoes q ON q.id = sq.questao_id WHERE sq.sessao_id = s.id AND q.criado_por = %s)"
                params.append(usuario_id)
            elif papel == "aluno":
                matricula = _get_matricula(cursor, usuario_id)
                filtro = "AND s.matricula_aluno = %s"
                params.append(matricula)

            cursor.execute(f"""
                SELECT TO_CHAR(DATE_TRUNC('month', s.criado_em), 'Mon/YY') as mes,
                       COUNT(s.id) as total, ROUND(AVG(s.taxa_acerto)::numeric, 1) as media
                FROM sessoes_estudo s
                WHERE s.criado_em >= NOW() - INTERVAL '7 months' {filtro}
                GROUP BY DATE_TRUNC('month', s.criado_em)
                ORDER BY DATE_TRUNC('month', s.criado_em)
            """, params)
            
            rows = cursor.fetchall()
            payload = [{"mes": r[0], "sessoes": int(r[1]), "media_acerto": float(r[2] or 0)} for r in rows]
            _cache_set(cache_key, payload)
            return payload
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/visao-geral")
def visao_geral(usuario_id: int = Query(..., description="ID do usuário logado")):
    """Últimas atividades e média geral."""
    try:
        cache_key = f"dashboard:visao_geral:{usuario_id}"
        cached = _cache_get(cache_key)
        if cached is not None:
            return cached

        with get_conexao() as conn:
            cursor = conn.cursor()
            papel = _get_papel_usuario(cursor, usuario_id)
            
            filtro = ""
            params = {}
            if papel == "professor":
                filtro = "AND EXISTS (SELECT 1 FROM sessoes_questoes sq JOIN questoes q ON q.id = sq.questao_id WHERE sq.sessao_id = s.id AND q.criado_por = %(uid)s)"
                params["uid"] = usuario_id
            elif papel == "aluno":
                params["mat"] = _get_matricula(cursor, usuario_id)
                filtro = "AND s.matricula_aluno = %(mat)s"

            cursor.execute(f"""
                SELECT COALESCE(u.nome, s.matricula_aluno), s.assunto_estudado, s.questoes_respondidas, 
                       s.taxa_acerto, s.criado_em
                FROM sessoes_estudo s
                LEFT JOIN usuarios u ON u.matricula = s.matricula_aluno
                WHERE 1=1 {filtro} ORDER BY s.criado_em DESC LIMIT 5
            """, params)
            
            ultimas = [{"aluno": r[0], "assunto": r[1], "questoes": r[2], "acerto": r[3], "data": r[4].isoformat() if r[4] else None} for r in cursor.fetchall()]
            
            cursor.execute(f"""
                SELECT ROUND(AVG(total_q), 1) FROM (
                    SELECT matricula_aluno, SUM(questoes_respondidas) as total_q
                    FROM sessoes_estudo s WHERE 1=1 {filtro} GROUP BY matricula_aluno
                ) sub
            """, params)
            media_geral = cursor.fetchone()[0] or 0
            
            payload = {"ultimas_sessoes": ultimas, "media_questoes_por_aluno": float(media_geral)}
            _cache_set(cache_key, payload)
            return payload
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
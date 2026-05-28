"""
routes/gamificacao.py — Sistema de gamificação com dados REAIS do banco.

Calcula streaks, medalhas e leaderboard a partir de sessoes_estudo.

Endpoints:
  GET  /api/aluno/streak/{matricula}
  GET  /api/aluno/conquistas/{matricula}
  GET  /api/aluno/leaderboard?tipo=streak&limite=10
  GET  /api/missoes/globais/{matricula}
  POST /api/missoes/concluir
  POST /api/admin/missoes
  GET  /api/admin/missoes
  DELETE /api/admin/missoes/{missao_id}
"""

# ── Imports (todos no topo, sem duplicatas) ─────────────────────────────────
from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
import json
import logging
from datetime import date, timedelta, datetime
from collections import defaultdict
from typing import Dict, Any, List
from database import get_conexao
from utils.jwt_auth import verificar_admin, verificar_proprio_ou_admin, usuario_autenticado

# ───────────────────────────────────────────────────────────────────────────
router = APIRouter(tags=["Gamificação"])
logger = logging.getLogger(__name__)


# ==================== DEFINIÇÃO DE MEDALHAS ====================

MEDALHAS_TIPOS = [
    {
        "id": "iniciante",
        "nome": "Iniciante",
        "tipo": "bronze",
        "descricao": "Responda 100 questões",
        "campo": "questoes",
        "meta": 100,
    },
    {
        "id": "aprendiz",
        "nome": "Aprendiz",
        "tipo": "prata",
        "descricao": "Responda 500 questões",
        "campo": "questoes",
        "meta": 500,
    },
    {
        "id": "especialista",
        "nome": "Especialista",
        "tipo": "ouro",
        "descricao": "Responda 1000 questões",
        "campo": "questoes",
        "meta": 1000,
    },
    {
        "id": "mestre",
        "nome": "Mestre",
        "tipo": "platina",
        "descricao": "Responda 2000 questões",
        "campo": "questoes",
        "meta": 2000,
    },
    {
        "id": "streak_7",
        "nome": "Primeira Semana",
        "tipo": "bronze",
        "descricao": "7 dias de streak consecutivo",
        "campo": "streak",
        "meta": 7,
    },
    {
        "id": "streak_30",
        "nome": "Um Mês",
        "tipo": "ouro",
        "descricao": "30 dias de streak consecutivo",
        "campo": "streak",
        "meta": 30,
    },
    {
        "id": "sessoes_10",
        "nome": "Dedicado",
        "tipo": "bronze",
        "descricao": "Complete 10 sessões de estudo",
        "campo": "sessoes",
        "meta": 10,
    },
    {
        "id": "sessoes_50",
        "nome": "Persistente",
        "tipo": "prata",
        "descricao": "Complete 50 sessões de estudo",
        "campo": "sessoes",
        "meta": 50,
    },
]


# ==================== FUNÇÕES AUXILIARES ====================





_metricas_cache = {}

def _buscar_metricas_aluno_db(matricula: str) -> dict:
    """
    Busca todas as métricas do aluno diretamente do banco,
    incluindo o cálculo de streak via funções analíticas SQL.
    """
    with get_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute("SET statement_timeout = '5000'")

        # 1. Buscar usuario e garantir que a matrícula pertence a um aluno
        cursor.execute(
            "SELECT nome, papel FROM usuarios WHERE matricula = %s",
            (matricula,)
        )
        row_usuario = cursor.fetchone()
        if not row_usuario:
            raise HTTPException(status_code=404, detail="Aluno não encontrado")
        if row_usuario[1] != "aluno":
            raise HTTPException(status_code=403, detail="Esta rota é exclusiva para alunos")
        nome = row_usuario[0]

        # 2. Métricas agregadas e Streak via CTE SQL Native
        cursor.execute("""
            WITH sessoes_aluno AS (
                SELECT id, DATE(criado_em) AS dia 
                FROM sessoes_estudo 
                WHERE (matricula_aluno = %(matricula)s OR nome_aluno = %(matricula)s) 
                  AND eh_teste_professor IS NOT TRUE
            ),
            sessoes_distintas AS (
                SELECT DISTINCT DATE(criado_em) AS dia
                FROM sessoes_aluno
            ),
            sessoes_ordenadas AS (
                SELECT 
                    dia,
                    dia - (ROW_NUMBER() OVER (ORDER BY dia ASC))::int AS grp
                FROM sessoes_distintas
            ),
            streaks AS (
                SELECT 
                    grp,
                    COUNT(*) AS streak_length,
                    MAX(dia) AS streak_end
                FROM sessoes_ordenadas
                GROUP BY grp
            )
            SELECT
                (SELECT COUNT(id) FROM sessoes_aluno) AS total_sessoes,
                (SELECT COALESCE(SUM(questoes_respondidas), 0) FROM sessoes_aluno) AS total_questoes,
                (SELECT COALESCE(SUM(tempo_gasto_segundos), 0) FROM sessoes_aluno) AS tempo_total_seg,
                (SELECT MAX(criado_em) FROM sessoes_aluno) AS ultima_sessao,
                COALESCE((SELECT MAX(streak_length) FROM streaks), 0) AS streak_maximo,
                COALESCE((SELECT streak_length FROM streaks WHERE streak_end >= CURRENT_DATE - INTERVAL '1 day' ORDER BY streak_end DESC LIMIT 1), 0) AS streak_atual;
        """, {"matricula": matricula})
        metricas = cursor.fetchone()

    return {
        "nome": nome,
        "matricula": matricula,
        "total_questoes": int(metricas[1] or 0),
        "total_sessoes": int(metricas[0] or 0),
        "tempo_total_seg": int(metricas[2] or 0),
        "ultima_sessao": metricas[3],
        "streak_maximo": int(metricas[4] or 0),
        "streak_atual": int(metricas[5] or 0),
    }

def _buscar_metricas_aluno(matricula: str) -> dict:
    """
    Usa cache em memória de 5 minutos para evitar requisições repetitivas no banco
    ao trocar de abas ou realizar F5.
    """
    agora = datetime.now()
    cached = _metricas_cache.get(matricula)
    if cached and (agora - cached['ts']) < timedelta(minutes=5):
        return cached['data']
    
    result = _buscar_metricas_aluno_db(matricula)
    _metricas_cache[matricula] = {'data': result, 'ts': agora}
    return result





def _avaliar_medalhas(total_questoes: int, total_sessoes: int, streak_atual: int, streak_maximo: int) -> list:
    """Avalia quais medalhas o aluno desbloqueou e calcula progresso."""
    medalhas = []
    for m in MEDALHAS_TIPOS:
        campo = m["campo"]
        meta  = m["meta"]

        if campo == "questoes":
            valor_atual = total_questoes
        elif campo == "sessoes":
            valor_atual = total_sessoes
        elif campo == "streak":
            valor_atual = streak_maximo  # usa máximo para medalhas de streak
        else:
            valor_atual = 0

        progresso = min(round((valor_atual / meta) * 100, 1), 100) if meta > 0 else 0

        medalhas.append({
            "nome":             m["nome"],
            "tipo":             m["tipo"],
            "descricao":        m["descricao"],
            "desbloqueada":     valor_atual >= meta,
            "data_desbloqueio": None,   # Futuro: persistir data no banco
            "progresso":        progresso,
        })
    return medalhas


# ==================== ENDPOINTS — STREAK / CONQUISTAS / LEADERBOARD ====================


@router.get("/api/aluno/streak/{matricula}")
def get_streak(matricula: str, token: dict = Depends(verificar_proprio_ou_admin)):
    """Retorna informações do streak do aluno calculado a partir do banco."""
    try:
        if not matricula or not matricula.strip():
            raise HTTPException(status_code=422, detail="Matrícula inválida ou vazia")

        metricas = _buscar_metricas_aluno(matricula.strip())
        streak_atual = metricas["streak_atual"]
        streak_maximo = metricas["streak_maximo"]

        ultima = metricas["ultima_sessao"]
        proxima_iso = (ultima + timedelta(days=1)).isoformat() if ultima else None
        ultima_iso  = ultima.isoformat() if ultima else None

        return {
            "dias_atuais":              streak_atual,
            "dias_maximo":              streak_maximo,
            "ultima_atividade":         ultima_iso,
            "proxima_data_para_manter": proxima_iso,
            "emoji":                    "🔥" if streak_atual > 0 else "❄️",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro em streak para {matricula}: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar streak: {str(e)}")


@router.get("/api/aluno/conquistas/{matricula}")
def get_conquistas(matricula: str, token: dict = Depends(verificar_proprio_ou_admin)):
    """Retorna todas as conquistas do aluno: streak, medalhas e estatísticas."""
    try:
        if not matricula or not matricula.strip():
            raise HTTPException(status_code=422, detail="Matrícula inválida ou vazia")

        metricas = _buscar_metricas_aluno(matricula.strip())
        streak_atual = metricas["streak_atual"]
        streak_maximo = metricas["streak_maximo"]

        ultima = metricas["ultima_sessao"]
        streak_data = {
            "dias_atuais":              streak_atual,
            "dias_maximo":              streak_maximo,
            "ultima_atividade":         ultima.isoformat() if ultima else None,
            "proxima_data_para_manter": (ultima + timedelta(days=1)).isoformat() if ultima else None,
        }

        return {
            "streak":                       streak_data,
            "medalhas":                     _avaliar_medalhas(
                                                metricas["total_questoes"],
                                                metricas["total_sessoes"],
                                                streak_atual,
                                                streak_maximo,
                                            ),
            "total_questoes_respondidas":   metricas["total_questoes"],
            "total_sessoes":                metricas["total_sessoes"],
            "tempo_estudo_total_minutos":   metricas["tempo_total_seg"] // 60,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro em conquistas para {matricula}: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar conquistas: {str(e)}")


@router.get("/api/aluno/leaderboard")
def get_leaderboard(
    tipo:   str = Query("streak", description="streak ou questoes"),
    limite: int = Query(10, ge=1, le=100, description="Limite de resultados"),
    token: dict = Depends(usuario_autenticado),
):
    """Retorna ranking dos alunos por streak ou questões."""
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()

            if tipo == "questoes":
                cursor.execute("""
                    SELECT
                        u.nome,
                        u.matricula,
                        COALESCE(SUM(s.questoes_respondidas), 0) AS total_q
                    FROM usuarios u
                    JOIN sessoes_estudo s
                         ON COALESCE(s.matricula_aluno, s.nome_aluno) = u.matricula
                    WHERE u.papel = 'aluno'
                      AND s.eh_teste_professor IS NOT TRUE
                    GROUP BY u.nome, u.matricula
                    ORDER BY total_q DESC
                    LIMIT %s;
                """, (limite,))
                rows = cursor.fetchall()
                return [
                    {"posicao": idx, "nome": r[0], "matricula": r[1], "valor": int(r[2]), "emoji": "❓"}
                    for idx, r in enumerate(rows, 1)
                ]

            elif tipo == "streak":
                cursor.execute("""
                    WITH sessoes_alunos AS (
                        SELECT 
                            u.matricula AS matricula,
                            u.nome AS nome,
                            DATE(s.criado_em) AS dia
                        FROM usuarios u
                        JOIN sessoes_estudo s ON s.matricula_aluno = u.matricula
                        WHERE u.papel = 'aluno'
                          AND s.eh_teste_professor IS NOT TRUE
                        
                        UNION
                        
                        SELECT 
                            u.matricula AS matricula,
                            u.nome AS nome,
                            DATE(s.criado_em) AS dia
                        FROM usuarios u
                        JOIN sessoes_estudo s ON s.nome_aluno = u.matricula
                        WHERE u.papel = 'aluno'
                          AND s.eh_teste_professor IS NOT TRUE
                    ),
                    sessoes_distintas AS (
                        SELECT DISTINCT matricula, nome, dia
                        FROM sessoes_alunos
                    ),
                    sessoes_ordenadas AS (
                        SELECT 
                            matricula,
                            nome,
                            dia,
                            dia - (ROW_NUMBER() OVER (PARTITION BY matricula ORDER BY dia ASC))::int AS grp
                        FROM sessoes_distintas
                    ),
                    streaks AS (
                        SELECT 
                            grp,
                            matricula,
                            nome,
                            COUNT(*) AS streak_length,
                            MAX(dia) AS streak_end
                        FROM sessoes_ordenadas
                        GROUP BY matricula, nome, grp
                    ),
                    max_streaks AS (
                        SELECT 
                            matricula,
                            nome,
                            MAX(streak_length) AS streak_maximo
                        FROM streaks
                        GROUP BY matricula, nome
                    ),
                    current_streaks AS (
                        SELECT 
                            matricula,
                            nome,
                            MAX(streak_length) AS streak_atual
                        FROM streaks
                        WHERE streak_end >= CURRENT_DATE - INTERVAL '1 day'
                        GROUP BY matricula, nome
                    )
                    SELECT 
                        u.nome,
                        u.matricula,
                        COALESCE(cs.streak_atual, 0) AS streak_atual,
                        COALESCE(ms.streak_maximo, 0) AS streak_maximo
                    FROM usuarios u
                    LEFT JOIN current_streaks cs ON cs.matricula = u.matricula
                    LEFT JOIN max_streaks ms ON ms.matricula = u.matricula
                    WHERE u.papel = 'aluno'
                    ORDER BY streak_atual DESC, streak_maximo DESC
                    LIMIT %s;
                """, (limite,))
                rows = cursor.fetchall()
                return [
                    {
                        "posicao": idx,
                        "nome": r[0],
                        "matricula": r[1],
                        "valor": int(r[2]),
                        "emoji": "🔥"
                    }
                    for idx, r in enumerate(rows, 1)
                ]

            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Tipo inválido: '{tipo}'. Use 'streak' ou 'questoes'."
                )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro em leaderboard: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar leaderboard: {str(e)}")


# ==================== MISSÕES GLOBAIS ====================


class MissaoGlobalCreate(BaseModel):
    titulo:       str
    descricao:    str
    xp:           int = 100
    icone:        Optional[str] = "🎯"
    cor:          Optional[str] = "#FF385C"
    metrica_tipo: Literal["manual", "sessoes", "media_acerto", "questoes"] = "manual"
    metrica_alvo: Optional[int] = None
    data_limite:  Optional[date] = None


@router.post("/api/admin/missoes")
def criar_missao_global(missao: MissaoGlobalCreate, token: dict = Depends(verificar_admin)):
    if missao.metrica_tipo != "manual" and missao.metrica_alvo is None:
        raise HTTPException(status_code=422, detail="metrica_alvo é obrigatório para missões automáticas.")
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO missoes_globais
                    (titulo, dica, xp, icon, cor, metrica_tipo, metrica_alvo, data_limite)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id;
            """, (
                missao.titulo, missao.descricao, missao.xp,
                missao.icone, missao.cor, missao.metrica_tipo,
                missao.metrica_alvo, missao.data_limite,
            ))
            new_id = cursor.fetchone()[0]
            conn.commit()
            return {"sucesso": True, "id": new_id}
    except Exception as e:
        logger.error(f"Erro ao criar missão: {e}")
        raise HTTPException(status_code=500, detail="Erro ao criar missão global")


def _listar_missoes_base(matricula: Optional[str] = None):
    """Lógica central para listar missões globais com ou sem progresso de aluno."""
    hoje = date.today()
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()

            # 1. Missões + flag de conclusão (se matricula fornecida)
            cursor.execute("""
                SELECT
                    m.id, m.titulo, m.dica AS descricao, m.xp,
                    m.icon AS icone, m.cor,
                    m.metrica_tipo, m.metrica_alvo, m.data_limite,
                    CASE WHEN mc.id IS NOT NULL THEN TRUE ELSE FALSE END AS concluida
                FROM missoes_globais m
                LEFT JOIN missoes_concluidas mc
                       ON mc.missao_id = m.id AND mc.matricula = %s
                ORDER BY m.data_limite ASC NULLS LAST, m.id DESC;
            """, (matricula,))

            columns = [col[0] for col in cursor.description]
            missoes = [dict(zip(columns, row)) for row in cursor.fetchall()]

            # 2. KPIs da semana atual (somente se houver matrícula)
            sessoes_semana = 0
            media_semana = 0
            questoes_semana = 0
            if matricula:
                cursor.execute("""
                    SELECT
                        COUNT(*)                                        AS total_sessoes,
                        COALESCE(AVG(taxa_acerto), 0)::int              AS media_acerto,
                        COALESCE(SUM(questoes_respondidas), 0)::int     AS total_questoes
                    FROM sessoes_estudo
                    WHERE matricula_aluno = %s
                      AND criado_em >= date_trunc('week', NOW());
                """, (matricula,))
                kpis_row = cursor.fetchone()
                if kpis_row:
                    sessoes_semana = kpis_row[0]
                    media_semana = kpis_row[1]
                    questoes_semana = kpis_row[2]

        resultado = []
        for m in missoes:
            # ── Calcular progresso ──────────────────────────────────────
            if not matricula:
                progresso = 0
            elif m["metrica_tipo"] == "sessoes":
                progresso = min(int((sessoes_semana / (m["metrica_alvo"] or 1)) * 100), 100)
            elif m["metrica_tipo"] == "media_acerto":
                progresso = min(int((media_semana   / (m["metrica_alvo"] or 1)) * 100), 100)
            elif m["metrica_tipo"] == "questoes":
                progresso = min(int((questoes_semana / (m["metrica_alvo"] or 1)) * 100), 100)
            else:  # manual
                progresso = 100 if m["concluida"] else 0

            # ── Converter data_limite ───────────────────────────────────
            data_lim: Optional[date] = None
            if m["data_limite"]:
                data_lim = (
                    m["data_limite"].date()
                    if hasattr(m["data_limite"], "date")
                    else m["data_limite"]
                )

            # ── Determinar status ───────────────────────────────────────
            if m["concluida"] or (m["metrica_tipo"] != "manual" and progresso >= 100):
                status = "concluida"
            elif data_lim and data_lim < hoje:
                status = "expirada"
            else:
                status = "pendente"

            dias_restantes = (data_lim - hoje).days if data_lim and status == "pendente" else None

            m.update({
                "progresso":      progresso,
                "status":         status,
                "dias_restantes": dias_restantes,
                "data_limite":    data_lim.isoformat() if data_lim else None,
            })
            resultado.append(m)

        return resultado

    except Exception as e:
        logger.error(f"Erro em _listar_missoes_base (mat={matricula}): {e}")
        raise HTTPException(status_code=500, detail="Erro interno")


@router.get("/api/missoes/globais/{matricula}")
def listar_missoes_aluno(matricula: str, token: dict = Depends(verificar_proprio_ou_admin)):
    """Lista missões globais com progresso REAL do aluno."""
    return _listar_missoes_base(matricula)


@router.get("/api/missoes/globais")
def listar_missoes_fallback(token: dict = Depends(usuario_autenticado)):
    """Endpoint de fallback que retorna a lista de missões sem progresso individual."""
    return _listar_missoes_base(None)


@router.post("/api/missoes/concluir")
def concluir_missao(payload: dict, token: dict = Depends(usuario_autenticado)):
    matricula = payload.get("matricula")
    missao_id = payload.get("missao_id")
    
    if not matricula or (matricula != token.get("sub") and token.get("papel") != "admin"):
        raise HTTPException(status_code=403, detail="Não autorizado a concluir missões para este usuário")
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT metrica_tipo, xp FROM missoes_globais WHERE id = %s",
                (missao_id,)
            )
            m = cursor.fetchone()
            if not m:
                raise HTTPException(status_code=404, detail="Missão não encontrada")
            if m[0] != "manual":
                raise HTTPException(status_code=400, detail="Esta missão é validada automaticamente")

            cursor.execute("""
                INSERT INTO missoes_concluidas (matricula, missao_id)
                VALUES (%s, %s)
                ON CONFLICT (matricula, missao_id) DO NOTHING
                RETURNING id;
            """, (matricula, missao_id))
            inserido = cursor.fetchone()

            if not inserido:
                return {"ok": False, "msg": "Missão já estava concluída"}

            cursor.execute(
                "UPDATE usuarios SET xp = COALESCE(xp, 0) + %s WHERE matricula = %s",
                (m[1], matricula)
            )
            conn.commit()
            return {"ok": True, "msg": "Missão concluída"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao concluir missão: {e}")
        raise HTTPException(status_code=500, detail="Erro interno")


@router.delete("/api/admin/missoes/{missao_id}")
def delete_missao_global(missao_id: int, token: dict = Depends(verificar_admin)):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM missoes_globais WHERE id = %s", (missao_id,))
            conn.commit()
            return {"sucesso": True}
    except Exception as e:
        logger.error(f"Erro ao deletar missão {missao_id}: {e}")
        raise HTTPException(status_code=500, detail="Erro ao deletar")


@router.get("/api/admin/missoes")
def get_missoes_admin(token: dict = Depends(verificar_admin)):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, titulo, dica AS descricao, xp,
                       icon AS icone, cor, metrica_tipo, metrica_alvo, data_limite
                FROM missoes_globais
                ORDER BY criado_em DESC;
            """)
            cols = [col[0] for col in cursor.description]
            return [dict(zip(cols, row)) for row in cursor.fetchall()]
    except Exception as e:
        logger.error(f"Erro ao buscar missoes admin: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar missões admin")
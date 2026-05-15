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
from typing import Optional, Literal
from datetime import datetime, timedelta, date
import logging

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


def _calcular_streak(datas_estudo: list) -> tuple:
    """
    Calcula streak atual e streak máximo a partir de uma lista de datas
    DISTINTAS em que o aluno estudou, ordenadas DESC.

    Retorna (streak_atual, streak_maximo).
    """
    if not datas_estudo:
        return 0, 0

    hoje = date.today()
    streak_maximo = 0
    streak_corrente = 1

    # Verificar se o aluno estudou hoje ou ontem (streak ativo)
    primeira_data = datas_estudo[0]
    diff_hoje = (hoje - primeira_data).days

    # Percorrer as datas para calcular streak máximo
    for i in range(1, len(datas_estudo)):
        diff = (datas_estudo[i - 1] - datas_estudo[i]).days
        if diff == 1:
            streak_corrente += 1
        elif diff == 0:
            continue  # Mesmo dia — não deveria acontecer com DISTINCT
        else:
            streak_maximo = max(streak_maximo, streak_corrente)
            streak_corrente = 1

    streak_maximo = max(streak_maximo, streak_corrente)

    # O streak atual só conta se o aluno estudou hoje ou ontem
    if diff_hoje > 1:
        return 0, streak_maximo

    streak_atual = 1
    for i in range(1, len(datas_estudo)):
        diff = (datas_estudo[i - 1] - datas_estudo[i]).days
        if diff == 1:
            streak_atual += 1
        else:
            break

    return streak_atual, streak_maximo


def _buscar_metricas_aluno(matricula: str) -> dict:
    """
    Busca todas as métricas do aluno diretamente do banco.
    Retorna dict com: nome, datas_estudo, total_questoes, total_sessoes,
    tempo_total_seg, ultima_sessao.
    """
    with get_conexao() as conn:
        cursor = conn.cursor()

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

        # 2. Métricas agregadas
        cursor.execute("""
            SELECT
                COUNT(id)                                   AS total_sessoes,
                COALESCE(SUM(questoes_respondidas), 0)      AS total_questoes,
                COALESCE(SUM(tempo_gasto_segundos), 0)      AS tempo_total_seg,
                MAX(criado_em)                              AS ultima_sessao
            FROM sessoes_estudo
            WHERE COALESCE(matricula_aluno, nome_aluno) = %s
              AND eh_teste_professor IS NOT TRUE;
        """, (matricula,))
        metricas = cursor.fetchone()

        # 3. Datas DISTINTAS de estudo (para cálculo de streak)
        cursor.execute("""
            SELECT DISTINCT DATE(criado_em) AS dia
            FROM sessoes_estudo
            WHERE COALESCE(matricula_aluno, nome_aluno) = %s
              AND eh_teste_professor IS NOT TRUE
            ORDER BY dia DESC;
        """, (matricula,))
        datas_rows = cursor.fetchall()

    return {
        "nome": nome,
        "matricula": matricula,
        "datas_estudo": [row[0] for row in datas_rows],
        "total_questoes": int(metricas[1] or 0),
        "total_sessoes": int(metricas[0] or 0),
        "tempo_total_seg": int(metricas[2] or 0),
        "ultima_sessao": metricas[3],
    }


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
        streak_atual, streak_maximo = _calcular_streak(metricas["datas_estudo"])

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
        streak_atual, streak_maximo = _calcular_streak(metricas["datas_estudo"])

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
                    SELECT
                        u.nome,
                        u.matricula,
                        ARRAY_AGG(DISTINCT DATE(s.criado_em)
                                  ORDER BY DATE(s.criado_em) DESC) AS datas
                    FROM usuarios u
                    JOIN sessoes_estudo s
                         ON COALESCE(s.matricula_aluno, s.nome_aluno) = u.matricula
                    WHERE u.papel = 'aluno'
                      AND s.eh_teste_professor IS NOT TRUE
                    GROUP BY u.nome, u.matricula;
                """)
                rows = cursor.fetchall()

                alunos_streaks = []
                for nome, mat, datas in rows:
                    streak_at, streak_max = _calcular_streak(datas) if datas else (0, 0)
                    alunos_streaks.append({
                        "nome": nome, "matricula": mat,
                        "streak_atual": streak_at, "streak_maximo": streak_max,
                    })

                alunos_streaks.sort(
                    key=lambda x: (x["streak_atual"], x["streak_maximo"]),
                    reverse=True,
                )
                return [
                    {"posicao": idx, "nome": a["nome"], "matricula": a["matricula"],
                     "valor": a["streak_atual"], "emoji": "🔥"}
                    for idx, a in enumerate(alunos_streaks[:limite], 1)
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
            if matricula:
                cursor.execute("""
                    SELECT
                        COUNT(*)                              AS total_sessoes,
                        COALESCE(AVG(taxa_acerto), 0)::int    AS media_acerto
                    FROM sessoes_estudo
                    WHERE matricula_aluno = %s
                      AND criado_em >= date_trunc('week', NOW());
                """, (matricula,))
                kpis_row = cursor.fetchone()
                if kpis_row:
                    sessoes_semana = kpis_row[0]
                    media_semana = kpis_row[1]

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
                progresso = 0   # expandir futuramente
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
def concluir_missao(payload: dict):
    matricula = payload.get("matricula")
    missao_id = payload.get("missao_id")
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
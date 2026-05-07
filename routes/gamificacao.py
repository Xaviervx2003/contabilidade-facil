"""
routes/gamificacao.py — Sistema de gamificação com dados REAIS do banco.

Calcula streaks, medalhas e leaderboard a partir de sessoes_estudo.

Endpoints:
  GET /api/aluno/streak/{matricula}
  GET /api/aluno/conquistas/{matricula}
  GET /api/aluno/leaderboard?tipo=streak&limite=10
"""

from fastapi import APIRouter, HTTPException, Query
from database import get_conexao
from datetime import datetime, timedelta, date
import logging

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


def _calcular_streak(datas_estudo: list[date]) -> tuple[int, int]:
    """
    Calcula streak atual e streak máximo a partir de uma lista de datas
    DISTINTAS em que o aluno estudou, ordenadas DESC.

    Retorna (streak_atual, streak_maximo).
    """
    if not datas_estudo:
        return 0, 0

    hoje = date.today()
    streak_atual = 0
    streak_maximo = 0
    streak_corrente = 1

    # As datas já vêm ordenadas DESC do banco
    # Verificar se o aluno estudou hoje ou ontem (streak ativo)
    primeira_data = datas_estudo[0]
    diff_hoje = (hoje - primeira_data).days

    if diff_hoje > 1:
        # Não estudou hoje nem ontem — streak atual = 0
        # Mas ainda calculamos o streak máximo
        streak_atual = 0
    else:
        streak_atual = 1  # pelo menos 1 dia (hoje ou ontem)

    # Percorrer as datas para calcular streaks
    for i in range(1, len(datas_estudo)):
        diff = (datas_estudo[i - 1] - datas_estudo[i]).days

        if diff == 1:
            # Dias consecutivos
            streak_corrente += 1
        elif diff == 0:
            # Mesmo dia (não deveria acontecer com DISTINCT)
            continue
        else:
            # Gap encontrado — finaliza streak corrente
            streak_maximo = max(streak_maximo, streak_corrente)
            streak_corrente = 1

    # Finalizar último streak
    streak_maximo = max(streak_maximo, streak_corrente)

    # O streak atual só conta se o aluno estudou hoje/ontem
    if diff_hoje <= 1:
        # streak_atual = streak consecutivo a partir de hoje/ontem
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
    Retorna dict com: nome, datas_estudo, total_questoes, total_sessoes, tempo_total_seg, ultima_sessao.
    """
    with get_conexao() as conn:
        cursor = conn.cursor()

        # 1. Buscar nome do aluno
        cursor.execute(
            "SELECT nome FROM usuarios WHERE matricula = %s",
            (matricula,)
        )
        row_usuario = cursor.fetchone()
        nome = row_usuario[0] if row_usuario else matricula

        # 2. Métricas agregadas
        cursor.execute("""
            SELECT
                COUNT(id) AS total_sessoes,
                COALESCE(SUM(questoes_respondidas), 0) AS total_questoes,
                COALESCE(SUM(tempo_gasto_segundos), 0) AS tempo_total_seg,
                MAX(criado_em) AS ultima_sessao
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

    total_sessoes = int(metricas[0] or 0)
    total_questoes = int(metricas[1] or 0)
    tempo_total_seg = int(metricas[2] or 0)
    ultima_sessao = metricas[3]  # datetime ou None
    datas_estudo = [row[0] for row in datas_rows]  # list[date]

    return {
        "nome": nome,
        "matricula": matricula,
        "datas_estudo": datas_estudo,
        "total_questoes": total_questoes,
        "total_sessoes": total_sessoes,
        "tempo_total_seg": tempo_total_seg,
        "ultima_sessao": ultima_sessao,
    }


def _avaliar_medalhas(total_questoes: int, total_sessoes: int, streak_atual: int, streak_maximo: int) -> list[dict]:
    """Avalia quais medalhas o aluno desbloqueou e calcula progresso."""
    medalhas = []

    for m in MEDALHAS_TIPOS:
        campo = m["campo"]
        meta = m["meta"]

        if campo == "questoes":
            valor_atual = total_questoes
        elif campo == "sessoes":
            valor_atual = total_sessoes
        elif campo == "streak":
            valor_atual = streak_maximo  # Usa máximo para medalhas de streak
        else:
            valor_atual = 0

        desbloqueada = valor_atual >= meta
        progresso = min(round((valor_atual / meta) * 100, 1), 100) if meta > 0 else 0

        medalhas.append({
            "nome": m["nome"],
            "tipo": m["tipo"],
            "descricao": m["descricao"],
            "desbloqueada": desbloqueada,
            "data_desbloqueio": None,  # Futuro: persistir data no banco
            "progresso": progresso,
        })

    return medalhas


# ==================== ENDPOINTS ====================


@router.get("/api/aluno/streak/{matricula}")
def get_streak(matricula: str):
    """
    Retorna informações do streak do aluno calculado a partir do banco.

    O streak conta dias CONSECUTIVOS com pelo menos 1 sessão de estudo.
    """
    try:
        if not matricula or not matricula.strip():
            raise HTTPException(status_code=422, detail="Matricula invalida ou vazia")

        metricas = _buscar_metricas_aluno(matricula.strip())
        streak_atual, streak_maximo = _calcular_streak(metricas["datas_estudo"])

        # Calcular próxima data para manter
        ultima = metricas["ultima_sessao"]
        if ultima:
            proxima = ultima + timedelta(days=1)
            ultima_iso = ultima.isoformat()
            proxima_iso = proxima.isoformat()
        else:
            ultima_iso = None
            proxima_iso = None

        return {
            "dias_atuais": streak_atual,
            "dias_maximo": streak_maximo,
            "ultima_atividade": ultima_iso,
            "proxima_data_para_manter": proxima_iso,
            "emoji": "\U0001f525" if streak_atual > 0 else "\u2744\ufe0f",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro em streak para {matricula}: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar streak: {str(e)}")


@router.get("/api/aluno/conquistas/{matricula}")
def get_conquistas(matricula: str):
    """
    Retorna todas as conquistas do aluno: streak, medalhas e estatísticas.
    Todos os dados são calculados a partir de sessoes_estudo.
    """
    try:
        if not matricula or not matricula.strip():
            raise HTTPException(status_code=422, detail="Matricula invalida ou vazia")

        metricas = _buscar_metricas_aluno(matricula.strip())
        streak_atual, streak_maximo = _calcular_streak(metricas["datas_estudo"])

        # Streak info
        ultima = metricas["ultima_sessao"]
        if ultima:
            proxima = ultima + timedelta(days=1)
            ultima_iso = ultima.isoformat()
            proxima_iso = proxima.isoformat()
        else:
            ultima_iso = None
            proxima_iso = None

        streak_data = {
            "dias_atuais": streak_atual,
            "dias_maximo": streak_maximo,
            "ultima_atividade": ultima_iso,
            "proxima_data_para_manter": proxima_iso,
        }

        # Medalhas
        medalhas = _avaliar_medalhas(
            metricas["total_questoes"],
            metricas["total_sessoes"],
            streak_atual,
            streak_maximo,
        )

        # Tempo em minutos
        tempo_minutos = metricas["tempo_total_seg"] // 60

        return {
            "streak": streak_data,
            "medalhas": medalhas,
            "total_questoes_respondidas": metricas["total_questoes"],
            "total_sessoes": metricas["total_sessoes"],
            "tempo_estudo_total_minutos": tempo_minutos,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro em conquistas para {matricula}: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar conquistas: {str(e)}")


@router.get("/api/aluno/leaderboard")
def get_leaderboard(
    tipo: str = Query("streak", description="streak ou questoes"),
    limite: int = Query(10, ge=1, le=100, description="Limite de resultados"),
):
    """
    Retorna ranking dos alunos por streak ou questões.
    Dados calculados diretamente do banco.
    """
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
                    JOIN sessoes_estudo s ON COALESCE(s.matricula_aluno, s.nome_aluno) = u.matricula
                    WHERE u.papel = 'aluno'
                      AND s.eh_teste_professor IS NOT TRUE
                    GROUP BY u.nome, u.matricula
                    ORDER BY total_q DESC
                    LIMIT %s;
                """, (limite,))

                rows = cursor.fetchall()
                return [
                    {
                        "posicao": idx,
                        "nome": r[0],
                        "matricula": r[1],
                        "valor": int(r[2]),
                        "emoji": "\u2753",
                    }
                    for idx, r in enumerate(rows, 1)
                ]

            elif tipo == "streak":
                # Para streak, precisamos buscar datas de cada aluno
                cursor.execute("""
                    SELECT
                        u.nome,
                        u.matricula,
                        ARRAY_AGG(DISTINCT DATE(s.criado_em) ORDER BY DATE(s.criado_em) DESC) AS datas
                    FROM usuarios u
                    JOIN sessoes_estudo s ON COALESCE(s.matricula_aluno, s.nome_aluno) = u.matricula
                    WHERE u.papel = 'aluno'
                      AND s.eh_teste_professor IS NOT TRUE
                    GROUP BY u.nome, u.matricula;
                """)

                rows = cursor.fetchall()
                alunos_streaks = []

                for r in rows:
                    nome, mat, datas = r[0], r[1], r[2]
                    if datas:
                        streak_at, streak_max = _calcular_streak(datas)
                    else:
                        streak_at, streak_max = 0, 0

                    alunos_streaks.append({
                        "nome": nome,
                        "matricula": mat,
                        "streak_atual": streak_at,
                        "streak_maximo": streak_max,
                    })

                # Ordenar por streak atual (DESC), depois máximo
                alunos_streaks.sort(
                    key=lambda x: (x["streak_atual"], x["streak_maximo"]),
                    reverse=True,
                )

                return [
                    {
                        "posicao": idx,
                        "nome": a["nome"],
                        "matricula": a["matricula"],
                        "valor": a["streak_atual"],
                        "emoji": "\U0001f525",
                    }
                    for idx, a in enumerate(alunos_streaks[:limite], 1)
                ]

            else:
                raise HTTPException(status_code=400, detail=f"Tipo invalido: {tipo}. Use 'streak' ou 'questoes'.")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro em leaderboard: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar leaderboard: {str(e)}")
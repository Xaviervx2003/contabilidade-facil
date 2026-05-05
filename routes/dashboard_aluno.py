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
from database import get_conexao
from datetime import date, timedelta
import logging

router = APIRouter(prefix="/api/aluno", tags=["Dashboard Aluno"])
logger = logging.getLogger(__name__)


@router.get("/dashboard/{matricula}")
def dashboard_aluno(matricula: str):
    """
    Retorna todos os dados necessários para a home do aluno em uma única chamada.
    """
    try:
        if not matricula or not matricula.strip():
            raise HTTPException(status_code=422, detail="Matrícula inválida")

        matricula = matricula.strip()

        with get_conexao() as conn:
            cursor = conn.cursor()

            # ── 1. Nome do aluno ──
            cursor.execute(
                "SELECT nome FROM usuarios WHERE matricula = %s", (matricula,)
            )
            row = cursor.fetchone()
            nome = row[0] if row else matricula

            # ── 2. Resumo de HOJE ──
            cursor.execute("""
                SELECT
                    COUNT(id) AS sessoes_hoje,
                    COALESCE(SUM(questoes_respondidas), 0) AS questoes_hoje,
                    COALESCE(SUM(tempo_gasto_segundos), 0) AS tempo_hoje_seg,
                    ROUND(AVG(taxa_acerto)::numeric, 1) AS media_hoje
                FROM sessoes_estudo
                WHERE nome_aluno = %s
                  AND DATE(criado_em) = CURRENT_DATE
                  AND eh_teste_professor IS NOT TRUE;
            """, (matricula,))
            hoje = cursor.fetchone()

            # ── 3. Resumo da SEMANA (últimos 7 dias) ──
            cursor.execute("""
                SELECT
                    COUNT(id) AS sessoes_semana,
                    COALESCE(SUM(questoes_respondidas), 0) AS questoes_semana,
                    COALESCE(SUM(tempo_gasto_segundos), 0) AS tempo_semana_seg,
                    ROUND(AVG(taxa_acerto)::numeric, 1) AS media_semana,
                    COUNT(DISTINCT DATE(criado_em)) AS dias_estudados
                FROM sessoes_estudo
                WHERE nome_aluno = %s
                  AND criado_em >= CURRENT_DATE - INTERVAL '6 days'
                  AND eh_teste_professor IS NOT TRUE;
            """, (matricula,))
            semana = cursor.fetchone()

            # ── 4. Resumo GERAL (all-time) ──
            cursor.execute("""
                SELECT
                    COUNT(id) AS total_sessoes,
                    COALESCE(SUM(questoes_respondidas), 0) AS total_questoes,
                    COALESCE(SUM(tempo_gasto_segundos), 0) AS tempo_total_seg,
                    ROUND(AVG(taxa_acerto)::numeric, 1) AS media_geral,
                    MAX(criado_em) AS ultima_sessao
                FROM sessoes_estudo
                WHERE nome_aluno = %s
                  AND eh_teste_professor IS NOT TRUE;
            """, (matricula,))
            geral = cursor.fetchone()

            # ── 5. Streak (dias consecutivos) ──
            cursor.execute("""
                SELECT DISTINCT DATE(criado_em) AS dia
                FROM sessoes_estudo
                WHERE nome_aluno = %s
                  AND eh_teste_professor IS NOT TRUE
                ORDER BY dia DESC;
            """, (matricula,))
            datas = [r[0] for r in cursor.fetchall()]

            streak_atual = 0
            if datas:
                hoje_dt = date.today()
                diff = (hoje_dt - datas[0]).days
                if diff <= 1:
                    streak_atual = 1
                    for i in range(1, len(datas)):
                        if (datas[i - 1] - datas[i]).days == 1:
                            streak_atual += 1
                        else:
                            break

            # ── 6. Progresso no banco ──
            cursor.execute("""
                SELECT
                    COUNT(DISTINCT sq.questao_id) AS respondidas,
                    (SELECT COUNT(*) FROM questoes) AS total_banco
                FROM sessoes_estudo s
                JOIN sessoes_questoes sq ON sq.sessao_id = s.id
                WHERE s.nome_aluno = %s;
            """, (matricula,))
            progresso_row = cursor.fetchone()
            respondidas = int(progresso_row[0] or 0)
            total_banco = int(progresso_row[1] or 1)

            # ── 7. Matérias mais fracas (top 5 com menor acerto, mínimo 3 questões) ──
            cursor.execute("""
                SELECT
                    COALESCE(NULLIF(TRIM(s.assunto_estudado), ''), 'Sem assunto') AS materia,
                    SUM(s.questoes_respondidas) AS total_q,
                    ROUND(
                        (SUM(s.questoes_respondidas * s.taxa_acerto / 100.0)
                         / NULLIF(SUM(s.questoes_respondidas), 0) * 100)::numeric
                    , 1) AS media_acerto
                FROM sessoes_estudo s
                WHERE s.nome_aluno = %s
                  AND s.eh_teste_professor IS NOT TRUE
                GROUP BY 1
                HAVING SUM(s.questoes_respondidas) >= 3
                ORDER BY media_acerto ASC
                LIMIT 5;
            """, (matricula,))
            materias_fracas = [
                {"materia": r[0], "questoes": int(r[1]), "media_acerto": float(r[2] or 0)}
                for r in cursor.fetchall()
            ]

            # ── 8. Matérias mais fortes (top 5 com maior acerto) ──
            cursor.execute("""
                SELECT
                    COALESCE(NULLIF(TRIM(s.assunto_estudado), ''), 'Sem assunto') AS materia,
                    SUM(s.questoes_respondidas) AS total_q,
                    ROUND(
                        (SUM(s.questoes_respondidas * s.taxa_acerto / 100.0)
                         / NULLIF(SUM(s.questoes_respondidas), 0) * 100)::numeric
                    , 1) AS media_acerto
                FROM sessoes_estudo s
                WHERE s.nome_aluno = %s
                  AND s.eh_teste_professor IS NOT TRUE
                GROUP BY 1
                HAVING SUM(s.questoes_respondidas) >= 3
                ORDER BY media_acerto DESC
                LIMIT 5;
            """, (matricula,))
            materias_fortes = [
                {"materia": r[0], "questoes": int(r[1]), "media_acerto": float(r[2] or 0)}
                for r in cursor.fetchall()
            ]

            # ── 9. Últimas 5 sessões ──
            cursor.execute("""
                SELECT
                    COALESCE(assunto_estudado, 'Geral') AS materia,
                    questoes_respondidas,
                    taxa_acerto,
                    tempo_gasto_segundos,
                    criado_em
                FROM sessoes_estudo
                WHERE nome_aluno = %s
                  AND eh_teste_professor IS NOT TRUE
                ORDER BY criado_em DESC
                LIMIT 5;
            """, (matricula,))
            ultimas = [
                {
                    "materia": r[0],
                    "questoes": int(r[1]),
                    "acerto": float(r[2]),
                    "tempo_seg": int(r[3]),
                    "data": r[4].isoformat() if r[4] else None,
                }
                for r in cursor.fetchall()
            ]

            # ── 10. Série diária (últimos 7 dias para mini-gráfico) ──
            cursor.execute("""
                WITH dias AS (
                    SELECT generate_series(
                        CURRENT_DATE - INTERVAL '6 days',
                        CURRENT_DATE,
                        '1 day'
                    )::date AS dia
                ),
                por_dia AS (
                    SELECT
                        DATE(criado_em) AS dia,
                        COALESCE(SUM(questoes_respondidas), 0) AS questoes
                    FROM sessoes_estudo
                    WHERE nome_aluno = %s
                      AND criado_em >= CURRENT_DATE - INTERVAL '6 days'
                      AND eh_teste_professor IS NOT TRUE
                    GROUP BY DATE(criado_em)
                )
                SELECT d.dia, COALESCE(p.questoes, 0) AS questoes
                FROM dias d
                LEFT JOIN por_dia p ON p.dia = d.dia
                ORDER BY d.dia;
            """, (matricula,))
            serie_semanal = [
                {"dia": r[0].isoformat(), "questoes": int(r[1])}
                for r in cursor.fetchall()
            ]

        # ── Montar resposta ──
        return {
            "nome": nome,
            "hoje": {
                "sessoes": int(hoje[0] or 0),
                "questoes": int(hoje[1] or 0),
                "tempo_seg": int(hoje[2] or 0),
                "media_acerto": float(hoje[3] or 0),
            },
            "semana": {
                "sessoes": int(semana[0] or 0),
                "questoes": int(semana[1] or 0),
                "tempo_seg": int(semana[2] or 0),
                "media_acerto": float(semana[3] or 0),
                "dias_estudados": int(semana[4] or 0),
            },
            "geral": {
                "total_sessoes": int(geral[0] or 0),
                "total_questoes": int(geral[1] or 0),
                "tempo_total_seg": int(geral[2] or 0),
                "media_geral": float(geral[3] or 0),
                "ultima_sessao": geral[4].isoformat() if geral[4] else None,
            },
            "streak": streak_atual,
            "progresso": {
                "respondidas": respondidas,
                "total_banco": total_banco,
                "percentual": round((respondidas / total_banco) * 100, 1) if total_banco > 0 else 0,
            },
            "materias_fracas": materias_fracas,
            "materias_fortes": materias_fortes,
            "ultimas_sessoes": ultimas,
            "serie_semanal": serie_semanal,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no dashboard do aluno {matricula}: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao carregar dashboard: {str(e)}")

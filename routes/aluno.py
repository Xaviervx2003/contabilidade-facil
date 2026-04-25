"""
routes/aluno.py — Funcionalidades da visão do Aluno.

Rotas:
  GET /api/aluno/historico-grafico/{matricula}  — dados agregados por mês para gráficos
"""

from fastapi import APIRouter, HTTPException
from database import get_conexao

router = APIRouter(prefix="/api/aluno", tags=["Aluno"])


@router.get("/historico-grafico/{matricula}")
def historico_grafico(matricula: str):
    """
    Retorna dados agregados por mês para exibição em gráficos no painel do aluno.
    Inclui:
      - media_acerto por mês
      - total de questões respondidas por mês
      - tempo médio de sessão por mês
      - total de sessões por mês
    Usa CTEs para evitar agregações aninhadas (regra H do PROMPT MESTRE).
    """
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()

            # --- Gráfico 1 e 2: evolução mensal (últimos 6 meses) ---
            cursor.execute("""
                WITH dados_mes AS (
                    SELECT
                        DATE_TRUNC('month', criado_em)              AS mes_dt,
                        TO_CHAR(criado_em, 'Mon/YY')                AS mes_label,
                        COUNT(id)                                   AS total_sessoes,
                        SUM(questoes_respondidas)                   AS total_questoes,
                        ROUND(AVG(taxa_acerto)::numeric, 1)         AS media_acerto,
                        ROUND(AVG(tempo_gasto_segundos)::numeric, 0) AS tempo_medio_seg
                    FROM sessoes_estudo
                    WHERE nome_aluno = %s
                      AND criado_em >= NOW() - INTERVAL '6 months'
                    GROUP BY DATE_TRUNC('month', criado_em), TO_CHAR(criado_em, 'Mon/YY')
                )
                SELECT
                    mes_label,
                    total_sessoes,
                    total_questoes,
                    media_acerto,
                    tempo_medio_seg
                FROM dados_mes
                ORDER BY mes_dt;
            """, (matricula,))

            linhas_mes = cursor.fetchall()

            # --- Gráfico 3: desempenho por assunto (todos os tempos) ---
            cursor.execute("""
                WITH por_assunto AS (
                    SELECT
                        COALESCE(NULLIF(TRIM(assunto_estudado), ''), 'Sem assunto') AS assunto,
                        SUM(questoes_respondidas)                                   AS total_q,
                        ROUND(
                            (SUM(questoes_respondidas * taxa_acerto / 100.0)
                             / NULLIF(SUM(questoes_respondidas), 0) * 100)::numeric
                        , 1)                                                        AS media_pond
                    FROM sessoes_estudo
                    WHERE nome_aluno = %s
                    GROUP BY COALESCE(NULLIF(TRIM(assunto_estudado), ''), 'Sem assunto')
                )
                SELECT assunto, total_q, media_pond
                FROM por_assunto
                ORDER BY media_pond ASC;
            """, (matricula,))

            linhas_assunto = cursor.fetchall()

            # --- Resumo geral ---
            cursor.execute("""
                SELECT
                    COUNT(id)                                               AS total_sessoes,
                    COALESCE(SUM(questoes_respondidas), 0)                  AS total_questoes,
                    ROUND(AVG(taxa_acerto)::numeric, 1)                     AS media_geral,
                    ROUND(AVG(tempo_gasto_segundos)::numeric, 0)            AS tempo_medio_seg,
                    MAX(criado_em)                                          AS ultima_sessao
                FROM sessoes_estudo
                WHERE nome_aluno = %s;
            """, (matricula,))

            resumo = cursor.fetchone()

        return {
            "resumo": {
                "total_sessoes":   int(resumo[0] or 0),
                "total_questoes":  int(resumo[1] or 0),
                "media_geral":     float(resumo[2] or 0),
                "tempo_medio_seg": int(resumo[3] or 0),
                "ultima_sessao":   resumo[4].isoformat() if resumo[4] else None,
            },
            "por_mes": [
                {
                    "mes":            r[0],
                    "sessoes":        int(r[1]),
                    "questoes":       int(r[2]),
                    "media_acerto":   float(r[3] or 0),
                    "tempo_medio_seg": int(r[4] or 0),
                }
                for r in linhas_mes
            ],
            "por_assunto": [
                {
                    "assunto":      r[0],
                    "questoes":     int(r[1]),
                    "media_acerto": float(r[2] or 0),
                }
                for r in linhas_assunto
            ],
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao buscar histórico gráfico: {str(e)}"
        )
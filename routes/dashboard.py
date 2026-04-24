"""
routes/dashboard.py – Métricas do dashboard e desempenho dos alunos.

Correções aplicadas:
  3. Usa context manager do pool em vez de abrir conexão avulsa.
  5. Filtro do professor usa questao_id real (via sessoes_questoes) em vez de JOIN por string de assunto.
  6. Média ponderada pelo número de questões respondidas por sessão.
  7. Paginação server-side nos endpoints de alunos.
  + Rota nova: /api/dashboard/sessoes-por-mes para alimentar o MainChart.

ATENÇÃO: a rota /api/relatorios/estudo foi movida para routes/relatorios.py.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from database import get_conexao

router = APIRouter(prefix="/api", tags=["Dashboard"])


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def _get_papel_usuario(cursor, usuario_id: int) -> Optional[str]:
    cursor.execute("SELECT papel FROM usuarios WHERE id = %s", (usuario_id,))
    row = cursor.fetchone()
    return row[0] if row else None


# ──────────────────────────────────────────────
# GET /api/dashboard
# ──────────────────────────────────────────────

@router.get("/dashboard")
def resumo_dashboard(usuario_id: Optional[int] = Query(None)):
    """
    Retorna métricas globais.
    - Admin / sem ID : todas as sessões.
    - Professor      : apenas sessões que contêm ao menos uma questão criada por ele,
                       excluindo sessões de teste.
    """
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            papel = _get_papel_usuario(cursor, usuario_id) if usuario_id else None

            if papel == "professor":
                cursor.execute("""
                    SELECT
                        COUNT(DISTINCT s.id)                 AS total_sessoes,
                        SUM(s.questoes_respondidas)          AS total_questoes,
                        AVG(s.tempo_gasto_segundos) / 60.0   AS tempo_medio_minutos
                    FROM sessoes_estudo s
                    WHERE s.eh_teste_professor IS NOT TRUE
                      AND EXISTS (
                          SELECT 1
                          FROM sessoes_questoes sq
                          JOIN questoes q ON q.id = sq.questao_id
                          WHERE sq.sessao_id = s.id
                            AND q.criado_por = %s
                      );
                """, (usuario_id,))
            else:
                cursor.execute("""
                    SELECT
                        COUNT(id)                        AS total_sessoes,
                        SUM(questoes_respondidas)        AS total_questoes,
                        AVG(tempo_gasto_segundos) / 60.0 AS tempo_medio_minutos
                    FROM sessoes_estudo;
                """)

            dados = cursor.fetchone()

            cursor.execute("SELECT COUNT(*) FROM questoes;")
            total_questoes_banco = cursor.fetchone()[0] or 0

        return {
            "usuarios_ativos":           int(dados[0] or 0),
            "total_questoes_resolvidas": int(dados[1] or 0),
            "tempo_medio_minutos":       float(round(dados[2] or 0, 1)),
            "total_questoes_banco":      int(total_questoes_banco),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no dashboard: {str(e)}")


# ──────────────────────────────────────────────
# GET /api/dashboard/sessoes-por-mes
# ──────────────────────────────────────────────

@router.get("/dashboard/sessoes-por-mes")
def sessoes_por_mes(usuario_id: Optional[int] = Query(None)):
    """
    Retorna o total de sessões e média de acerto agrupados por mês (últimos 7 meses).
    Usado pelo MainChart.jsx.
    """
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            papel = _get_papel_usuario(cursor, usuario_id) if usuario_id else None

            filtro_professor = ""
            params: list = []

            if papel == "professor":
                filtro_professor = """
                    AND s.eh_teste_professor IS NOT TRUE
                    AND EXISTS (
                        SELECT 1
                        FROM sessoes_questoes sq
                        JOIN questoes q ON q.id = sq.questao_id
                        WHERE sq.sessao_id = s.id
                          AND q.criado_por = %s
                    )
                """
                params.append(usuario_id)

            cursor.execute(f"""
                SELECT
                    TO_CHAR(DATE_TRUNC('month', s.criado_em), 'Mon/YY') AS mes,
                    COUNT(s.id)                                          AS total_sessoes,
                    ROUND(AVG(s.taxa_acerto)::numeric, 1)                AS media_acerto
                FROM sessoes_estudo s
                WHERE s.criado_em >= NOW() - INTERVAL '7 months'
                  {filtro_professor}
                GROUP BY DATE_TRUNC('month', s.criado_em)
                ORDER BY DATE_TRUNC('month', s.criado_em);
            """, params)

            rows = cursor.fetchall()

        return [
            {
                "mes":          r[0],
                "sessoes":      int(r[1]),
                "media_acerto": float(r[2] or 0),
            }
            for r in rows
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro sessoes-por-mes: {str(e)}")


# ──────────────────────────────────────────────
# GET /api/alunos/desempenho
# ──────────────────────────────────────────────

@router.get("/alunos/desempenho")
def obter_desempenho_alunos(
    usuario_id: Optional[int] = Query(None),
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(10, ge=1, le=100),
):
    """
    Retorna desempenho paginado dos alunos.

    FIX #5: filtro do professor via sessoes_questoes (ID real).
    FIX #6: média ponderada pelo total de questões respondidas (não média de médias).
    FIX #7: paginação server-side com `pagina` e `por_pagina`.
    """
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            papel = _get_papel_usuario(cursor, usuario_id) if usuario_id else None

            if papel == "professor":
                where_sessao = """
                    AND (
                        s.id IS NULL
                        OR (
                            s.eh_teste_professor IS NOT TRUE
                            AND EXISTS (
                                SELECT 1
                                FROM sessoes_questoes sq
                                JOIN questoes q ON q.id = sq.questao_id
                                WHERE sq.sessao_id = s.id
                                  AND q.criado_por = %(uid)s
                            )
                        )
                    )
                """
            else:
                where_sessao = ""

            query = f"""
                SELECT
                    u.nome,
                    u.matricula,
                    COUNT(s.id)                                          AS sessoes,
                    COALESCE(SUM(s.questoes_respondidas), 0)             AS total_questoes,
                    CASE
                        WHEN SUM(s.questoes_respondidas) > 0
                        THEN ROUND(
                            (SUM(s.questoes_respondidas * s.taxa_acerto / 100.0)
                             / SUM(s.questoes_respondidas) * 100)::numeric
                        , 1)
                        ELSE 0
                    END                                                  AS media_ponderada,
                    COALESCE(AVG(s.tempo_gasto_segundos), 0)             AS tempo_medio_segundos,
                    JSON_OBJECT_AGG(
                        s.assunto_estudado,
                        JSON_BUILD_OBJECT(
                            'total',  COALESCE(SUM(s.questoes_respondidas), 0),
                            'erros',  COALESCE(SUM(
                                ROUND(s.questoes_respondidas * (1 - s.taxa_acerto / 100.0))
                            ), 0)
                        )
                    ) FILTER (WHERE s.id IS NOT NULL)                    AS erros_por_materia
                FROM usuarios u
                LEFT JOIN sessoes_estudo s ON u.matricula = s.nome_aluno
                WHERE u.papel = 'aluno'
                  {where_sessao}
                GROUP BY u.nome, u.matricula
                ORDER BY media_ponderada DESC, u.nome
                LIMIT %(limit)s OFFSET %(offset)s;
            """

            offset = (pagina - 1) * por_pagina
            params = {"uid": usuario_id, "limit": por_pagina, "offset": offset}
            cursor.execute(query, params)
            linhas = cursor.fetchall()

            cursor.execute("SELECT COUNT(*) FROM usuarios WHERE papel = 'aluno';")
            total_alunos = cursor.fetchone()[0]

        resultado = []
        for row in linhas:
            nome, matricula, sessoes, total_q, media, tempo_medio, erros_mat = row
            resultado.append({
                "nome":                 nome,
                "matricula":            matricula,
                "sessoes":              int(sessoes),
                "questoes":             int(total_q),
                "media_numero":         float(media or 0),
                "tempo_medio_segundos": float(tempo_medio or 0),
                "erros_por_materia":    erros_mat or {},
            })

        return {
            "alunos":        resultado,
            "total":         total_alunos,
            "pagina":        pagina,
            "por_pagina":    por_pagina,
            "total_paginas": -(-total_alunos // por_pagina),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar desempenho: {str(e)}")
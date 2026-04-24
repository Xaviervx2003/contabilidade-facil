"""
routes/dashboard.py – Métricas do dashboard e desempenho dos alunos.
 
Correções aplicadas:
  3. Usa context manager do pool em vez de abrir conexão avulsa.
  5. Filtro do professor usa questoes_id real (via sessoes_questoes) em vez de JOIN por string de assunto.
  6. Média ponderada pelo número de questões respondidas por sessão.
  7. Paginação server-side nos endpoints de alunos.
  + Rota nova: /api/dashboard/sessoes-por-mes para alimentar o MainChart.
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
                # FIX #5: vincula por questao_id real, não por string de assunto
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
            "usuarios_ativos":          int(dados[0] or 0),
            "total_questoes_resolvidas": int(dados[1] or 0),
            "tempo_medio_minutos":       float(round(dados[2] or 0, 1)),
            "total_questoes_banco":      int(total_questoes_banco),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no dashboard: {str(e)}")
 
 
# ──────────────────────────────────────────────
# GET /api/dashboard/sessoes-por-mes   (FIX #4 – alimenta o MainChart)
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
# GET /api/alunos/desempenho  (FIX #5, #6, #7)
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
                # FIX #5: filtra sessões pela autoria real da questão do professor
                filtro_sessoes = """
                    AND s.eh_teste_professor IS NOT TRUE
                    AND EXISTS (
                        SELECT 1
                        FROM sessoes_questoes sq
                        JOIN questoes q ON q.id = sq.questao_id
                        WHERE sq.sessao_id = s.id
                          AND q.criado_por = %(uid)s
                    )
                """
            else:
                filtro_sessoes = ""
 
            # FIX #6 + PERF: remove N+1 com agregação em CTE (uma ida ao banco)
            # media_ponderada = SUM(acertos totais) / SUM(questoes respondidas)
            query = f"""
                WITH sessoes_filtradas AS (
                    SELECT
                        u.nome,
                        u.matricula,
                        s.id AS sessao_id,
                        s.questoes_respondidas,
                        s.taxa_acerto,
                        s.tempo_gasto_segundos,
                        COALESCE(NULLIF(TRIM(s.assunto_estudado), ''), 'Sem assunto') AS assunto_estudado
                    FROM usuarios u
                    LEFT JOIN sessoes_estudo s
                           ON u.matricula = s.nome_aluno
                          {filtro_sessoes}
                    WHERE u.papel = 'aluno'
                ),
                resumo AS (
                    SELECT
                        nome,
                        matricula,
                        COUNT(sessao_id)                                  AS sessoes,
                        COALESCE(SUM(questoes_respondidas), 0)            AS total_questoes,
                        CASE
                            WHEN SUM(questoes_respondidas) > 0
                            THEN ROUND(
                                (SUM(questoes_respondidas * taxa_acerto / 100.0)
                                 / SUM(questoes_respondidas) * 100)::numeric
                            , 1)
                            ELSE 0
                        END                                              AS media_ponderada,
                        COALESCE(AVG(tempo_gasto_segundos), 0)            AS tempo_medio_segundos
                    FROM sessoes_filtradas
                    GROUP BY nome, matricula
                ),
                erros_por_materia AS (
                    SELECT
                        matricula,
                        jsonb_object_agg(
                            assunto_estudado,
                            jsonb_build_object(
                                'total', total_questoes,
                                'erros', total_erros
                            )
                        ) AS erros_mat
                    FROM (
                        SELECT
                            matricula,
                            assunto_estudado,
                            COALESCE(SUM(questoes_respondidas), 0) AS total_questoes,
                            COALESCE(SUM(
                                ROUND(questoes_respondidas * (1 - taxa_acerto / 100.0))
                            ), 0) AS total_erros
                        FROM sessoes_filtradas
                        WHERE sessao_id IS NOT NULL
                        GROUP BY matricula, assunto_estudado
                    ) t
                    GROUP BY matricula
                )
                SELECT
                    r.nome,
                    r.matricula,
                    r.sessoes,
                    r.total_questoes,
                    r.media_ponderada,
                    r.tempo_medio_segundos,
                    COALESCE(e.erros_mat, '{{}}'::jsonb) AS erros_por_materia
                FROM resumo r
                LEFT JOIN erros_por_materia e ON e.matricula = r.matricula
                ORDER BY r.media_ponderada DESC, r.nome
                LIMIT %(limit)s OFFSET %(offset)s;
            """
 
            offset = (pagina - 1) * por_pagina
            params = {"uid": usuario_id, "limit": por_pagina, "offset": offset}
            cursor.execute(query, params)
            linhas = cursor.fetchall()
 
            # Total de alunos para o frontend calcular nº de páginas
            cursor.execute(
                "SELECT COUNT(*) FROM usuarios WHERE papel = 'aluno';"
            )
            total_alunos = cursor.fetchone()[0]
        resultado = []
        for row in linhas:
            nome, matricula, sessoes, total_q, media, tempo_medio, erros_mat = row
            resultado.append({
                "nome":                nome,
                "matricula":           matricula,
                "sessoes":             int(sessoes),
                "questoes":            int(total_q),
                "media_numero":        float(media or 0),
                "tempo_medio_segundos": float(tempo_medio or 0),
                "erros_por_materia":   erros_mat or {},
            })
 
        return {
            "alunos":      resultado,
            "total":       total_alunos,
            "pagina":      pagina,
            "por_pagina":  por_pagina,
            "total_paginas": -(-total_alunos // por_pagina),  # ceil division
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar desempenho: {str(e)}")


@router.get("/relatorios/estudo")
def relatorio_estudo(usuario_id: Optional[int] = Query(None)):
    """
    Relatório resumido do mês atual:
    - série diária de estudo;
    - melhor dia (mais questões);
    - métricas gerais do mês.
    """
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            papel = _get_papel_usuario(cursor, usuario_id) if usuario_id else None

            filtro_professor = ""
            params: dict = {}

            if papel == "professor":
                filtro_professor = """
                    AND s.eh_teste_professor IS NOT TRUE
                    AND EXISTS (
                        SELECT 1
                        FROM sessoes_questoes sq
                        JOIN questoes q ON q.id = sq.questao_id
                        WHERE sq.sessao_id = s.id
                          AND q.criado_por = %(uid)s
                    )
                """
                params["uid"] = usuario_id

            # série diária do mês atual
            cursor.execute(f"""
                SELECT
                    DATE(s.criado_em)                           AS dia,
                    COUNT(*)                                    AS sessoes,
                    COALESCE(SUM(s.questoes_respondidas), 0)    AS questoes,
                    COALESCE(ROUND(AVG(s.taxa_acerto)::numeric, 1), 0) AS media_acerto,
                    COALESCE(SUM(s.tempo_gasto_segundos), 0)    AS tempo_total_segundos
                FROM sessoes_estudo s
                WHERE DATE_TRUNC('month', s.criado_em) = DATE_TRUNC('month', NOW())
                  {filtro_professor}
                GROUP BY DATE(s.criado_em)
                ORDER BY DATE(s.criado_em);
            """, params)
            dias = cursor.fetchall()

            serie_diaria = [
                {
                    "dia": d[0].isoformat(),
                    "sessoes": int(d[1]),
                    "questoes": int(d[2]),
                    "media_acerto": float(d[3] or 0),
                    "tempo_total_segundos": int(d[4] or 0),
                }
                for d in dias
            ]

            melhor_dia = max(serie_diaria, key=lambda x: x["questoes"], default=None)

            # resumo geral do mês
            cursor.execute(f"""
                SELECT
                    COALESCE(COUNT(*), 0)                            AS total_sessoes,
                    COALESCE(SUM(s.questoes_respondidas), 0)         AS total_questoes,
                    COALESCE(ROUND(AVG(s.taxa_acerto)::numeric, 1), 0) AS media_acerto,
                    COALESCE(SUM(s.tempo_gasto_segundos), 0)         AS tempo_total_segundos
                FROM sessoes_estudo s
                WHERE DATE_TRUNC('month', s.criado_em) = DATE_TRUNC('month', NOW())
                  {filtro_professor};
            """, params)
            resumo = cursor.fetchone()

        return {
            "resumo_mes": {
                "total_sessoes": int(resumo[0] or 0),
                "total_questoes": int(resumo[1] or 0),
                "media_acerto": float(resumo[2] or 0),
                "tempo_total_segundos": int(resumo[3] or 0),
            },
            "melhor_dia": melhor_dia,
            "serie_diaria": serie_diaria,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar relatório: {str(e)}")
 

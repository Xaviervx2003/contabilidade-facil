"""
routes/dashboard.py – Métricas do dashboard e desempenho dos alunos.

ATENÇÃO: a rota /api/relatorios/estudo foi movida para routes/relatorios.py.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from database import get_conexao

router = APIRouter(prefix="/api", tags=["Dashboard"])


def _get_papel_usuario(cursor, usuario_id: int) -> Optional[str]:
    cursor.execute("SELECT papel FROM usuarios WHERE id = %s", (usuario_id,))
    row = cursor.fetchone()
    return row[0] if row else None


@router.get("/dashboard")
def resumo_dashboard(usuario_id: Optional[int] = Query(None)):
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


@router.get("/dashboard/sessoes-por-mes")
def sessoes_por_mes(usuario_id: Optional[int] = Query(None)):
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
            {"mes": r[0], "sessoes": int(r[1]), "media_acerto": float(r[2] or 0)}
            for r in rows
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro sessoes-por-mes: {str(e)}")


@router.get("/alunos/desempenho")
def obter_desempenho_alunos(
    usuario_id: Optional[int] = Query(None),
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(10, ge=1, le=100),
):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            papel = _get_papel_usuario(cursor, usuario_id) if usuario_id else None

            if papel == "professor":
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

            query = f"""
                WITH sessoes_filtradas AS (
                    SELECT
                        u.nome,
                        u.matricula,
                        s.id                                                          AS sessao_id,
                        s.questoes_respondidas,
                        s.taxa_acerto,
                        s.tempo_gasto_segundos,
                        COALESCE(NULLIF(TRIM(s.assunto_estudado), ''), 'Sem assunto') AS assunto_estudado
                    FROM usuarios u
                    LEFT JOIN sessoes_estudo s ON u.matricula = s.nome_aluno
                        {filtro_sessoes}
                    WHERE u.papel = 'aluno'
                ),
                resumo AS (
                    SELECT
                        nome,
                        matricula,
                        COUNT(sessao_id)                       AS sessoes,
                        COALESCE(SUM(questoes_respondidas), 0) AS total_questoes,
                        CASE
                            WHEN SUM(questoes_respondidas) > 0
                            THEN ROUND(
                                (SUM(questoes_respondidas * taxa_acerto / 100.0)
                                 / SUM(questoes_respondidas) * 100)::numeric
                            , 1)
                            ELSE 0
                        END                                    AS media_ponderada,
                        COALESCE(AVG(tempo_gasto_segundos), 0) AS tempo_medio_segundos
                    FROM sessoes_filtradas
                    GROUP BY nome, matricula
                ),
                erros_base AS (
                    SELECT
                        matricula,
                        assunto_estudado,
                        COALESCE(SUM(questoes_respondidas), 0)                    AS total_questoes,
                        COALESCE(SUM(
                            ROUND(questoes_respondidas * (1 - taxa_acerto / 100.0))
                        ), 0)                                                      AS total_erros
                    FROM sessoes_filtradas
                    WHERE sessao_id IS NOT NULL
                    GROUP BY matricula, assunto_estudado
                ),
                erros_por_materia AS (
                    SELECT
                        matricula,
                        jsonb_object_agg(
                            assunto_estudado,
                            jsonb_build_object('total', total_questoes, 'erros', total_erros)
                        ) AS erros_mat
                    FROM erros_base
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
"""
routes/aluno.py — Funcionalidades da visão do Aluno.

Rotas:
  GET /api/aluno/historico-grafico/{matricula}  — dados agregados por mês para gráficos
  GET /api/aluno/questoes-respondidas           — histórico detalhado de tentativas
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
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


@router.get("/questoes-respondidas")
def questoes_respondidas(
    matricula: str = Query(..., description="Matrícula do aluno"),
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(20, ge=1, le=100),
    acerto: Optional[str] = Query(None, description="Filtrar por 'acerto' ou 'erro'"),
    materia_id: Optional[int] = Query(None, description="Filtrar por ID da matéria"),
):
    """
    Retorna todas as questões que o aluno já respondeu, com detalhes da sessão.
    """
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()

            base = """
                SELECT
                    sq.questao_id,
                    q.enunciado,
                    q.assunto,
                    sq.acertou,
                    s.assunto_estudado,
                    s.criado_em AS data_sessao,
                    ARRAY_TO_STRING(ARRAY_AGG(DISTINCT m.nome), ', ') AS materias
                FROM sessoes_questoes sq
                JOIN sessoes_estudo s ON s.id = sq.sessao_id
                JOIN questoes q ON q.id = sq.questao_id
                LEFT JOIN questoes_materias qm ON qm.questao_id = q.id
                LEFT JOIN materias m ON m.id = qm.materia_id
                WHERE s.nome_aluno = %(matricula)s
            """
            params = {"matricula": matricula}

            if acerto == "acerto":
                base += " AND sq.acertou = TRUE"
            elif acerto == "erro":
                base += " AND sq.acertou = FALSE"

            if materia_id is not None:
                base += " AND EXISTS (SELECT 1 FROM questoes_materias qm2 WHERE qm2.questao_id = q.id AND qm2.materia_id = %(materia_id)s)"
                params["materia_id"] = materia_id

            base += " GROUP BY sq.questao_id, q.enunciado, q.assunto, sq.acertou, s.assunto_estudado, s.criado_em"

            # Contagem total
            count_query = f"SELECT COUNT(*) FROM ({base}) sub"
            cursor.execute(count_query, params)
            total = cursor.fetchone()[0]

            # Paginação
            query = f"""
                SELECT * FROM ({base}) sub
                ORDER BY sub.data_sessao DESC
                LIMIT %(limit)s OFFSET %(offset)s
            """
            params["limit"] = por_pagina
            params["offset"] = (pagina - 1) * por_pagina
            cursor.execute(query, params)
            rows = cursor.fetchall()

            resultados = []
            for row in rows:
                resultados.append({
                    "questao_id": row[0],
                    "enunciado": row[1][:100] + "..." if len(row[1]) > 100 else row[1],
                    "assunto": row[2] or "Sem assunto",
                    "acertou": row[3],
                    "materia_sessao": row[4],
                    "data": row[5].isoformat() if row[5] else None,
                    "materias": row[6] or "Sem matéria",
                })

        return {
            "questoes": resultados,
            "total": total,
            "pagina": pagina,
            "por_pagina": por_pagina,
            "total_paginas": -(-total // por_pagina),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar questões respondidas: {str(e)}")
@router.get("/meus-feedbacks/{nome}")
def meus_feedbacks(
    nome: str,
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(10, ge=1, le=50),
):
    """
    Retorna todos os feedbacks enviados pelo aluno (filtrado pelo nome).
    """
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()

            cursor.execute(
                "SELECT COUNT(*) FROM feedbacks_questoes WHERE nome_aluno = %s",
                (nome,)
            )
            total = cursor.fetchone()[0]

            cursor.execute("""
                SELECT
                    f.id,
                    f.questao_id,
                    q.enunciado,
                    f.texto,
                    f.marcada_confusa,
                    f.resolvido,
                    f.resposta_professor,
                    f.data_criacao
                FROM feedbacks_questoes f
                JOIN questoes q ON q.id = f.questao_id
                WHERE f.nome_aluno = %s
                ORDER BY f.data_criacao DESC
                LIMIT %s OFFSET %s
            """, (nome, por_pagina, (pagina - 1) * por_pagina))

            rows = cursor.fetchall()

            resultados = []
            for r in rows:
                resultados.append({
                    "id": r[0],
                    "questao_id": r[1],
                    "enunciado": r[2][:120] + "..." if len(r[2]) > 120 else r[2],
                    "texto": r[3],
                    "marcada_confusa": r[4],
                    "resolvido": r[5],
                    "resposta_professor": r[6],
                    "data": r[7].isoformat() if r[7] else None,
                })

        return {
            "feedbacks": resultados,
            "total": total,
            "pagina": pagina,
            "por_pagina": por_pagina,
            "total_paginas": -(-total // por_pagina),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar feedbacks: {str(e)}")
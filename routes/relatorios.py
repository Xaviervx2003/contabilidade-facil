"""
routes/relatorios.py – Relatório de estudo mensal com filtros avançados.
Extraído do dashboard.py para manter responsabilidade única.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from database import get_conexao
from datetime import datetime

router = APIRouter(prefix="/api", tags=["Relatórios"])


def _get_papel_usuario(cursor, usuario_id: int) -> Optional[str]:
    cursor.execute("SELECT papel FROM usuarios WHERE id = %s", (usuario_id,))
    row = cursor.fetchone()
    return row[0] if row else None


@router.get("/relatorios/estudo")
def relatorio_estudo(
    usuario_id: Optional[int] = Query(None),
    mes: Optional[int] = Query(None),
    ano: Optional[int] = Query(None),
    materia_id: Optional[int] = Query(None),
    aluno_matricula: Optional[str] = Query(None),
):
    """
    Retorna resumo mensal, série diária e métricas de engajamento.
    - Se mes/ano omitidos, usa o mês corrente.
    - Se materia_id informado, filtra por questões daquela matéria.
    - Professor só vê dados das próprias questões.
    """
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            papel = _get_papel_usuario(cursor, usuario_id) if usuario_id else None

            # Determinar período
            hoje = datetime.now()
            if mes is None or ano is None:
                mes = hoje.month
                ano = hoje.year

            # Construir filtros dinâmicos
            filtros = ""
            params: dict = {}

            if papel == "professor":
                filtros += """
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

            if materia_id is not None:
                filtros += """
                    AND EXISTS (
                        SELECT 1
                        FROM sessoes_questoes sq
                        JOIN questoes_materias qm ON qm.questao_id = sq.questao_id
                        WHERE sq.sessao_id = s.id
                          AND qm.materia_id = %(materia_id)s
                    )
                """
                params["materia_id"] = materia_id

            if aluno_matricula:
                filtros += " AND COALESCE(s.matricula_aluno, s.nome_aluno) = %(aluno_matricula)s "
                params["aluno_matricula"] = aluno_matricula

            # Série diária
            cursor.execute(f"""
                SELECT
                    DATE(s.criado_em)                                      AS dia,
                    COUNT(*)                                               AS sessoes,
                    COALESCE(SUM(s.questoes_respondidas), 0)               AS questoes,
                    COALESCE(ROUND(AVG(s.taxa_acerto)::numeric, 1), 0)     AS media_acerto,
                    COALESCE(SUM(s.tempo_gasto_segundos), 0)               AS tempo_total_segundos,
                    COALESCE(COUNT(DISTINCT COALESCE(s.matricula_aluno, s.nome_aluno)), 0) AS alunos_ativos
                FROM sessoes_estudo s
                WHERE EXTRACT(MONTH FROM s.criado_em) = %(mes)s
                  AND EXTRACT(YEAR FROM s.criado_em) = %(ano)s
                  AND s.questoes_respondidas > 0
                  {filtros}
                GROUP BY DATE(s.criado_em)
                ORDER BY DATE(s.criado_em);
            """, {**params, "mes": mes, "ano": ano})
            dias = cursor.fetchall()

            serie_diaria = [
                {
                    "dia": d[0].isoformat(),
                    "sessoes": int(d[1]),
                    "questoes": int(d[2]),
                    "media_acerto": float(d[3] or 0),
                    "tempo_total_segundos": int(d[4] or 0),
                    "alunos_ativos": int(d[5] or 0),
                }
                for d in dias
            ]

            # Melhor dia
            melhor_dia = max(serie_diaria, key=lambda x: x["questoes"], default=None)

            # Ranking (Top 10)
            cursor.execute(f"""
                SELECT 
                    COALESCE(s.matricula_aluno, s.nome_aluno)               AS aluno,
                    COUNT(*)                                               AS sessoes,
                    SUM(s.questoes_respondidas)                            AS questoes,
                    ROUND(AVG(s.taxa_acerto)::numeric, 1)                  AS media_acerto
                FROM sessoes_estudo s
                WHERE EXTRACT(MONTH FROM s.criado_em) = %(mes)s
                  AND EXTRACT(YEAR FROM s.criado_em) = %(ano)s
                  AND s.questoes_respondidas > 0
                  {filtros}
                GROUP BY 1
                ORDER BY media_acerto DESC, questoes DESC
                LIMIT 10;
            """, {**params, "mes": mes, "ano": ano})
            ranking_rows = cursor.fetchall()
            ranking = [
                {"aluno": r[0], "sessoes": r[1], "questoes": r[2], "media": float(r[3])}
                for r in ranking_rows
            ]

            # Distribuição por Matéria (Radar Chart)
            # Filtra apenas se for um aluno específico ou visão geral do professor
            cursor.execute(f"""
                SELECT 
                    m.nome                                                 AS materia,
                    COUNT(sq.id)                                           AS total_questoes,
                    ROUND(AVG(CASE WHEN sq.acertou THEN 100 ELSE 0 END)::numeric, 1) AS precisao
                FROM sessoes_estudo s
                JOIN sessoes_questoes sq ON sq.sessao_id = s.id
                JOIN questoes q ON q.id = sq.questao_id
                JOIN questoes_materias qm ON qm.questao_id = q.id
                JOIN materias m ON m.id = qm.materia_id
                WHERE EXTRACT(MONTH FROM s.criado_em) = %(mes)s
                  AND EXTRACT(YEAR FROM s.criado_em) = %(ano)s
                  {filtros}
                GROUP BY m.nome
                HAVING COUNT(sq.id) > 2
                ORDER BY precisao DESC
                LIMIT 8;
            """, {**params, "mes": mes, "ano": ano})
            materias_rows = cursor.fetchall()
            desempenho_materias = [
                {"materia": r[0], "questoes": r[1], "precisao": float(r[2])}
                for r in materias_rows
            ]

            # Distribuição Horária (Heatmap)
            cursor.execute(f"""
                SELECT 
                    EXTRACT(HOUR FROM s.criado_em)                         AS hora,
                    COUNT(sq.id)                                           AS questoes
                FROM sessoes_estudo s
                JOIN sessoes_questoes sq ON sq.sessao_id = s.id
                WHERE EXTRACT(MONTH FROM s.criado_em) = %(mes)s
                  AND EXTRACT(YEAR FROM s.criado_em) = %(ano)s
                  {filtros}
                GROUP BY 1
                ORDER BY 1;
            """, {**params, "mes": mes, "ano": ano})
            horas_rows = cursor.fetchall()
            distribuicao_horaria = {int(r[0]): int(r[1]) for r in horas_rows}

            # Média Global (Benchmarking) - Ignora filtro de aluno para comparar
            params_global = {k: v for k, v in params.items() if k != "aluno_matricula"}
            filtros_global = filtros.replace("AND COALESCE(s.matricula_aluno, s.nome_aluno) = %(aluno_matricula)s", "")
            
            cursor.execute(f"""
                SELECT COALESCE(ROUND(AVG(s.taxa_acerto)::numeric, 1), 0) AS media_turma
                FROM sessoes_estudo s
                WHERE EXTRACT(MONTH FROM s.criado_em) = %(mes)s
                  AND EXTRACT(YEAR FROM s.criado_em) = %(ano)s
                  AND s.questoes_respondidas > 0
                  {filtros_global};
            """, {**params_global, "mes": mes, "ano": ano})
            media_turma = float(cursor.fetchone()[0] or 0)

            # Resumo mensal
            cursor.execute(f"""
                SELECT
                    COALESCE(COUNT(*), 0)                                  AS total_sessoes,
                    COALESCE(SUM(s.questoes_respondidas), 0)               AS total_questoes,
                    COALESCE(ROUND(AVG(s.taxa_acerto)::numeric, 1), 0)     AS media_acerto,
                    COALESCE(SUM(s.tempo_gasto_segundos), 0)               AS tempo_total_segundos,
                    COALESCE(COUNT(DISTINCT COALESCE(s.matricula_aluno, s.nome_aluno)), 0) AS alunos_ativos
                FROM sessoes_estudo s
                WHERE EXTRACT(MONTH FROM s.criado_em) = %(mes)s
                  AND EXTRACT(YEAR FROM s.criado_em) = %(ano)s
                  AND s.questoes_respondidas > 0
                  {filtros};
            """, {**params, "mes": mes, "ano": ano})
            resumo = cursor.fetchone()

        return {
            "resumo_mes": {
                "total_sessoes":        int(resumo[0] or 0),
                "total_questoes":       int(resumo[1] or 0),
                "media_acerto":         float(resumo[2] or 0),
                "tempo_total_segundos": int(resumo[3] or 0),
                "alunos_ativos":        int(resumo[4] or 0),
                "media_turma":          media_turma
            },
            "melhor_dia":   melhor_dia,
            "serie_diaria": serie_diaria,
            "ranking":      ranking,
            "desempenho_materias": desempenho_materias,
            "distribuicao_horaria": distribuicao_horaria,
            "periodo": {
                "mes": mes,
                "ano": ano,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar relatório: {str(e)}")
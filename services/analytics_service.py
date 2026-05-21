import logging
import time
from datetime import datetime
from typing import Optional, List, Dict, Any

from database import get_conexao
from utils.formatters import formatar_tempo_segundos

logger = logging.getLogger(__name__)

def _contar_total_filtrado(cursor, papel: Optional[str], usuario_id: Optional[int]) -> int:
    if papel == "professor" and usuario_id:
        query = """
            SELECT COUNT(DISTINCT u.id) FROM usuarios u
            INNER JOIN sessoes_estudo s ON COALESCE(s.matricula_aluno, s.nome_aluno) = u.matricula
            INNER JOIN sessoes_questoes sq ON sq.sessao_id = s.id
            INNER JOIN questoes q ON q.id = sq.questao_id
            WHERE u.papel = 'aluno' AND s.eh_teste_professor IS NOT TRUE AND q.criado_por = %(uid)s
        """
        cursor.execute(query, {"uid": usuario_id})
    else:
        cursor.execute("SELECT COUNT(*) FROM usuarios WHERE papel = 'aluno'")
    return cursor.fetchone()[0]


def get_relatorio_estudo(
    papel: Optional[str],
    usuario_id: Optional[int],
    mes: Optional[int],
    ano: Optional[int],
    materia_id: Optional[int],
    aluno_matricula: Optional[str]
) -> Dict[str, Any]:
    with get_conexao() as conn:
        cursor = conn.cursor()

        hoje = datetime.now()
        if mes is None or ano is None:
            mes = hoje.month
            ano = hoje.year

        filtros = ""
        params: dict = {}

        if papel == "professor" and usuario_id:
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

        # Distribuição por Matéria
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

        # Distribuição Horária
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

        # Média Global
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

def get_desempenho_estudantes(
    papel: Optional[str],
    usuario_id: Optional[int],
    pagina: int,
    por_pagina: int,
    materia_id: Optional[int],
    data_inicio: Optional[datetime],
    data_fim: Optional[datetime]
) -> tuple[list, int]:
    with get_conexao() as conn:
        cursor = conn.cursor()
        
        filtros_adicionais = []
        params_base = {"uid": usuario_id, "limit": por_pagina, "offset": (pagina - 1) * por_pagina}
        
        if materia_id:
            filtros_adicionais.append("AND qm.materia_id = %(materia_id)s")
            params_base["materia_id"] = materia_id
        if data_inicio:
            filtros_adicionais.append("AND s.criado_em >= %(data_inicio)s")
            params_base["data_inicio"] = data_inicio
        if data_fim:
            filtros_adicionais.append("AND s.criado_em <= %(data_fim)s")
            params_base["data_fim"] = data_fim
        
        filtro_professor = ""
        if papel == "professor" and usuario_id:
            filtro_professor = "AND EXISTS (SELECT 1 FROM sessoes_questoes sqp JOIN questoes qp ON qp.id = sqp.questao_id WHERE sqp.sessao_id = s.id AND qp.criado_por = %(uid)s)"
        
        filtros_str = " ".join(filtros_adicionais)
        
        query = """
            WITH sessoes_filtradas AS (
                SELECT u.nome, u.matricula, s.id AS sessao_id, s.questoes_respondidas,
                       s.taxa_acerto, s.tempo_gasto_segundos, s.criado_em, qm.materia_id,
                       COALESCE(NULLIF(TRIM(s.assunto_estudado), ''), 'Sem assunto') AS assunto_estudado,
                       COUNT(DISTINCT sq_idx.questao_id) AS questoes_detalhadas
                FROM usuarios u
                INNER JOIN sessoes_estudo s ON COALESCE(s.matricula_aluno, s.nome_aluno) = u.matricula
                LEFT JOIN sessoes_questoes sq_idx ON sq_idx.sessao_id = s.id
                LEFT JOIN questoes_materias qm ON qm.questao_id = sq_idx.questao_id
                WHERE u.papel = 'aluno' AND s.eh_teste_professor IS NOT TRUE {filtro_p} {filtros_a}
                GROUP BY u.nome, u.matricula, s.id, s.questoes_respondidas, s.taxa_acerto, s.tempo_gasto_segundos, s.criado_em, qm.materia_id, s.assunto_estudado
            ),
            resumo AS (
                SELECT nome, matricula, COUNT(DISTINCT sessao_id) AS sessoes,
                       SUM(questoes_respondidas) AS total_q,
                       ROUND(AVG(taxa_acerto)::numeric, 1) AS media,
                       AVG(tempo_gasto_segundos) AS tempo_m, MAX(criado_em) AS ultima
                FROM sessoes_filtradas GROUP BY nome, matricula
            ),
            kpis_v2 AS (
                SELECT
                    matricula,
                    ROUND(
                        CASE
                            WHEN SUM(CASE WHEN criado_em >= NOW() - INTERVAL '60 days' AND criado_em < NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END) > 0
                                 AND SUM(CASE WHEN criado_em >= NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END) > 0
                            THEN 100.0
                            ELSE 0.0
                        END
                    , 1) AS retencao_30d_percentual,
                    ROUND(
                        CASE
                            WHEN MAX(criado_em) IS NULL THEN 100.0
                            WHEN MAX(criado_em) < NOW() - INTERVAL '30 days' THEN 100.0
                            WHEN MAX(criado_em) < NOW() - INTERVAL '14 days' THEN 70.0
                            WHEN MAX(criado_em) < NOW() - INTERVAL '7 days' THEN 40.0
                            ELSE 0.0
                        END
                    , 1) AS churn_risco_percentual,
                    ROUND(
                        AVG(
                            CASE
                                WHEN questoes_respondidas > 0 THEN LEAST(100.0, (questoes_detalhadas * 100.0) / questoes_respondidas)
                                ELSE 0.0
                            END
                        )::numeric
                    , 1) AS conclusao_simulado_percentual
                FROM sessoes_filtradas
                GROUP BY matricula
            ),
            erros AS (
                SELECT matricula, jsonb_object_agg(assunto_estudado, jsonb_build_object('total', t_q, 'erros', t_e)) AS erros_mat
                FROM (SELECT matricula, assunto_estudado, SUM(questoes_respondidas) as t_q, 
                             SUM(ROUND(questoes_respondidas * (100 - taxa_acerto) / 100.0)) as t_e
                      FROM sessoes_filtradas GROUP BY matricula, assunto_estudado) sub GROUP BY matricula
            )
            SELECT
                r.*,
                COALESCE(e.erros_mat, '{}'::jsonb) AS erros_mat,
                COALESCE(k.retencao_30d_percentual, 0.0) AS retencao_30d_percentual,
                COALESCE(k.churn_risco_percentual, 0.0) AS churn_risco_percentual,
                COALESCE(k.conclusao_simulado_percentual, 0.0) AS conclusao_simulado_percentual
            FROM resumo r
            LEFT JOIN erros e ON e.matricula = r.matricula
            LEFT JOIN kpis_v2 k ON k.matricula = r.matricula
            ORDER BY r.media DESC LIMIT %(limit)s OFFSET %(offset)s;
        """.replace("{filtro_p}", filtro_professor).replace("{filtros_a}", filtros_str)
        
        cursor.execute(query, params_base)
        linhas = cursor.fetchall()
        total_alunos = _contar_total_filtrado(cursor, papel, usuario_id)
        
        return linhas, total_alunos

def get_metricas_individual(matricula: str) -> Optional[tuple]:
    with get_conexao() as conn:
        cursor = conn.cursor()
        query = """
            WITH sessoes_aluno AS (
                SELECT u.nome, u.matricula, s.id AS sessao_id, s.questoes_respondidas,
                       s.taxa_acerto, s.tempo_gasto_segundos, s.criado_em,
                       COALESCE(NULLIF(TRIM(s.assunto_estudado), ''), 'Sem assunto') AS assunto_estudado,
                       COUNT(DISTINCT sq.questao_id) AS questoes_detalhadas
                FROM usuarios u
                INNER JOIN sessoes_estudo s ON COALESCE(s.matricula_aluno, s.nome_aluno) = u.matricula
                LEFT JOIN sessoes_questoes sq ON sq.sessao_id = s.id
                WHERE u.matricula = %(matricula)s AND s.eh_teste_professor IS NOT TRUE
                GROUP BY u.nome, u.matricula, s.id, s.questoes_respondidas, s.taxa_acerto, s.tempo_gasto_segundos, s.criado_em, s.assunto_estudado
            ),
            resumo AS (
                SELECT nome, matricula, COUNT(sessao_id) AS sessoes,
                       SUM(questoes_respondidas) AS total_q,
                       ROUND(AVG(taxa_acerto)::numeric, 1) AS media,
                       AVG(tempo_gasto_segundos) AS tempo_m, MAX(criado_em) AS ultima
                FROM sessoes_aluno GROUP BY nome, matricula
            ),
            kpis_v2 AS (
                SELECT
                    ROUND(
                        CASE
                            WHEN SUM(CASE WHEN criado_em >= NOW() - INTERVAL '60 days' AND criado_em < NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END) > 0
                                 AND SUM(CASE WHEN criado_em >= NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END) > 0
                            THEN 100.0
                            ELSE 0.0
                        END
                    , 1) AS retencao_30d_percentual,
                    ROUND(
                        CASE
                            WHEN MAX(criado_em) IS NULL THEN 100.0
                            WHEN MAX(criado_em) < NOW() - INTERVAL '30 days' THEN 100.0
                            WHEN MAX(criado_em) < NOW() - INTERVAL '14 days' THEN 70.0
                            WHEN MAX(criado_em) < NOW() - INTERVAL '7 days' THEN 40.0
                            ELSE 0.0
                        END
                    , 1) AS churn_risco_percentual,
                    ROUND(
                        AVG(
                            CASE
                                WHEN questoes_respondidas > 0 THEN LEAST(100.0, (questoes_detalhadas * 100.0) / questoes_respondidas)
                                ELSE 0.0
                            END
                        )::numeric
                    , 1) AS conclusao_simulado_percentual
                FROM sessoes_aluno
            ),
            erros AS (
                SELECT jsonb_object_agg(assunto_estudado, jsonb_build_object('total', t_q, 'erros', t_e)) AS erros_mat
                FROM (SELECT assunto_estudado, SUM(questoes_respondidas) as t_q, 
                             SUM(ROUND(questoes_respondidas * (100 - taxa_acerto) / 100.0)) as t_e
                      FROM sessoes_aluno GROUP BY assunto_estudado) sub
            )
            SELECT
                r.*,
                e.erros_mat,
                COALESCE(k.retencao_30d_percentual, 0.0) AS retencao_30d_percentual,
                COALESCE(k.churn_risco_percentual, 0.0) AS churn_risco_percentual,
                COALESCE(k.conclusao_simulado_percentual, 0.0) AS conclusao_simulado_percentual
            FROM resumo r
            CROSS JOIN erros e
            CROSS JOIN kpis_v2 k;
        """
        cursor.execute(query, {"matricula": matricula})
        return cursor.fetchone()

def get_central_risco(papel: Optional[str], usuario_id: Optional[int], pagina: int, por_pagina: int) -> tuple[list, int]:
    with get_conexao() as conn:
        cursor = conn.cursor()
        incluir_sem_atividade = papel != "professor"

        filtro_professor = ""
        params = {"uid": usuario_id, "limit": por_pagina, "offset": (pagina - 1) * por_pagina}
        if papel == "professor" and usuario_id:
            filtro_professor = """
                AND EXISTS (
                    SELECT 1
                    FROM sessoes_questoes sqp
                    JOIN questoes qp ON qp.id = sqp.questao_id
                    WHERE sqp.sessao_id = s.id AND qp.criado_por = %(uid)s
                )
            """

        query = """
            WITH sessoes_base AS (
                SELECT
                    u.nome,
                    u.matricula,
                    s.id AS sessao_id,
                    s.questoes_respondidas,
                    s.criado_em,
                    COUNT(DISTINCT sq.questao_id) AS questoes_detalhadas
                FROM usuarios u
                LEFT JOIN sessoes_estudo s
                    ON COALESCE(s.matricula_aluno, s.nome_aluno) = u.matricula
                    AND s.eh_teste_professor IS NOT TRUE
                LEFT JOIN sessoes_questoes sq ON sq.sessao_id = s.id
                WHERE u.papel = 'aluno' {filtro_professor}
                GROUP BY u.nome, u.matricula, s.id, s.questoes_respondidas, s.criado_em
            ),
            agregados AS (
                SELECT
                    nome,
                    matricula,
                    COUNT(sessao_id) FILTER (WHERE sessao_id IS NOT NULL) AS sessoes,
                    MAX(criado_em) AS ultima_atividade,
                    ROUND(
                        CASE
                            WHEN SUM(CASE WHEN criado_em >= NOW() - INTERVAL '60 days' AND criado_em < NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END) > 0
                                 AND SUM(CASE WHEN criado_em >= NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END) > 0
                            THEN 100.0 ELSE 0.0
                        END
                    , 1) AS retencao_30d_percentual,
                    ROUND(
                        CASE
                            WHEN MAX(criado_em) IS NULL THEN 100.0
                            WHEN MAX(criado_em) < NOW() - INTERVAL '30 days' THEN 100.0
                            WHEN MAX(criado_em) < NOW() - INTERVAL '14 days' THEN 70.0
                            WHEN MAX(criado_em) < NOW() - INTERVAL '7 days' THEN 40.0
                            ELSE 0.0
                        END
                    , 1) AS churn_risco_percentual,
                    ROUND(
                        AVG(
                            CASE
                                WHEN questoes_respondidas > 0
                                    THEN LEAST(100.0, (questoes_detalhadas * 100.0) / questoes_respondidas)
                                ELSE 0.0
                            END
                        )::numeric
                    , 1) AS conclusao_simulado_percentual
                FROM sessoes_base
                GROUP BY nome, matricula
            )
            SELECT
                nome,
                matricula,
                COALESCE(sessoes, 0) AS sessoes,
                ultima_atividade,
                COALESCE(retencao_30d_percentual, 0.0) AS retencao_30d_percentual,
                COALESCE(churn_risco_percentual, 100.0) AS churn_risco_percentual,
                COALESCE(conclusao_simulado_percentual, 0.0) AS conclusao_simulado_percentual
            FROM agregados
            {filtro_sem_atividade}
            ORDER BY churn_risco_percentual DESC, ultima_atividade ASC NULLS FIRST
            LIMIT %(limit)s OFFSET %(offset)s;
        """.replace("{filtro_professor}", filtro_professor).replace(
            "{filtro_sem_atividade}",
            "" if incluir_sem_atividade else "WHERE sessoes > 0",
        )
        cursor.execute(query, params)
        rows = cursor.fetchall()

        count_query = """
            WITH sessoes_base AS (
                SELECT
                    u.matricula,
                    s.id AS sessao_id
                FROM usuarios u
                LEFT JOIN sessoes_estudo s
                    ON COALESCE(s.matricula_aluno, s.nome_aluno) = u.matricula
                    AND s.eh_teste_professor IS NOT TRUE
                WHERE u.papel = 'aluno' {filtro_professor}
                GROUP BY u.matricula, s.id
            ),
            agregados AS (
                SELECT matricula, COUNT(sessao_id) FILTER (WHERE sessao_id IS NOT NULL) AS sessoes
                FROM sessoes_base
                GROUP BY matricula
            )
            SELECT COUNT(*) FROM agregados {filtro_sem_atividade};
        """.replace("{filtro_professor}", filtro_professor).replace(
            "{filtro_sem_atividade}",
            "" if incluir_sem_atividade else "WHERE sessoes > 0",
        )
        cursor.execute(count_query, {"uid": usuario_id})
        total = cursor.fetchone()[0]

        return rows, total

def get_ranking_turma(limite: int) -> list:
    with get_conexao() as conn:
        cursor = conn.cursor()
        query = """
            SELECT u.nome, u.matricula, ROUND(AVG(s.taxa_acerto)::numeric, 1) as media,
                   SUM(s.questoes_respondidas) as total_q
            FROM usuarios u
            JOIN sessoes_estudo s ON COALESCE(s.matricula_aluno, s.nome_aluno) = u.matricula
            WHERE u.papel = 'aluno'
            GROUP BY u.nome, u.matricula
            HAVING SUM(s.questoes_respondidas) > 0
            ORDER BY media DESC, total_q DESC LIMIT %(limite)s;
        """
        cursor.execute(query, {"limite": limite})
        rows = cursor.fetchall()
        return [{"posicao": i+1, "nome": r[0], "matricula": r[1], "media": float(r[2]), "questoes": int(r[3])} for i, r in enumerate(rows)]

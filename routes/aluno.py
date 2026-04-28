"""
routes/aluno.py — Funcionalidades da visão do Aluno.

Rotas:
  GET /api/aluno/historico-grafico/{matricula}   — dados agregados por mês para gráficos
  GET /api/aluno/questoes-respondidas            — histórico detalhado de tentativas
  GET /api/aluno/meus-feedbacks/{nome}           — feedbacks do aluno
  GET /api/aluno/historico-diario/{matricula}    — série diária de questões
  GET /api/aluno/historico-filtrado/{matricula}  — dados filtrados por período/matéria/acerto
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from database import get_conexao

router = APIRouter(prefix="/api/aluno", tags=["Aluno"])


@router.get("/historico-grafico/{matricula}")
def historico_grafico(matricula: str):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()

            # --- Gráfico 1 e 2: evolução mensal (últimos 6 meses, com zeros) ---
            cursor.execute("""
                WITH meses AS (
                    SELECT generate_series(
                        DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months',
                        DATE_TRUNC('month', CURRENT_DATE),
                        '1 month'
                    )::date AS mes_dt
                ),
                sessoes_mes AS (
                    SELECT
                        DATE_TRUNC('month', criado_em)::date AS mes_dt,
                        COUNT(id) AS total_sessoes,
                        SUM(questoes_respondidas) AS total_questoes,
                        ROUND(AVG(taxa_acerto)::numeric, 1) AS media_acerto,
                        ROUND(AVG(tempo_gasto_segundos)::numeric, 0) AS tempo_medio_seg
                    FROM sessoes_estudo
                    WHERE nome_aluno = %s
                      AND criado_em >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'
                    GROUP BY DATE_TRUNC('month', criado_em)::date
                )
                SELECT
                    TO_CHAR(m.mes_dt, 'Mon/YY') AS mes_label,
                    COALESCE(s.total_sessoes, 0) AS total_sessoes,
                    COALESCE(s.total_questoes, 0) AS total_questoes,
                    COALESCE(s.media_acerto, 0) AS media_acerto,
                    COALESCE(s.tempo_medio_seg, 0) AS tempo_medio_seg
                FROM meses m
                LEFT JOIN sessoes_mes s ON s.mes_dt = m.mes_dt
                ORDER BY m.mes_dt;
            """, (matricula,))

            linhas_mes = cursor.fetchall()

            # --- Gráfico 3: desempenho por assunto ---
            cursor.execute("""
                WITH por_assunto AS (
                    SELECT
                        COALESCE(NULLIF(TRIM(assunto_estudado), ''), 'Sem assunto') AS assunto,
                        SUM(questoes_respondidas) AS total_q,
                        ROUND(
                            (SUM(questoes_respondidas * taxa_acerto / 100.0)
                             / NULLIF(SUM(questoes_respondidas), 0) * 100)::numeric
                        , 1) AS media_pond
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
                    COUNT(id) AS total_sessoes,
                    COALESCE(SUM(questoes_respondidas), 0) AS total_questoes,
                    ROUND(AVG(taxa_acerto)::numeric, 1) AS media_geral,
                    ROUND(AVG(tempo_gasto_segundos)::numeric, 0) AS tempo_medio_seg,
                    MAX(criado_em) AS ultima_sessao
                FROM sessoes_estudo
                WHERE nome_aluno = %s;
            """, (matricula,))

            resumo = cursor.fetchone()

        return {
            "resumo": {
                "total_sessoes": int(resumo[0] or 0),
                "total_questoes": int(resumo[1] or 0),
                "media_geral": float(resumo[2] or 0),
                "tempo_medio_seg": int(resumo[3] or 0),
                "ultima_sessao": resumo[4].isoformat() if resumo[4] else None,
            },
            "por_mes": [
                {
                    "mes": r[0],
                    "sessoes": int(r[1]),
                    "questoes": int(r[2]),
                    "media_acerto": float(r[3] or 0),
                    "tempo_medio_seg": int(r[4] or 0),
                }
                for r in linhas_mes
            ],
            "por_assunto": [
                {
                    "assunto": r[0],
                    "questoes": int(r[1]),
                    "media_acerto": float(r[2] or 0),
                }
                for r in linhas_assunto
            ],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar histórico gráfico: {str(e)}")


@router.get("/questoes-respondidas")
def questoes_respondidas(
    matricula: str = Query(..., description="Matrícula do aluno"),
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(20, ge=1, le=100),
    acerto: Optional[str] = Query(None, description="Filtrar por 'acerto' ou 'erro'"),
    materia_id: Optional[int] = Query(None, description="Filtrar por ID da matéria"),
):
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


@router.get("/historico-diario/{matricula}")
def historico_diario(matricula: str, dias: int = 30):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                WITH dias_periodo AS (
                    SELECT generate_series(
                        CURRENT_DATE - INTERVAL '1 day' * %(dias)s,
                        CURRENT_DATE,
                        '1 day'
                    )::date AS dia
                ),
                sessoes_dia AS (
                    SELECT
                        DATE(s.criado_em) AS dia,
                        COUNT(s.id) AS sessoes,
                        COALESCE(SUM(s.questoes_respondidas), 0) AS questoes
                    FROM sessoes_estudo s
                    WHERE s.nome_aluno = %(matricula)s
                      AND s.criado_em >= CURRENT_DATE - INTERVAL '1 day' * %(dias)s
                    GROUP BY DATE(s.criado_em)
                )
                SELECT
                    dp.dia,
                    COALESCE(sd.sessoes, 0) AS sessoes,
                    COALESCE(sd.questoes, 0) AS questoes
                FROM dias_periodo dp
                LEFT JOIN sessoes_dia sd ON sd.dia = dp.dia
                ORDER BY dp.dia;
            """, {"matricula": matricula, "dias": dias})
            rows = cursor.fetchall()

        return {
            "serie_diaria": [
                {"dia": r[0].isoformat(), "sessoes": int(r[1]), "questoes": int(r[2])}
                for r in rows
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar histórico diário: {str(e)}")


@router.get("/historico-filtrado/{matricula}")
def historico_filtrado(
    matricula: str,
    data_inicio: Optional[str] = Query(None),
    data_fim: Optional[str] = Query(None),
    materia_id: Optional[int] = Query(None),
    acerto: Optional[str] = Query(None),
):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            params = {
                "matricula": matricula,
                "data_inicio": data_inicio,
                "data_fim": data_fim,
                "materia_id": materia_id,
                "acerto": acerto,
            }

            base = """
                SELECT s.id, s.assunto_estudado, s.questoes_respondidas,
                       s.taxa_acerto, s.tempo_gasto_segundos, s.criado_em
                FROM sessoes_estudo s
                WHERE s.nome_aluno = %(matricula)s
            """
            if data_inicio:
                base += " AND s.criado_em >= %(data_inicio)s::date"
            if data_fim:
                base += " AND s.criado_em < %(data_fim)s::date + INTERVAL '1 day'"
            if materia_id:
                base += """ AND EXISTS (
                    SELECT 1 FROM sessoes_questoes sq
                    JOIN questoes_materias qm ON qm.questao_id = sq.questao_id
                    WHERE sq.sessao_id = s.id AND qm.materia_id = %(materia_id)s
                )"""
            if acerto == "acerto":
                base += """ AND EXISTS (
                    SELECT 1 FROM sessoes_questoes sq
                    WHERE sq.sessao_id = s.id AND sq.acertou = TRUE
                )"""
            elif acerto == "erro":
                base += """ AND EXISTS (
                    SELECT 1 FROM sessoes_questoes sq
                    WHERE sq.sessao_id = s.id AND sq.acertou = FALSE
                )"""

            cursor.execute(f"""
                SELECT COUNT(id), COALESCE(SUM(questoes_respondidas), 0),
                       ROUND(AVG(taxa_acerto)::numeric, 1),
                       ROUND(AVG(tempo_gasto_segundos)::numeric, 0), MAX(criado_em)
                FROM ({base}) sub
            """, params)
            resumo = cursor.fetchone()

            cursor.execute(f"""
                SELECT DATE(sub.criado_em), COUNT(sub.id),
                       SUM(sub.questoes_respondidas),
                       ROUND(AVG(sub.taxa_acerto)::numeric, 1)
                FROM ({base}) sub GROUP BY DATE(sub.criado_em) ORDER BY DATE(sub.criado_em)
            """, params)
            diario = cursor.fetchall()

            cursor.execute(f"""
                SELECT COALESCE(NULLIF(TRIM(sub.assunto_estudado), ''), 'Sem assunto'),
                       SUM(sub.questoes_respondidas),
                       ROUND(AVG(sub.taxa_acerto)::numeric, 1)
                FROM ({base}) sub GROUP BY 1 ORDER BY 3 ASC
            """, params)
            por_assunto = cursor.fetchall()

        return {
            "resumo": {
                "total_sessoes": int(resumo[0] or 0),
                "total_questoes": int(resumo[1] or 0),
                "media_geral": float(resumo[2] or 0),
                "tempo_medio_seg": int(resumo[3] or 0),
                "ultima_sessao": resumo[4].isoformat() if resumo[4] else None,
            },
            "por_dia": [
                {"dia": r[0].isoformat(), "sessoes": int(r[1]), "questoes": int(r[2]), "media_acerto": float(r[3] or 0)}
                for r in diario
            ],
            "por_assunto": [
                {"assunto": r[0], "questoes": int(r[1]), "media_acerto": float(r[2] or 0)}
                for r in por_assunto
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar histórico filtrado: {str(e)}")
@router.get("/ranking/{matricula}")
def ranking_aluno(matricula: str):
    """
    Retorna a posição do aluno no ranking geral (ordenado por média de acerto).
    """
    try:
        with get_conexao() as conn:
            row = conn.execute("""
                WITH medias AS (
                    SELECT
                        u.matricula,
                        ROUND(AVG(s.taxa_acerto)::numeric, 1) AS media_geral
                    FROM sessoes_estudo s
                    JOIN usuarios u ON u.id = s.usuario_id AND u.papel = 'aluno'
                    WHERE s.eh_teste_professor IS NOT TRUE
                    GROUP BY u.matricula
                ),
                ranking AS (
                    SELECT
                        matricula,
                        media_geral,
                        RANK() OVER (ORDER BY media_geral DESC) AS posicao
                    FROM medias
                )
                SELECT posicao, (SELECT COUNT(*) FROM medias) AS total_alunos
                FROM ranking
                WHERE matricula = %s
            """, (matricula,)).fetchone()

        if not row:
            return {
                "posicao": None,
                "total_alunos": 0,
                "percentil": 0,
                "mensagem": "Aluno sem sessões registradas."
            }

        posicao = int(row[0])
        total = int(row[1])
        percentil = round(((total - posicao) / total) * 100, 1) if total > 0 else 0

        return {
            "posicao": posicao,
            "total_alunos": total,
            "percentil": percentil,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar ranking: {str(e)}")
# ==========================================
# ROTAS FALTANTES PARA O FRONTEND FUNCIONAR
# ==========================================

@router.get("/progresso/{matricula}")
def progresso_aluno(matricula: str):
    """
    Retorna o total de questões únicas que o aluno já respondeu 
    versus o total de questões disponíveis no banco (Edital).
    """
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            
            # Conta quantas questões únicas o aluno já fez
            cursor.execute("""
                SELECT COUNT(DISTINCT sq.questao_id)
                FROM sessoes_questoes sq
                JOIN sessoes_estudo s ON s.id = sq.sessao_id
                WHERE s.nome_aluno = %s
            """, (matricula,))
            respondidas = cursor.fetchone()[0] or 0

            # Conta o total de questões cadastradas na plataforma
            cursor.execute("SELECT COUNT(id) FROM questoes")
            total = cursor.fetchone()[0] or 1 # Evita divisão por zero

            percentual = min(round((respondidas / total) * 100, 1), 100.0)

            return {
                "respondidas": respondidas,
                "total": total,
                "percentual": percentual
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar progresso: {str(e)}")


@router.get("/sessoes/{matricula}")
def listar_sessoes(matricula: str):
    """
    Alimenta o Modal "Histórico de Sessões" no frontend.
    """
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    criado_em, 
                    COALESCE(assunto_estudado, 'Geral') AS materia_nome,
                    questoes_respondidas AS total_questoes,
                    taxa_acerto AS percentual_acerto,
                    tempo_gasto_segundos AS tempo_seg
                FROM sessoes_estudo
                WHERE nome_aluno = %s
                ORDER BY criado_em DESC
                LIMIT 100
            """, (matricula,))
            rows = cursor.fetchall()
            
            return [
                {
                    "criado_em": r[0].isoformat() if r[0] else None,
                    "materia_nome": r[1],
                    "total_questoes": r[2],
                    "percentual_acerto": r[3],
                    "tempo_seg": r[4]
                } for r in rows
            ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar sessões: {str(e)}")
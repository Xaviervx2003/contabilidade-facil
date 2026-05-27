"""
routes/aluno.py — Funcionalidades da visão do Aluno.

Rotas:
  GET /api/aluno/historico-grafico/{matricula}   — dados agregados por mês para gráficos
  GET /api/aluno/questoes-respondidas            — histórico detalhado de tentativas
  GET /api/aluno/meus-feedbacks/{nome}           — feedbacks do aluno (legado)
  GET /api/aluno/meus-feedbacks-v2               — feedbacks por matricula (seguro)
  GET /api/aluno/historico-diario/{matricula}    — série diária de questões
"""
routes/aluno.py — Funcionalidades da visão do Aluno.

Rotas:
  GET /api/aluno/historico-grafico/{matricula}   — dados agregados por mês para gráficos
  GET /api/aluno/questoes-respondidas            — histórico detalhado de tentativas
  GET /api/aluno/meus-feedbacks/{nome}           — feedbacks do aluno (legado)
  GET /api/aluno/meus-feedbacks-v2               — feedbacks por matricula (seguro)
  GET /api/aluno/historico-diario/{matricula}    — série diária de questões
  GET /api/aluno/historico-filtrado/{matricula}  — dados filtrados por período/matéria/acerto
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import Optional
from database import get_conexao
from utils.jwt_auth import usuario_autenticado, verificar_proprio_ou_admin
from utils.cache import cache

router = APIRouter(prefix="/api/aluno", tags=["Aluno"])


class VideoAssistidoPayload(BaseModel):
    matricula: str
    origem: Optional[str] = "video"


def _garantir_tabela_videos_assistidos(cursor):
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS videos_assistidos_aluno (
            id SERIAL PRIMARY KEY,
            matricula_aluno TEXT NOT NULL,
            video_id INTEGER NOT NULL,
            origem VARCHAR(20) NOT NULL DEFAULT 'video',
            assistido_em TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE (matricula_aluno, video_id, origem)
        );
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_videos_assistidos_aluno_matricula
        ON videos_assistidos_aluno (matricula_aluno);
    """)


@router.get("/historico-grafico/{matricula}")
def historico_grafico(matricula: str, token: dict = Depends(verificar_proprio_ou_admin)):
    cache_key = f"historico_grafico:{matricula}"
    cached = cache.get(cache_key)
    if cached:
        return cached
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
                    WHERE COALESCE(matricula_aluno, nome_aluno) = %s
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
                    WHERE COALESCE(matricula_aluno, nome_aluno) = %s
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
                WHERE COALESCE(matricula_aluno, nome_aluno) = %s;
            """, (matricula,))

            resumo = cursor.fetchone()

        resultado = {
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
        cache.set(cache_key, resultado, expire=300)
        return resultado

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar histórico gráfico: {str(e)}")


@router.get("/videos-assistidos/{matricula}")
def listar_videos_assistidos(matricula: str, token: dict = Depends(verificar_proprio_ou_admin)):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            _garantir_tabela_videos_assistidos(cursor)
            cursor.execute("""
                SELECT video_id, origem, assistido_em
                FROM videos_assistidos_aluno
                WHERE matricula_aluno = %s
                ORDER BY assistido_em DESC;
            """, (matricula,))
            rows = cursor.fetchall()

        dados = [
            {
                "video_id": int(row[0]),
                "origem": row[1],
                "chave": f"{row[1]}:{int(row[0])}",
                "assistido_em": row[2].isoformat() if row[2] else None,
            }
            for row in rows
        ]
        return {
            "sucesso": True,
            "dados": dados,
            "chaves": [item["chave"] for item in dados],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar videos assistidos: {str(e)}")


@router.post("/video-assistido/{video_id}")
def marcar_video_assistido(video_id: int, payload: VideoAssistidoPayload, token: dict = Depends(usuario_autenticado)):
    origem = payload.origem or "video"
    if origem not in {"video", "questao"}:
        origem = "video"

    matricula = (payload.matricula or "").strip()
    if not matricula:
        raise HTTPException(status_code=422, detail="Matricula obrigatoria")

    if token.get("papel") == "aluno" and token.get("sub") != matricula:
        raise HTTPException(status_code=403, detail="Acesso negado. Você só pode acessar seus próprios dados.")

    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            _garantir_tabela_videos_assistidos(cursor)
            cursor.execute("""
                INSERT INTO videos_assistidos_aluno (matricula_aluno, video_id, origem)
                VALUES (%s, %s, %s)
                ON CONFLICT (matricula_aluno, video_id, origem)
                DO UPDATE SET assistido_em = EXCLUDED.assistido_em
                RETURNING video_id, origem, assistido_em;
            """, (matricula, video_id, origem))
            row = cursor.fetchone()
            conn.commit()

        return {
            "sucesso": True,
            "video_id": int(row[0]),
            "origem": row[1],
            "chave": f"{row[1]}:{int(row[0])}",
            "assistido_em": row[2].isoformat() if row[2] else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao salvar video assistido: {str(e)}")


@router.get("/questoes-respondidas")
    """
    cache_key = f"quiz_analytics:{matricula}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    try:
        with get_conexao() as conn:
            cursor = conn.cursor()

            # ── 1. Acerto por matéria ────────────────────────────────────────
            cursor.execute("""
                SELECT
                    COALESCE(NULLIF(TRIM(m.nome), ''), 'Sem matéria') AS materia,
                    COUNT(sq.questao_id)                              AS total,
                    SUM(CASE WHEN sq.acertou THEN 1 ELSE 0 END)      AS acertos,
                    ROUND(
                        100.0 * SUM(CASE WHEN sq.acertou THEN 1 ELSE 0 END)
                        / NULLIF(COUNT(sq.questao_id), 0)::numeric, 1
                    )                                                AS taxa_acerto
                FROM sessoes_questoes sq
                JOIN sessoes_estudo   se ON se.id = sq.sessao_id
                JOIN questoes          q ON q.id  = sq.questao_id
                LEFT JOIN questoes_materias qm ON qm.questao_id = q.id
                LEFT JOIN materias         m  ON m.id = qm.materia_id
                WHERE COALESCE(se.matricula_aluno, se.nome_aluno) = %s
                GROUP BY materia
                ORDER BY taxa_acerto ASC;
            """, (matricula,))
            por_materia = [
                {"materia": r[0], "total": int(r[1]), "acertos": int(r[2]), "taxa_acerto": float(r[3] or 0)}
                for r in cursor.fetchall()
            ]

            # ── 2. Horário preferido de estudo ───────────────────────────────
            cursor.execute("""
                SELECT
                    CASE
                        WHEN EXTRACT(HOUR FROM criado_em) BETWEEN 5  AND 11 THEN 'Manhã'
                        WHEN EXTRACT(HOUR FROM criado_em) BETWEEN 12 AND 17 THEN 'Tarde'
                        WHEN EXTRACT(HOUR FROM criado_em) BETWEEN 18 AND 22 THEN 'Noite'
                        ELSE 'Madrugada'
                    END AS turno,
                    COUNT(id) AS sessoes
                FROM sessoes_estudo
                WHERE COALESCE(matricula_aluno, nome_aluno) = %s
                GROUP BY turno
                ORDER BY sessoes DESC;
            """, (matricula,))
            por_turno = [
                {"turno": r[0], "sessoes": int(r[1])}
                for r in cursor.fetchall()
            ]

            # ── 3. Tempo médio e total de questões ───────────────────────────
            cursor.execute("""
                SELECT
                    COALESCE(SUM(questoes_respondidas), 0)            AS total_questoes,
                    ROUND(AVG(tempo_gasto_segundos)::numeric, 0)      AS tempo_medio_seg,
                    ROUND(AVG(taxa_acerto)::numeric, 1)               AS media_acerto
                FROM sessoes_estudo
                WHERE COALESCE(matricula_aluno, nome_aluno) = %s;
            """, (matricula,))
            r = cursor.fetchone()
            resumo = {
                "total_questoes": int(r[0] or 0),
                "tempo_medio_seg": int(r[1] or 0),
                "media_acerto": float(r[2] or 0),
            }

        resultado = {
            "resumo": resumo,
            "por_materia": por_materia,
            "por_turno": por_turno,
        }
        cache.set(cache_key, resultado, expire=300)
        return resultado

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar quiz analytics: {str(e)}")

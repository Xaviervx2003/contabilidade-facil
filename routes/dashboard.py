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
                        COUNT(DISTINCT s.nome_aluno)            AS alunos_ativos,
                        SUM(s.questoes_respondidas)             AS total_questoes,
                        AVG(s.tempo_gasto_segundos) / 60.0      AS tempo_medio_minutos
                    FROM sessoes_estudo s
                    JOIN usuarios u ON u.matricula = s.nome_aluno AND u.papel = 'aluno'
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
                        COUNT(DISTINCT s.nome_aluno)            AS alunos_ativos,
                        SUM(s.questoes_respondidas)             AS total_questoes,
                        AVG(s.tempo_gasto_segundos) / 60.0      AS tempo_medio_minutos
                    FROM sessoes_estudo s
                    JOIN usuarios u ON u.matricula = s.nome_aluno AND u.papel = 'aluno';
                """)

            dados = cursor.fetchone()
            cursor.execute("SELECT COUNT(*) FROM questoes;")
            total_questoes_banco = cursor.fetchone()[0] or 0

        return {
            "alunos_ativos":              int(dados[0] or 0),
            "total_questoes_resolvidas":  int(dados[1] or 0),
            "tempo_medio_minutos":        float(round(dados[2] or 0, 1)),
            "total_questoes_banco":       int(total_questoes_banco),
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

@router.get("/dashboard/visao-geral")
def visao_geral(usuario_id: Optional[int] = Query(None)):
    """Retorna últimas atividades e progresso geral da turma (apenas alunos)."""
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            papel = _get_papel_usuario(cursor, usuario_id) if usuario_id else None

            filtro_prof = ""
            params = {}
            if papel == "professor":
                filtro_prof = """
                    AND s.eh_teste_professor IS NOT TRUE
                    AND EXISTS (
                        SELECT 1 FROM sessoes_questoes sq
                        JOIN questoes q ON q.id = sq.questao_id
                        WHERE sq.sessao_id = s.id AND q.criado_por = %(uid)s
                    )
                """
                params["uid"] = usuario_id

            # Últimas 5 sessões de alunos
            cursor.execute(f"""
                SELECT s.nome_aluno, s.assunto_estudado, s.questoes_respondidas,
                       s.taxa_acerto, s.criado_em
                FROM sessoes_estudo s
                JOIN usuarios u ON u.matricula = s.nome_aluno AND u.papel = 'aluno'
                WHERE 1=1 {filtro_prof}
                ORDER BY s.criado_em DESC
                LIMIT 5
            """, params)
            ultimas = [
                {
                    "aluno": row[0],
                    "assunto": row[1],
                    "questoes": row[2],
                    "acerto": row[3],
                    "data": row[4].isoformat() if row[4] else None,
                }
                for row in cursor.fetchall()
            ]

            # Média de questões respondidas por aluno (apenas alunos)
            cursor.execute(f"""
                SELECT ROUND(AVG(total_questoes), 1)
                FROM (
                    SELECT s.nome_aluno, SUM(s.questoes_respondidas) AS total_questoes
                    FROM sessoes_estudo s
                    JOIN usuarios u ON u.matricula = s.nome_aluno AND u.papel = 'aluno'
                    WHERE 1=1 {filtro_prof}
                    GROUP BY s.nome_aluno
                ) sub
            """, params)
            media_geral = cursor.fetchone()[0] or 0

            return {
                "ultimas_sessoes": ultimas,
                "media_questoes_por_aluno": float(media_geral),
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")
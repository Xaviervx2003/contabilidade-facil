"""
routes/relatorios.py – Relatório de estudo mensal.
Extraído do dashboard.py para manter responsabilidade única.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from database import get_conexao

router = APIRouter(prefix="/api", tags=["Relatórios"])


def _get_papel_usuario(cursor, usuario_id: int) -> Optional[str]:
    cursor.execute("SELECT papel FROM usuarios WHERE id = %s", (usuario_id,))
    row = cursor.fetchone()
    return row[0] if row else None


@router.get("/relatorios/estudo")
def relatorio_estudo(usuario_id: Optional[int] = Query(None)):
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

            cursor.execute(f"""
                SELECT
                    DATE(s.criado_em)                                      AS dia,
                    COUNT(*)                                               AS sessoes,
                    COALESCE(SUM(s.questoes_respondidas), 0)               AS questoes,
                    COALESCE(ROUND(AVG(s.taxa_acerto)::numeric, 1), 0)     AS media_acerto,
                    COALESCE(SUM(s.tempo_gasto_segundos), 0)               AS tempo_total_segundos
                FROM sessoes_estudo s
                WHERE DATE_TRUNC('month', s.criado_em) = DATE_TRUNC('month', NOW())
                  AND s.questoes_respondidas > 0
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

            cursor.execute(f"""
                SELECT
                    COALESCE(COUNT(*), 0)                                  AS total_sessoes,
                    COALESCE(SUM(s.questoes_respondidas), 0)               AS total_questoes,
                    COALESCE(ROUND(AVG(s.taxa_acerto)::numeric, 1), 0)     AS media_acerto,
                    COALESCE(SUM(s.tempo_gasto_segundos), 0)               AS tempo_total_segundos
                FROM sessoes_estudo s
                WHERE DATE_TRUNC('month', s.criado_em) = DATE_TRUNC('month', NOW())
                  AND s.questoes_respondidas > 0
                  {filtro_professor};
            """, params)
            resumo = cursor.fetchone()

        return {
            "resumo_mes": {
                "total_sessoes":        int(resumo[0] or 0),
                "total_questoes":       int(resumo[1] or 0),
                "media_acerto":         float(resumo[2] or 0),
                "tempo_total_segundos": int(resumo[3] or 0),
            },
            "melhor_dia":   melhor_dia,
            "serie_diaria": serie_diaria,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar relatório: {str(e)}")
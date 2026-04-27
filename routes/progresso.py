"""
routes/progresso.py – Progresso individual do aluno no edital de questões.
"""

from fastapi import APIRouter, HTTPException
from database import get_conexao

router = APIRouter(prefix="/api", tags=["Progresso"])


@router.get("/aluno/progresso/{matricula}")
def progresso_aluno(matricula: str):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            # Total de questões distintas que o aluno já respondeu
            cursor.execute("""
                SELECT COUNT(DISTINCT sq.questao_id) AS respondidas,
                       (SELECT COUNT(*) FROM questoes) AS total
                FROM sessoes_estudo s
                JOIN sessoes_questoes sq ON sq.sessao_id = s.id
                WHERE s.nome_aluno = %s
            """, (matricula,))
            row = cursor.fetchone()
            if not row:
                return {"respondidas": 0, "total": 0, "percentual": 0}

            respondidas = row[0] or 0
            total = row[1] or 1  # evita divisão por zero
            percentual = round((respondidas / total) * 100, 1)

            return {
                "respondidas": respondidas,
                "total": total,
                "percentual": percentual
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar progresso: {str(e)}")
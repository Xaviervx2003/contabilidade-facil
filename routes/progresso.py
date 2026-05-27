"""
routes/progresso.py – Progresso individual do aluno no edital de questões.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from database import get_conexao
from utils.jwt_auth import verificar_proprio_ou_admin

router = APIRouter(prefix="/api", tags=["Progresso"])


@router.get("/aluno/progresso/{matricula}")
def progresso_aluno(matricula: str, materia_id: Optional[int] = None, token: dict = Depends(verificar_proprio_ou_admin)):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            # Total de questões distintas que o aluno já respondeu
            query_respondidas = """
                SELECT COUNT(DISTINCT sq.questao_id)
                FROM sessoes_estudo s
                JOIN sessoes_questoes sq ON sq.sessao_id = s.id
                WHERE COALESCE(s.matricula_aluno, s.nome_aluno) = %s
            """
            
            # Total de questões existentes no edital (total ou por matéria)
            query_total = "SELECT COUNT(*) FROM questoes"
            
            params_res = [matricula]
            params_tot = []
            
            if materia_id:
                query_respondidas += """ AND EXISTS (
                    SELECT 1 FROM questoes_materias qm 
                    WHERE qm.questao_id = sq.questao_id AND qm.materia_id = %s
                )"""
                params_res.append(materia_id)
                
                query_total = "SELECT COUNT(*) FROM questoes_materias WHERE materia_id = %s"
                params_tot.append(materia_id)

            cursor.execute(query_respondidas, tuple(params_res))
            respondidas = cursor.fetchone()[0] or 0
            
            cursor.execute(query_total, tuple(params_tot))
            total = cursor.fetchone()[0] or 0
            
            percentual = round((respondidas / total) * 100, 1) if total > 0 else 0

            return {
                "respondidas": respondidas,
                "total": total,
                "percentual": percentual
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar progresso: {str(e)}")
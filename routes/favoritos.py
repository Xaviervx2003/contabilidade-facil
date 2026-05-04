"""
routes/favoritos.py — Gestão de questões favoritas do aluno.
Permite marcar/desmarcar questões para revisão futura.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from database import get_conexao

router = APIRouter(prefix="/api", tags=["Favoritos"])


class FavoritoRequest(BaseModel):
    matricula: str
    questao_id: int


@router.get("/favoritos/{matricula}")
def listar_favoritos(matricula: str):
    """Retorna todas as questões favoritadas pelo aluno."""
    with get_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT questao_id FROM favoritos_aluno WHERE matricula_aluno = %s ORDER BY id DESC",
            (matricula,),
        )
        return [{"questao_id": row[0]} for row in cursor.fetchall()]


@router.post("/favoritos/adicionar")
def adicionar_favorito(dados: FavoritoRequest):
    """Adiciona uma questão aos favoritos do aluno."""
    with get_conexao() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO favoritos_aluno (matricula_aluno, questao_id) VALUES (%s, %s)",
                (dados.matricula, dados.questao_id),
            )
            conn.commit()
            return {"sucesso": True}
        except Exception as e:
            conn.rollback()
            if "duplicate" in str(e).lower() or "unique" in str(e).lower():
                raise HTTPException(status_code=409, detail="Questão já favoritada.")
            raise HTTPException(status_code=500, detail=f"Erro ao favoritar: {str(e)}")


@router.delete("/favoritos/remover/{questao_id}")
def remover_favorito(questao_id: int, matricula: str = Query(...)):
    """Remove uma questão dos favoritos do aluno."""
    with get_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM favoritos_aluno WHERE matricula_aluno = %s AND questao_id = %s",
            (matricula, questao_id),
        )
        conn.commit()
        return {"sucesso": True}
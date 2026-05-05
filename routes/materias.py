# routes/materias.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import get_conexao

router = APIRouter(prefix="/api/admin", tags=["Admin"])

class MateriaResponse(BaseModel):
    id: int
    nome: str
    descricao: Optional[str] = None

@router.get("/materias", response_model=list[MateriaResponse])
def obter_materias():
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, nome, descricao FROM materias ORDER BY nome")
            rows = cursor.fetchall()
            return [{"id": r[0], "nome": r[1], "descricao": r[2]} for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
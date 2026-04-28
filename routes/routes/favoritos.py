from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import psycopg_pool
import os

router = APIRouter(prefix="/api/favoritos", tags=["Favoritos"])

# Conexão com o banco (ajuste conforme sua configuração atual no main.py)
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:pass@localhost/contabilidade_facil")

class FavoritoCreate(BaseModel):
    matricula: str
    questao_id: int

@router.get("/{matricula}")
async def listar_favoritos(matricula: str):
    """Lista todas as questões favoritas de um aluno"""
    # Aqui você usaria a conexão real do seu projeto
    # Exemplo simplificado:
    try:
        with psycopg_pool.ConnectionPool(DATABASE_URL) as pool:
            with pool.connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT q.id, q.enunciado, q.dificuldade, f.data_criacao
                        FROM favoritos_aluno f
                        JOIN questoes q ON f.questao_id = q.id
                        WHERE f.matricula_aluno = %s
                        ORDER BY f.data_criacao DESC
                    """, (matricula,))
                    resultados = cur.fetchall()
                    
                    return [
                        {
                            "id": r[0],
                            "enunciado": r[1],
                            "dificuldade": r[2],
                            "data_adicao": r[3].isoformat() if r[3] else None
                        }
                        for r in resultados
                    ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/adicionar")
async def adicionar_favorito(dados: FavoritoCreate):
    """Marca uma questão como favorita"""
    try:
        with psycopg_pool.ConnectionPool(DATABASE_URL) as pool:
            with pool.connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO favoritos_aluno (matricula_aluno, questao_id)
                        VALUES (%s, %s)
                        ON CONFLICT (matricula_aluno, questao_id) DO NOTHING
                        RETURNING true
                    """, (dados.matricula, dados.questao_id))
                    
                    if cur.fetchone():
                        return {"mensagem": "Questão adicionada aos favoritos"}
                    else:
                        return {"mensagem": "Questão já estava nos favoritos"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/remover/{questao_id}")
async def remover_favorito(questao_id: int, matricula: str):
    """Remove uma questão dos favoritos"""
    try:
        with psycopg_pool.ConnectionPool(DATABASE_URL) as pool:
            with pool.connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        DELETE FROM favoritos_aluno
                        WHERE matricula_aluno = %s AND questao_id = %s
                    """, (matricula, questao_id))
                    
                    if cur.rowcount > 0:
                        return {"mensagem": "Removido dos favoritos"}
                    else:
                        raise HTTPException(status_code=404, detail="Favorito não encontrado")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
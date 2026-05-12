"""
routes/videos.py – CRUD de vídeos independentes (não vinculados a questões).
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from database import get_conexao
from models import VideoRequest
from utils.responses import api_response

router = APIRouter(prefix="/api/videos", tags=["Vídeos"])

@router.get("")
def obter_videos(
    materia_id: Optional[int] = Query(None),
    busca: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100)
):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            
            conditions = []
            params = []
            
            if materia_id:
                conditions.append("v.materia_id = %s")
                params.append(materia_id)
                
            if busca:
                conditions.append("v.titulo ILIKE %s")
                params.append(f"%{busca}%")
                
            where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
            
            # Count total
            cursor.execute(f"SELECT COUNT(*) FROM videos v {where_clause};", tuple(params))
            total = cursor.fetchone()[0]
            
            # Get data
            offset = (page - 1) * per_page
            cursor.execute(f"""
                SELECT 
                    v.id, v.titulo, v.link_video, v.materia_id, m.nome as materia_nome, v.data_criacao
                FROM videos v
                LEFT JOIN materias m ON v.materia_id = m.id
                {where_clause}
                ORDER BY v.data_criacao DESC
                LIMIT %s OFFSET %s;
            """, tuple(params + [per_page, offset]))
            
            rows = cursor.fetchall()
            
            dados = [
                {
                    "id": r[0],
                    "titulo": r[1],
                    "link_video": r[2],
                    "materia_id": r[3],
                    "materia_nome": r[4],
                    "data_criacao": r[5].isoformat() if r[5] else None
                }
                for r in rows
            ]
            
        return {
            "sucesso": True,
            "dados": {
                "data": dados,
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": -(-total // per_page)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
def criar_video(video: VideoRequest):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO videos (titulo, link_video, materia_id)
                VALUES (%s, %s, %s) RETURNING id;
            """, (video.titulo, video.link_video, video.materia_id))
            nova_id = cursor.fetchone()[0]
            conn.commit()
        return {"sucesso": True, "id": nova_id, "mensagem": "Vídeo cadastrado!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{video_id}")
def atualizar_video(video_id: int, video: VideoRequest):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE videos SET
                    titulo = %s,
                    link_video = %s,
                    materia_id = %s
                WHERE id = %s;
            """, (video.titulo, video.link_video, video.materia_id, video_id))
            conn.commit()
            if cursor.rowcount == 0:
                return {"sucesso": False, "mensagem": "Vídeo não encontrado."}
        return {"sucesso": True, "mensagem": "Vídeo atualizado!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{video_id}")
def excluir_video(video_id: int):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM videos WHERE id = %s;", (video_id,))
            conn.commit()
        return {"sucesso": True, "mensagem": "Vídeo removido!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

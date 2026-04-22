"""
routes/sessoes.py — Sessões de estudo + Histórico individual do aluno.
"""

from fastapi import APIRouter, HTTPException
from database import get_conexao
from models import SessaoEstudo

router = APIRouter(prefix="/api", tags=["Sessões"])


@router.post("/sessoes")
def salvar_sessao(sessao: SessaoEstudo):
    try:
        conn = get_conexao()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO sessoes_estudo 
            (nome_aluno, assunto_estudado, questoes_respondidas, taxa_acerto, tempo_gasto_segundos)
            VALUES (%s, %s, %s, %s, %s)
        """,
            (
                sessao.nome_aluno,
                sessao.assunto_estudado,
                sessao.questoes_respondidas,
                sessao.taxa_acerto,
                sessao.tempo_gasto_segundos,
            ),
        )
        conn.commit()
        conn.close()
        return {"status": "Dados salvos com sucesso!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao salvar sessão: {str(e)}")


@router.get("/sessoes/{matricula}")
def obter_historico_aluno(matricula: str):
    """Retorna o histórico completo de sessões de um aluno específico."""
    try:
        conn = get_conexao()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, assunto_estudado, questoes_respondidas, taxa_acerto, 
                   tempo_gasto_segundos, criado_em
            FROM sessoes_estudo 
            WHERE nome_aluno = %s
            ORDER BY criado_em DESC;
        """,
            (matricula,),
        )
        linhas = cursor.fetchall()
        conn.close()

        return [
            {
                "id": int(linha[0]),
                "assunto": linha[1],
                "questoes": int(linha[2]),
                "taxa_acerto": float(linha[3]),
                "tempo_segundos": int(linha[4]),
                "data": linha[5].isoformat() if linha[5] else None,
            }
            for linha in linhas
        ]
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao buscar histórico: {str(e)}"
        )

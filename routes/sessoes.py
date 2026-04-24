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
        with get_conexao() as conn:
            cursor = conn.cursor()
            
            # 1. Salvar a sessão principal
            cursor.execute(
                """
                INSERT INTO sessoes_estudo 
                (nome_aluno, assunto_estudado, questoes_respondidas, taxa_acerto, tempo_gasto_segundos, eh_teste_professor)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id;
                """,
                (
                    sessao.nome_aluno,
                    sessao.assunto_estudado,
                    sessao.questoes_respondidas,
                    sessao.taxa_acerto,
                    sessao.tempo_gasto_segundos,
                    sessao.eh_teste_professor
                ),
            )
            sessao_id = cursor.fetchone()[0]

            # 2. Salvar detalhes e atualizar contadores das questões
            if sessao.lista_detalhes:
                for detalhe in sessao.lista_detalhes:
                    acertou = bool(detalhe.acertou)
                    incremento_acerto = 1 if acertou else 0
                    
                    # Atualiza estatísticas globais da questão
                    cursor.execute(
                        """
                        UPDATE questoes 
                        SET tentativas = tentativas + 1, acertos = acertos + %s 
                        WHERE id = %s
                        """,
                        (incremento_acerto, detalhe.id)
                    )
                    
                    # Vínculo real para o dashboard do professor (FIX #5)
                    cursor.execute(
                        """
                        INSERT INTO sessoes_questoes (sessao_id, questao_id, acertou)
                        VALUES (%s, %s, %s);
                        """,
                        (sessao_id, detalhe.id, acertou)
                    )

            conn.commit()
        return {"status": "Dados salvos com sucesso!", "id": sessao_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao salvar sessão: {str(e)}")


@router.get("/sessoes/{matricula}")
def obter_historico_aluno(matricula: str):
    """Retorna o histórico completo de sessões de um aluno específico."""
    try:
        with get_conexao() as conn:
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

"""
routes/sessoes.py — Sessões de estudo + Histórico individual do aluno.
"""

from fastapi import APIRouter, HTTPException
from database import get_conexao
from models import SessaoEstudo, DetalheQuestaoSessao
from routes.dashboard import invalidate_dashboard_cache
from utils.logger import setup_logger

logger = setup_logger(__name__)

router = APIRouter(prefix="/api", tags=["Sessões"])


@router.post("/sessoes")
def salvar_sessao(sessao: SessaoEstudo):
    try:
        matricula_aluno = (sessao.matricula_aluno or sessao.nome_aluno or "").strip()
        if not matricula_aluno:
            raise HTTPException(status_code=422, detail="matricula_aluno é obrigatória.")

        with get_conexao() as conn:
            cursor = conn.cursor()
            nome_snapshot = sessao.nome_aluno_snapshot
            if not nome_snapshot:
                cursor.execute("SELECT nome FROM usuarios WHERE matricula = %s", (matricula_aluno,))
                row = cursor.fetchone()
                nome_snapshot = row[0] if row else matricula_aluno
            
            # 1. Salvar a sessão principal
            cursor.execute(
                """
                INSERT INTO sessoes_estudo 
                (matricula_aluno, nome_aluno_snapshot, assunto_estudado, questoes_respondidas, taxa_acerto, tempo_gasto_segundos, eh_teste_professor)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id;
                """,
                (
                    matricula_aluno,
                    nome_snapshot,
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
                update_params = []
                insert_params = []

                for detalhe in sessao.lista_detalhes:
                    acertou = bool(detalhe.acertou)
                    incremento_acerto = 1 if acertou else 0
                    update_params.append((incremento_acerto, detalhe.id))
                    
                    # Extrair dados adicionais se disponíveis (novo modelo)
                    tempo_seg = getattr(detalhe, 'tempo_segundos', None)
                    opcao_marcada = getattr(detalhe, 'opcao_marcada', None)
                    insert_params.append((sessao_id, detalhe.id, acertou, tempo_seg, opcao_marcada))

                # Executa atualizações e inserções em lote (bulk)
                if update_params:
                    cursor.executemany(
                        """
                        UPDATE questoes 
                        SET tentativas = tentativas + 1, acertos = acertos + %s 
                        WHERE id = %s
                        """,
                        update_params
                    )

                if insert_params:
                    # Versão nova com tempo_segundos e opcao_marcada
                    cursor.executemany(
                        """
                        INSERT INTO sessoes_questoes (sessao_id, questao_id, acertou, tempo_segundos, opcao_marcada)
                        VALUES (%s, %s, %s, %s, %s);
                        """,
                        insert_params
                    )

            conn.commit()
        invalidate_dashboard_cache()
        return {"status": "Dados salvos com sucesso!", "id": sessao_id}
    except Exception as e:
        logger.exception(f"Erro ao salvar sessão: {e}")
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
                WHERE COALESCE(matricula_aluno, nome_aluno) = %s
                ORDER BY criado_em DESC
                LIMIT 200;
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

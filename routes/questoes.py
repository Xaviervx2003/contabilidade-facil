"""
routes/questoes.py – CRUD completo de questões com suporte a matérias (N:N) e 5 alternativas.
"""

from fastapi import APIRouter, HTTPException
from database import get_conexao
from models import QuestaoRequest, FeedbackRequest

router = APIRouter(prefix="/api", tags=["Questões"])


@router.get("/questoes")
def obter_questoes():
    try:
        conn = get_conexao()
        cursor = conn.cursor()

        # ✅ opcao_e explicitamente no SELECT e no GROUP BY
        cursor.execute("""
            SELECT
                q.id,
                q.enunciado,
                q.opcao_a,
                q.opcao_b,
                q.opcao_c,
                q.opcao_d,
                q.opcao_e,
                q.resposta_correta,
                q.explicacao,
                STRING_AGG(m.nome, ', ' ORDER BY m.nome) AS materias,
                ARRAY_AGG(m.id) FILTER (WHERE m.id IS NOT NULL) AS materia_ids
            FROM questoes q
            LEFT JOIN questoes_materias qm ON q.id = qm.questao_id
            LEFT JOIN materias m           ON qm.materia_id = m.id
            GROUP BY
                q.id, q.enunciado,
                q.opcao_a, q.opcao_b, q.opcao_c, q.opcao_d, q.opcao_e,
                q.resposta_correta, q.explicacao
            ORDER BY q.id ASC;
        """)
        linhas = cursor.fetchall()
        conn.close()

        resultado = []
        for linha in linhas:
            # 0=id  1=enunciado  2=opcao_a  3=opcao_b  4=opcao_c  5=opcao_d
            # 6=opcao_e  7=resposta_correta  8=explicacao  9=materias  10=materia_ids
            opcoes = [linha[2], linha[3], linha[4], linha[5]]
            if linha[6]:  # opcao_e — só adiciona se não for NULL
                opcoes.append(linha[6])

            resultado.append({
                "id":          linha[0],
                "question":    linha[1],
                "options":     opcoes,
                "answer":      linha[7],
                "explicacao":  linha[8] or "",
                "assunto":     linha[9] or "Sem matéria",
                "materia_ids": linha[10] or [],
            })

        return resultado

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar questões: {str(e)}")


@router.post("/questoes")
def criar_questao(questao: QuestaoRequest):
    try:
        conn = get_conexao()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO questoes
                (enunciado, opcao_a, opcao_b, opcao_c, opcao_d, opcao_e,
                 resposta_correta, explicacao)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id;
        """, (
            questao.enunciado,
            questao.opcao_a,
            questao.opcao_b,
            questao.opcao_c,
            questao.opcao_d,
            questao.opcao_e or None,
            questao.resposta_correta,
            questao.explicacao,
        ))
        nova_id = cursor.fetchone()[0]

        if questao.materia_ids:
            valores = ",".join(["(%s,%s)"] * len(questao.materia_ids))
            parametros = []
            for m_id in questao.materia_ids:
                parametros.extend([nova_id, m_id])
            cursor.execute(
                f"INSERT INTO questoes_materias (questao_id, materia_id) VALUES {valores};",
                tuple(parametros)
            )

        conn.commit()
        conn.close()
        return {"sucesso": True, "mensagem": "Questão adicionada!", "id": nova_id}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao salvar: {str(e)}")


@router.put("/questoes/{questao_id}")
def atualizar_questao(questao_id: int, questao: QuestaoRequest):
    try:
        conn = get_conexao()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE questoes SET
                enunciado        = %s,
                opcao_a          = %s,
                opcao_b          = %s,
                opcao_c          = %s,
                opcao_d          = %s,
                opcao_e          = %s,
                resposta_correta = %s,
                explicacao       = %s
            WHERE id = %s;
        """, (
            questao.enunciado,
            questao.opcao_a,
            questao.opcao_b,
            questao.opcao_c,
            questao.opcao_d,
            questao.opcao_e or None,
            questao.resposta_correta,
            questao.explicacao,
            questao_id,
        ))

        cursor.execute(
            "DELETE FROM questoes_materias WHERE questao_id = %s;",
            (questao_id,)
        )
        if questao.materia_ids:
            valores = ",".join(["(%s,%s)"] * len(questao.materia_ids))
            parametros = []
            for m_id in questao.materia_ids:
                parametros.extend([questao_id, m_id])
            cursor.execute(
                f"INSERT INTO questoes_materias (questao_id, materia_id) VALUES {valores};",
                tuple(parametros)
            )

        conn.commit()
        linhas_afetadas = cursor.rowcount
        conn.close()

        if linhas_afetadas > 0:
            return {"sucesso": True, "mensagem": "Questão atualizada com sucesso!"}
        else:
            return {"sucesso": False, "mensagem": "Questão não encontrada."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar questão: {str(e)}")


@router.delete("/questoes/{questao_id}")
def deletar_questao(questao_id: int):
    try:
        conn = get_conexao()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM questoes WHERE id = %s;", (questao_id,))
        conn.commit()
        linhas_afetadas = cursor.rowcount
        conn.close()

        if linhas_afetadas > 0:
            return {"sucesso": True, "mensagem": "Questão excluída com sucesso!"}
        else:
            return {"sucesso": False, "mensagem": "Questão não encontrada."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao excluir questão: {str(e)}")


@router.post("/feedbacks_questoes")
def criar_feedback(feedback: FeedbackRequest):
    try:
        conn = get_conexao()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO feedbacks_questoes
                (questao_id, nome_aluno, texto, marcada_confusa)
            VALUES (%s, %s, %s, %s)
            RETURNING id;
        """, (
            feedback.questao_id,
            feedback.nome_aluno,
            feedback.texto,
            feedback.marcada_confusa,
        ))
        novo_id = cursor.fetchone()[0]
        conn.commit()
        conn.close()
        return {"sucesso": True, "mensagem": "Feedback salvo com sucesso!", "id": novo_id}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao salvar feedback: {str(e)}")


@router.get("/feedbacks_questoes")
def listar_feedbacks():
    try:
        conn = get_conexao()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT
                f.id, f.questao_id, q.enunciado,
                f.nome_aluno, f.texto, f.marcada_confusa, f.data_criacao
            FROM feedbacks_questoes f
            JOIN questoes q ON f.questao_id = q.id
            ORDER BY f.data_criacao DESC;
        """)
        linhas = cursor.fetchall()
        conn.close()

        return [
            {
                "id":                linha[0],
                "questao_id":        linha[1],
                "enunciado_questao": linha[2],
                "nome_aluno":        linha[3],
                "texto":             linha[4],
                "marcada_confusa":   linha[5],
                "data_criacao":      linha[6].strftime("%d/%m/%Y %H:%M") if linha[6] else "",
            }
            for linha in linhas
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar feedbacks: {str(e)}")
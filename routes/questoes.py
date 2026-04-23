"""
routes/questoes.py – CRUD completo de questões com suporte a matérias (N:N) e 5 alternativas.
FASE 1: Suporte a link_video em todas as rotas.
"""

from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from typing import Optional
from database import get_conexao
from models import QuestaoRequest, FeedbackRequest
import csv
import io

router = APIRouter(prefix="/api", tags=["Questões"])


@router.get("/questoes")
def obter_questoes(
    usuario_id: Optional[int] = Query(None),
    materia_id: Optional[int] = Query(None),
):
    try:
        conn = get_conexao()
        cursor = conn.cursor()

        conditions = []
        params = []

        if usuario_id:
            cursor.execute(
                "SELECT papel FROM usuarios WHERE id = %s;", (usuario_id,)
            )
            row = cursor.fetchone()
            if row and row[0] == "professor":
                conditions.append("""
                    q.id IN (
                        SELECT qm2.questao_id
                        FROM questoes_materias qm2
                        JOIN professores_materias pm ON qm2.materia_id = pm.materia_id
                        WHERE pm.usuario_id = %s
                    )
                """)
                params.append(usuario_id)

        if materia_id:
            conditions.append("""
                q.id IN (
                    SELECT qm3.questao_id FROM questoes_materias qm3 WHERE qm3.materia_id = %s
                )
            """)
            params.append(materia_id)

        filtro_where = ""
        if conditions:
            filtro_where = "WHERE " + " AND ".join(conditions)

        # ✅ FASE 1: Inclui q.link_video no SELECT
        cursor.execute(f"""
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
                q.tentativas,
                q.acertos,
                STRING_AGG(m.nome, ', ' ORDER BY m.nome) AS materias,
                ARRAY_AGG(m.id) FILTER (WHERE m.id IS NOT NULL) AS materia_ids,
                COALESCE((
                    SELECT json_agg(json_build_object('nome_aluno', f.nome_aluno, 'texto', f.texto, 'data_criacao', f.data_criacao))
                    FROM feedbacks_questoes f
                    WHERE f.questao_id = q.id AND f.publico = TRUE
                ), '[]'::json) AS comentarios_publicos,
                q.link_video
            FROM questoes q
            LEFT JOIN questoes_materias qm ON q.id = qm.questao_id
            LEFT JOIN materias m           ON qm.materia_id = m.id
            {filtro_where}
            GROUP BY
                q.id, q.enunciado,
                q.opcao_a, q.opcao_b, q.opcao_c, q.opcao_d, q.opcao_e,
                q.resposta_correta, q.explicacao, q.tentativas, q.acertos,
                q.link_video
            ORDER BY q.id ASC;
        """, tuple(params))
        linhas = cursor.fetchall()
        conn.close()

        resultado = []
        for linha in linhas:
            opcoes = [linha[2], linha[3], linha[4], linha[5]]
            if linha[6]:
                opcoes.append(linha[6])

            # ✅ FASE 1: Inclui link_video no mapeamento do retorno (índice 14)
            resultado.append({
                "id":                    linha[0],
                "question":              linha[1],
                "options":               opcoes,
                "answer":                linha[7],
                "explicacao":            linha[8] or "",
                "tentativas":            linha[9] or 0,
                "acertos":               linha[10] or 0,
                "assunto":               linha[11] or "Sem matéria",
                "materia_ids":           linha[12] or [],
                "comentarios_publicos":  linha[13] if linha[13] else [],
                "link_video":            linha[14] or None,
            })

        return resultado

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar questões: {str(e)}")


@router.post("/questoes")
def criar_questao(questao: QuestaoRequest):
    try:
        conn = get_conexao()
        cursor = conn.cursor()

        # ✅ FASE 1: Inclui link_video no INSERT
        cursor.execute("""
            INSERT INTO questoes
                (enunciado, opcao_a, opcao_b, opcao_c, opcao_d, opcao_e,
                 resposta_correta, explicacao, link_video)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
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
            questao.link_video or None,
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

        # ✅ FASE 1: Inclui link_video no UPDATE
        cursor.execute("""
            UPDATE questoes SET
                enunciado        = %s,
                opcao_a          = %s,
                opcao_b          = %s,
                opcao_c          = %s,
                opcao_d          = %s,
                opcao_e          = %s,
                resposta_correta = %s,
                explicacao       = %s,
                link_video       = %s
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
            questao.link_video or None,
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
def listar_feedbacks(status: Optional[str] = Query(None), busca: Optional[str] = Query(None)):
    """Lista feedbacks com filtro por status (pendente/resolvido) e busca textual."""
    try:
        conn = get_conexao()
        cursor = conn.cursor()

        conditions = []
        params = []

        if status == "pendente":
            conditions.append("f.resolvido = FALSE")
        elif status == "resolvido":
            conditions.append("f.resolvido = TRUE")

        if busca:
            conditions.append("(LOWER(f.nome_aluno) LIKE %s OR LOWER(f.texto) LIKE %s OR LOWER(q.enunciado) LIKE %s)")
            termo = f"%{busca.lower()}%"
            params.extend([termo, termo, termo])

        filtro = ""
        if conditions:
            filtro = "WHERE " + " AND ".join(conditions)

        cursor.execute(f"""
            SELECT
                f.id, f.questao_id, q.enunciado,
                f.nome_aluno, f.texto, f.marcada_confusa,
                f.data_criacao, f.resolvido, f.resolvido_em, f.publico,
                f.resposta_professor,
                (SELECT COUNT(*) FROM feedbacks_questoes f2 WHERE f2.questao_id = f.questao_id AND f2.resolvido = FALSE) as impacto
            FROM feedbacks_questoes f
            JOIN questoes q ON f.questao_id = q.id
            {filtro}
            ORDER BY f.resolvido ASC, impacto DESC, f.data_criacao DESC;
        """, tuple(params))
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
                "resolvido":         linha[7],
                "resolvido_em":      linha[8].strftime("%d/%m/%Y %H:%M") if linha[8] else None,
                "publico":           linha[9],
                "resposta_professor": linha[10] or "",
                "impacto":           linha[11] or 0,
            }
            for linha in linhas
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar feedbacks: {str(e)}")


@router.get("/feedbacks_questoes/contagem")
def contar_feedbacks_pendentes():
    """Retorna contagem de feedbacks pendentes para badges no menu."""
    try:
        conn = get_conexao()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM feedbacks_questoes WHERE resolvido = FALSE;")
        total = cursor.fetchone()[0]
        conn.close()
        return {"pendentes": total}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/feedbacks_questoes/{feedback_id}/resolver")
def resolver_feedback(feedback_id: int):
    """Marca um feedback como resolvido sem deletar o registro."""
    try:
        conn = get_conexao()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE feedbacks_questoes
            SET resolvido = TRUE, resolvido_em = NOW()
            WHERE id = %s;
        """, (feedback_id,))
        conn.commit()
        afetadas = cursor.rowcount
        conn.close()
        if afetadas > 0:
            return {"sucesso": True, "mensagem": "Feedback marcado como resolvido!"}
        return {"sucesso": False, "mensagem": "Feedback nao encontrado."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/feedbacks_questoes/{feedback_id}/responder")
def responder_feedback(feedback_id: int, dados: dict):
    """Permite ao professor enviar uma resposta ao feedback do aluno."""
    try:
        resposta = dados.get("resposta_professor", "")
        conn = get_conexao()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE feedbacks_questoes
            SET resposta_professor = %s, resolvido = TRUE, resolvido_em = NOW()
            WHERE id = %s;
        """, (resposta, feedback_id))
        conn.commit()
        conn.close()
        return {"sucesso": True, "mensagem": "Resposta enviada e feedback marcado como resolvido!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/feedbacks_questoes/{feedback_id}/publicar")
def alternar_publicacao_feedback(feedback_id: int):
    """Alterna o status de publicação (publico = NOT publico) de um comentário."""
    try:
        conn = get_conexao()
        cursor = conn.cursor()

        cursor.execute("SELECT publico FROM feedbacks_questoes WHERE id = %s;", (feedback_id,))
        row = cursor.fetchone()
        if not row:
            return {"sucesso": False, "mensagem": "Feedback nao encontrado."}

        novo_status = not row[0]

        cursor.execute("""
            UPDATE feedbacks_questoes
            SET publico = %s
            WHERE id = %s;
        """, (novo_status, feedback_id))
        conn.commit()
        conn.close()
        return {
            "sucesso": True,
            "mensagem": f"Comentário {'publicado' if novo_status else 'ocultado'} com sucesso!",
            "publico": novo_status
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/questoes/importar-csv")
async def importar_csv(arquivo: UploadFile = File(...)):
    """
    Importa questões em massa via CSV.
    Colunas esperadas: enunciado,opcao_a,opcao_b,opcao_c,opcao_d,opcao_e,resposta_correta,explicacao,link_video
    opcao_e, explicacao e link_video são opcionais.
    """
    if not arquivo.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Envie um arquivo .csv")

    try:
        conteudo = await arquivo.read()
        texto = conteudo.decode("utf-8-sig")
        leitor = csv.DictReader(io.StringIO(texto), delimiter=";")

        campos = leitor.fieldnames or []
        campos_lower = [c.strip().lower() for c in campos]
        if "enunciado" not in campos_lower:
            leitor = csv.DictReader(io.StringIO(texto), delimiter=",")
            campos = leitor.fieldnames or []
            campos_lower = [c.strip().lower() for c in campos]

        obrigatorios = {"enunciado", "opcao_a", "opcao_b", "opcao_c", "opcao_d", "resposta_correta"}
        if not obrigatorios.issubset(set(campos_lower)):
            faltando = obrigatorios - set(campos_lower)
            raise HTTPException(
                status_code=400,
                detail=f"Colunas faltando no CSV: {', '.join(faltando)}. Colunas encontradas: {', '.join(campos)}"
            )

        conn = get_conexao()
        cursor = conn.cursor()
        importadas = 0
        erros = []

        for i, row in enumerate(leitor, start=2):
            row_clean = {k.strip().lower(): (v.strip() if v else "") for k, v in row.items()}
            enunciado = row_clean.get("enunciado", "")
            if not enunciado:
                erros.append(f"Linha {i}: enunciado vazio, pulada.")
                continue

            opcao_e   = row_clean.get("opcao_e") or None
            explicacao = row_clean.get("explicacao") or None
            resposta   = row_clean.get("resposta_correta", "A").upper()
            # ✅ FASE 1: Lê a coluna link_video do CSV (opcional)
            link_video = row_clean.get("link_video") or None

            try:
                # ✅ FASE 1: Inclui link_video no INSERT do importador
                cursor.execute("""
                    INSERT INTO questoes
                        (enunciado, opcao_a, opcao_b, opcao_c, opcao_d, opcao_e,
                         resposta_correta, explicacao, link_video)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id;
                """, (
                    enunciado,
                    row_clean.get("opcao_a", ""),
                    row_clean.get("opcao_b", ""),
                    row_clean.get("opcao_c", ""),
                    row_clean.get("opcao_d", ""),
                    opcao_e,
                    resposta,
                    explicacao,
                    link_video,
                ))
                nova_id = cursor.fetchone()[0]

                materia_nome = row_clean.get("materia", "").strip()
                if materia_nome:
                    cursor.execute(
                        "SELECT id FROM materias WHERE LOWER(nome) = LOWER(%s);",
                        (materia_nome,)
                    )
                    mat_row = cursor.fetchone()
                    if mat_row:
                        cursor.execute(
                            "INSERT INTO questoes_materias (questao_id, materia_id) VALUES (%s, %s);",
                            (nova_id, mat_row[0])
                        )

                importadas += 1
            except Exception as row_err:
                erros.append(f"Linha {i}: {str(row_err)}")

        conn.commit()
        conn.close()

        return {
            "sucesso": True,
            "importadas": importadas,
            "erros": erros,
            "mensagem": f"{importadas} questões importadas com sucesso." + (f" {len(erros)} erros." if erros else ""),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao processar CSV: {str(e)}")

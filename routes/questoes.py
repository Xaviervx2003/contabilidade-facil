"""
routes/questoes.py – CRUD completo de questões usando o QuestaoRepository.
"""
from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Request, Depends
from typing import Optional, List
from models import QuestaoRequest, FeedbackRequest
import csv
import io
from utils.logger import setup_logger
from utils.responses import api_response
from utils.rate_limit import rate_limiter
from utils.jwt_auth import verificar_admin_ou_professor, verificar_admin, usuario_autenticado
from routes.dashboard import invalidate_dashboard_cache
from repositories.questao_repository import QuestaoRepository
from database import get_conexao

logger = setup_logger(__name__)

router = APIRouter(prefix="/api", tags=["Questões"])


@router.get("/questoes/valores-unicos")
def obter_valores_unicos():
    try:
        dados = QuestaoRepository.obter_valores_unicos()
        return dados
    except Exception as e:
        logger.error(f"Erro ao obter valores únicos: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar filtros.")


@router.get("/filtros/questoes")
def obter_filtros_questoes():
    try:
        dados = QuestaoRepository.obter_valores_unicos()
        # Mapeamento para o formato do legacy
        filtros = {
            'bancas': dados['bancas'],
            'orgaos': dados['orgaos'],
            'cargos': dados['cargos'],
            'anos': dados['anos'],
            'escolaridades': dados['escolaridades'],
            'dificuldades': dados['dificuldades']
        }
        return api_response(sucesso=True, dados=filtros)
    except Exception as e:
        logger.exception("Erro ao carregar filtros")
        return api_response(sucesso=False, mensagem="Erro ao carregar filtros.", status_code=500)


@router.get("/questoes")
def obter_questoes(
    # Filtros extraídos pelo router e repassados pro Repository
    usuario_id: Optional[int] = Query(None),
    materia_id: Optional[List[int]] = Query(None),
    ids: Optional[List[int]] = Query(None, description="Filtrar por IDs específicos"),
    limit: Optional[int] = Query(None, ge=1, le=500),
    matricula: Optional[str] = Query(None),
    modo_estudo: Optional[str] = Query("todas"),
    banca: Optional[str] = Query(None),
    orgao: Optional[str] = Query(None),
    cargo: Optional[str] = Query(None),
    ano: Optional[int] = Query(None),
    escolaridade: Optional[str] = Query(None),
    page: Optional[int] = Query(None, ge=1),
    per_page: Optional[int] = Query(None, ge=1, le=100),
    busca: Optional[str] = Query(None),
    apenas_videos: Optional[bool] = Query(False),
    dificuldade: Optional[str] = Query(None),
    cursor_id: Optional[int] = Query(None, ge=0),
    token_data: dict = Depends(usuario_autenticado)
):
    try:
        # Pega a role (papel) de dentro do token extraído pelo Depends(usuario_autenticado)
        papel = token_data.get("papel", "aluno")
        uid = token_data.get("id")

        resultado = QuestaoRepository.listar(
            usuario_id=uid,
            papel=papel,
            materia_id=materia_id,
            ids=ids,
            limit=limit,
            matricula=matricula,
            modo_estudo=modo_estudo,
            banca=banca,
            orgao=orgao,
            cargo=cargo,
            ano=ano,
            escolaridade=escolaridade,
            page=page,
            per_page=per_page,
            busca=busca,
            apenas_videos=apenas_videos,
            dificuldade=dificuldade,
            cursor_id=cursor_id,
        )
        return api_response(sucesso=True, dados=resultado if page else resultado.get("data"))
    except Exception as e:
        logger.exception("Erro crítico ao obter questões")
        return api_response(sucesso=False, mensagem="Erro ao carregar questões.", status_code=500)


@router.post("/questoes")
def criar_questao(questao: QuestaoRequest, token_data: dict = Depends(verificar_admin_ou_professor)):
    try:
        nova_id = QuestaoRepository.criar(questao.model_dump(), questao.materia_ids)
        invalidate_dashboard_cache()
        return {"sucesso": True, "mensagem": "Questão adicionada!", "id": nova_id}
    except Exception as e:
        logger.exception("Erro ao criar questão")
        raise HTTPException(status_code=500, detail=f"Erro ao salvar: {str(e)}")


@router.put("/questoes/{questao_id}")
def atualizar_questao(questao_id: int, questao: QuestaoRequest, token_data: dict = Depends(verificar_admin_ou_professor)):
    try:
        sucesso = QuestaoRepository.atualizar(questao_id, questao.model_dump(), questao.materia_ids)
        invalidate_dashboard_cache()
        if sucesso:
            return {"sucesso": True, "mensagem": "Questão atualizada com sucesso!"}
        return {"sucesso": False, "mensagem": "Questão não encontrada."}
    except Exception as e:
        logger.exception(f"Erro ao atualizar questão {questao_id}")
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar: {str(e)}")


@router.delete("/questoes/{questao_id}")
def deletar_questao(questao_id: int, token_data: dict = Depends(verificar_admin)):
    try:
        sucesso = QuestaoRepository.deletar(questao_id)
        invalidate_dashboard_cache()
        if sucesso:
            return {"sucesso": True, "mensagem": "Questão excluída com sucesso!"}
        return {"sucesso": False, "mensagem": "Questão não encontrada."}
    except Exception as e:
        logger.exception(f"Erro ao excluir questão {questao_id}")
        raise HTTPException(status_code=500, detail=f"Erro ao excluir: {str(e)}")


@router.post("/feedbacks_questoes")
def criar_feedback(feedback: FeedbackRequest):
    try:
        novo_id = QuestaoRepository.criar_feedback(feedback.questao_id, feedback.nome_aluno, feedback.texto, feedback.marcada_confusa)
        invalidate_dashboard_cache()
        return {"sucesso": True, "mensagem": "Feedback salvo com sucesso!", "id": novo_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao salvar feedback: {str(e)}")


@router.get("/feedbacks_questoes")
def listar_feedbacks(
    status: Optional[str] = Query(None),
    busca: Optional[str] = Query(None),
    page: Optional[int] = Query(None, ge=1),
    per_page: Optional[int] = Query(None, ge=1, le=100),
):
    try:
        return QuestaoRepository.listar_feedbacks(status, busca, page, per_page)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar feedbacks: {str(e)}")


@router.get("/feedbacks_questoes/contagem")
def contar_feedbacks_pendentes():
    try:
        total = QuestaoRepository.contar_feedbacks_pendentes()
        return {"pendentes": total}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/feedbacks_questoes/{feedback_id}")
def deletar_feedback(feedback_id: int):
    try:
        sucesso = QuestaoRepository.deletar_feedback(feedback_id)
        invalidate_dashboard_cache()
        if sucesso:
            return {"sucesso": True, "mensagem": "Feedback deletado com sucesso!"}
        return {"sucesso": False, "mensagem": "Feedback nao encontrado."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/feedbacks_questoes/{feedback_id}/resolver")
def resolver_feedback(feedback_id: int):
    try:
        sucesso = QuestaoRepository.resolver_feedback(feedback_id)
        invalidate_dashboard_cache()
        if sucesso:
            return {"sucesso": True, "mensagem": "Feedback marcado como resolvido!"}
        return {"sucesso": False, "mensagem": "Feedback nao encontrado."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/feedbacks_questoes/{feedback_id}/responder")
def responder_feedback(feedback_id: int, dados: dict):
    try:
        resposta = dados.get("resposta_professor", "")
        sucesso = QuestaoRepository.responder_feedback(feedback_id, resposta)
        invalidate_dashboard_cache()
        if sucesso:
            return {"sucesso": True, "mensagem": "Resposta enviada e feedback resolvido!"}
        return {"sucesso": False, "mensagem": "Feedback não encontrado."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/feedbacks_questoes/{feedback_id}/publicar")
def alternar_publicacao_feedback(feedback_id: int):
    try:
        novo_status = QuestaoRepository.alternar_publicacao_feedback(feedback_id)
        invalidate_dashboard_cache()
        if novo_status is not None:
            return {"sucesso": True, "mensagem": f"Comentário {'publicado' if novo_status else 'ocultado'} com sucesso!", "publico": novo_status}
        return {"sucesso": False, "mensagem": "Feedback nao encontrado."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/questoes/importar-csv")
async def importar_csv(request: Request, arquivo: UploadFile = File(...), token_data: dict = Depends(verificar_admin_ou_professor)):
    """
    Importa questões em massa via CSV.
    Loop de parsing mantido no Router, persistência via query raw.
    (Como o parsing já é bem específico e trata IDs de matérias na string, é mais seguro manter aqui por enquanto).
    """
    if not arquivo.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Envie um arquivo .csv")

    try:
        host = request.client.host if request.client else "unknown"
        rate_key = f"import_csv:{host}"
        allowed, retry_after = rate_limiter.allow(rate_key, limit=5, window_seconds=300)
        if not allowed:
            raise HTTPException(status_code=429, detail=f"Muitos uploads. Tente novamente em {retry_after}s.")

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
                detail=f"Colunas faltando no CSV: {', '.join(faltando)}. Encontradas: {', '.join(campos)}"
            )

        with get_conexao() as conn:
            cursor = conn.cursor()
            importadas = 0
            erros = []

            for i, row in enumerate(leitor, start=2):
                row_clean = {k.strip().lower(): (v.strip() if v else "") for k, v in row.items()}
                enunciado = row_clean.get("enunciado", "")
                if not enunciado:
                    erros.append(f"Linha {i}: enunciado vazio, pulada.")
                    continue

                try:
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
                        row_clean.get("opcao_e") or None,
                        row_clean.get("resposta_correta", "A").upper(),
                        row_clean.get("explicacao") or None,
                        row_clean.get("link_video") or None,
                    ))
                    nova_id = cursor.fetchone()[0]

                    materia_nome = row_clean.get("materia", "").strip()
                    if materia_nome:
                        cursor.execute("SELECT id FROM materias WHERE LOWER(nome) = LOWER(%s);", (materia_nome,))
                        mat_row = cursor.fetchone()
                        if mat_row:
                            cursor.execute("INSERT INTO questoes_materias (questao_id, materia_id) VALUES (%s, %s);", (nova_id, mat_row[0]))

                    importadas += 1
                except Exception as row_err:
                    erros.append(f"Linha {i}: {str(row_err)}")

            conn.commit()
        invalidate_dashboard_cache()

        return {
            "sucesso": True,
            "importadas": importadas,
            "erros": erros,
            "mensagem": f"{importadas} questões importadas com sucesso." + (f" {len(erros)} erros." if erros else ""),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Erro ao importar CSV")
        raise HTTPException(status_code=500, detail=f"Erro ao processar CSV: {str(e)}")

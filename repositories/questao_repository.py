"""
repositories/questao_repository.py
Isola todas as regras de banco de dados para Questões e Feedbacks.
"""
from typing import Optional, List, Dict, Any
from database import get_conexao
from utils.logger import setup_logger

logger = setup_logger(__name__)

class QuestaoRepository:

    @staticmethod
    def obter_valores_unicos() -> Dict[str, List[Any]]:
        """Retorna listas de valores únicos para preencher dropdowns de filtro."""
        with get_conexao() as conn:
            cursor = conn.cursor()
            
            cursor.execute("SELECT DISTINCT banca FROM questoes WHERE banca IS NOT NULL AND banca != '' ORDER BY banca;")
            bancas = [r[0] for r in cursor.fetchall()]
            
            cursor.execute("SELECT DISTINCT orgao FROM questoes WHERE orgao IS NOT NULL AND orgao != '' ORDER BY orgao;")
            orgaos = [r[0] for r in cursor.fetchall()]
            
            cursor.execute("SELECT DISTINCT cargo FROM questoes WHERE cargo IS NOT NULL AND cargo != '' ORDER BY cargo;")
            cargos = [r[0] for r in cursor.fetchall()]
            
            cursor.execute("SELECT DISTINCT ano FROM questoes WHERE ano IS NOT NULL ORDER BY ano DESC;")
            anos = [r[0] for r in cursor.fetchall()]
            
            cursor.execute("SELECT DISTINCT escolaridade FROM questoes WHERE escolaridade IS NOT NULL ORDER BY escolaridade;")
            escolaridades = [r[0] for r in cursor.fetchall()]
            
            cursor.execute("SELECT DISTINCT dificuldade FROM questoes WHERE dificuldade IS NOT NULL ORDER BY dificuldade;")
            dificuldades = [r[0] for r in cursor.fetchall()]
            
        return {
            "bancas": bancas,
            "orgaos": orgaos,
            "cargos": cargos,
            "anos": anos,
            "escolaridades": escolaridades,
            "dificuldades": dificuldades
        }

    @staticmethod
    def listar(
        usuario_id: Optional[int] = None,
        papel: Optional[str] = None,
        materia_id: Optional[List[int]] = None,
        ids: Optional[List[int]] = None,
        limit: Optional[int] = None,
        matricula: Optional[str] = None,
        modo_estudo: str = "todas",
        banca: Optional[str] = None,
        orgao: Optional[str] = None,
        cargo: Optional[str] = None,
        ano: Optional[int] = None,
        escolaridade: Optional[str] = None,
        page: Optional[int] = None,
        per_page: Optional[int] = None,
        busca: Optional[str] = None,
        apenas_videos: bool = False,
        dificuldade: Optional[str] = None,
        cursor_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Lista questões suportando múltiplos filtros complexos.
        Se papel == 'admin', vê tudo.
        Se papel == 'professor', vê apenas questões de matérias vinculadas.
        """
        with get_conexao() as conn:
            cursor = conn.cursor()

            conditions = []
            params = []

            # ── 1. REGRA DE VISIBILIDADE (ADMIN VS PROFESSOR) ──
            # Se for admin, a condition de restrição não é adicionada (vê tudo).
            if papel == "professor" and usuario_id:
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
                        WITH RECURSIVE sub_materias AS (
                            SELECT id FROM materias WHERE id = ANY(%s)
                            UNION ALL
                            SELECT m.id FROM materias m
                            JOIN sub_materias sm ON m.parent_id = sm.id
                        )
                        SELECT qm3.questao_id 
                        FROM questoes_materias qm3 
                        WHERE qm3.materia_id IN (SELECT id FROM sub_materias)
                    )
                """)
                params.append(materia_id)

            if ids:
                conditions.append("q.id = ANY(%s)")
                params.append(ids)

            if matricula:
                if modo_estudo == "nao_respondidas":
                    conditions.append("""
                        q.id NOT IN (
                            SELECT sq.questao_id 
                            FROM sessoes_questoes sq
                            JOIN sessoes_estudo se ON sq.sessao_id = se.id
                            WHERE COALESCE(se.matricula_aluno, se.nome_aluno) = %s
                        )
                    """)
                    params.append(matricula)
                elif modo_estudo == "erros":
                    conditions.append("""
                        q.id IN (
                            SELECT sq.questao_id 
                            FROM sessoes_questoes sq
                            JOIN sessoes_estudo se ON sq.sessao_id = se.id
                            WHERE COALESCE(se.matricula_aluno, se.nome_aluno) = %s AND sq.acertou = FALSE
                        )
                    """)
                    params.append(matricula)

            if banca:
                conditions.append("q.banca ILIKE %s")
                params.append(f"%{banca}%")
            if orgao:
                conditions.append("q.orgao ILIKE %s")
                params.append(f"%{orgao}%")
            if cargo:
                conditions.append("q.cargo ILIKE %s")
                params.append(f"%{cargo}%")
            if ano:
                conditions.append("q.ano = %s")
                params.append(ano)
            if escolaridade:
                conditions.append("q.escolaridade ILIKE %s")
                params.append(f"%{escolaridade}%")

            if busca and busca.strip():
                conditions.append("""
                    (q.enunciado ILIKE %s OR EXISTS (
                        SELECT 1 FROM questoes_materias qm_busca
                        JOIN materias m_busca ON qm_busca.materia_id = m_busca.id
                        WHERE qm_busca.questao_id = q.id AND m_busca.nome ILIKE %s
                    ) OR CAST(q.id AS TEXT) = %s)
                """)
                termo_busca = f"%{busca.strip()}%"
                params.extend([termo_busca, termo_busca, busca.strip()])

            if apenas_videos:
                conditions.append("q.link_video IS NOT NULL AND q.link_video != ''")
            if dificuldade:
                conditions.append("q.dificuldade = %s")
                params.append(dificuldade)
            if cursor_id is not None:
                conditions.append("q.id > %s")
                params.append(cursor_id)

            filtro_where = ""
            if conditions:
                filtro_where = "WHERE " + " AND ".join(conditions)

            use_pagination = page is not None
            total = 0
            if use_pagination:
                pg = page or 1
                pp = per_page or 20
                cursor.execute(f"SELECT COUNT(*) FROM questoes q {filtro_where};", tuple(params))
                total = cursor.fetchone()[0]
                offset = (pg - 1) * pp
                limite_sql = f"LIMIT {pp} OFFSET {offset}"
            else:
                limite_efetivo = int(limit) if limit is not None else 500
                limite_sql = f"LIMIT {limite_efetivo}"

            cursor.execute(f"""
                WITH feedbacks_agrupados AS (
                    SELECT 
                        questao_id,
                        json_agg(json_build_object(
                            'nome_aluno', nome_aluno, 
                            'texto', texto, 
                            'data_criacao', data_criacao,
                            'resposta_professor', resposta_professor
                        )) as comentarios
                    FROM feedbacks_questoes
                    WHERE publico = TRUE
                    GROUP BY questao_id
                ),
                materias_agrupadas AS (
                    SELECT
                        qm.questao_id,
                        STRING_AGG(m.nome, ', ' ORDER BY m.nome) AS materias,
                        ARRAY_AGG(m.id) FILTER (WHERE m.id IS NOT NULL) AS materia_ids
                    FROM questoes_materias qm
                    JOIN materias m ON qm.materia_id = m.id
                    GROUP BY qm.questao_id
                )
                SELECT
                    q.id, q.enunciado, q.opcao_a, q.opcao_b, q.opcao_c, q.opcao_d, q.opcao_e,
                    q.resposta_correta, q.explicacao, q.tentativas, q.acertos,
                    ma.materias, ma.materia_ids, COALESCE(fa.comentarios, '[]'::json) AS comentarios_publicos,
                    q.link_video, q.banca, q.orgao, q.cargo, q.ano, q.escolaridade, q.modalidade, q.dificuldade
                FROM questoes q
                LEFT JOIN materias_agrupadas ma ON ma.questao_id = q.id
                LEFT JOIN feedbacks_agrupados fa ON fa.questao_id = q.id
                {filtro_where}
                ORDER BY q.id ASC
                {limite_sql};
            """, tuple(params))
            linhas = cursor.fetchall()

        resultado = []
        for linha in linhas:
            opcoes = [linha[2], linha[3], linha[4], linha[5]]
            if linha[6]:
                opcoes.append(linha[6])

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
                "banca":                 linha[15] or None,
                "orgao":                 linha[16] or None,
                "cargo":                 linha[17] or None,
                "ano":                   linha[18] or None,
                "escolaridade":          linha[19] or None,
                "modalidade":            linha[20] or None,
                "dificuldade":           linha[21] or None,
            })

        if use_pagination:
            return {
                "data": resultado,
                "total": total,
                "page": pg,
                "per_page": pp,
                "total_pages": -(-total // pp) if pp else 0
            }
        return {"data": resultado, "total": len(resultado)}

    @staticmethod
    def criar(dados: dict, materia_ids: List[int]) -> int:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO questoes
                    (enunciado, opcao_a, opcao_b, opcao_c, opcao_d, opcao_e,
                     resposta_correta, explicacao, link_video, banca, orgao, cargo, ano, escolaridade, modalidade, dificuldade)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id;
            """, (
                dados.get("enunciado"), dados.get("opcao_a"), dados.get("opcao_b"),
                dados.get("opcao_c"), dados.get("opcao_d"), dados.get("opcao_e"),
                dados.get("resposta_correta"), dados.get("explicacao"), dados.get("link_video"),
                dados.get("banca"), dados.get("orgao"), dados.get("cargo"),
                dados.get("ano"), dados.get("escolaridade"), dados.get("modalidade"), dados.get("dificuldade")
            ))
            nova_id = cursor.fetchone()[0]

            if materia_ids:
                valores = ",".join(["(%s,%s)"] * len(materia_ids))
                parametros = []
                for m_id in materia_ids:
                    parametros.extend([nova_id, m_id])
                cursor.execute(f"INSERT INTO questoes_materias (questao_id, materia_id) VALUES {valores};", tuple(parametros))
            
            conn.commit()
            return nova_id

    @staticmethod
    def atualizar(questao_id: int, dados: dict, materia_ids: List[int]) -> bool:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE questoes SET
                    enunciado = %s, opcao_a = %s, opcao_b = %s, opcao_c = %s, opcao_d = %s, opcao_e = %s,
                    resposta_correta = %s, explicacao = %s, link_video = %s, banca = %s, orgao = %s,
                    cargo = %s, ano = %s, escolaridade = %s, modalidade = %s, dificuldade = %s
                WHERE id = %s;
            """, (
                dados.get("enunciado"), dados.get("opcao_a"), dados.get("opcao_b"),
                dados.get("opcao_c"), dados.get("opcao_d"), dados.get("opcao_e"),
                dados.get("resposta_correta"), dados.get("explicacao"), dados.get("link_video"),
                dados.get("banca"), dados.get("orgao"), dados.get("cargo"),
                dados.get("ano"), dados.get("escolaridade"), dados.get("modalidade"), dados.get("dificuldade"),
                questao_id
            ))
            
            cursor.execute("DELETE FROM questoes_materias WHERE questao_id = %s;", (questao_id,))
            if materia_ids:
                valores = ",".join(["(%s,%s)"] * len(materia_ids))
                parametros = []
                for m_id in materia_ids:
                    parametros.extend([questao_id, m_id])
                cursor.execute(f"INSERT INTO questoes_materias (questao_id, materia_id) VALUES {valores};", tuple(parametros))
                
            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def deletar(questao_id: int) -> bool:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM questoes WHERE id = %s;", (questao_id,))
            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def criar_feedback(questao_id: int, nome_aluno: str, texto: str, marcada_confusa: bool) -> int:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO feedbacks_questoes (questao_id, nome_aluno, texto, marcada_confusa)
                VALUES (%s, %s, %s, %s) RETURNING id;
            """, (questao_id, nome_aluno, texto, marcada_confusa))
            novo_id = cursor.fetchone()[0]
            conn.commit()
            return novo_id

    @staticmethod
    def deletar_feedback(feedback_id: int) -> bool:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM feedbacks_questoes WHERE id = %s;", (feedback_id,))
            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def listar_feedbacks(status: Optional[str] = None, busca: Optional[str] = None, page: Optional[int] = None, per_page: Optional[int] = None, usuario_id: Optional[int] = None, papel: Optional[str] = None) -> Dict[str, Any]:
        with get_conexao() as conn:
            cursor = conn.cursor()
            conditions = []
            params = []

            if papel == "professor" and usuario_id:
                conditions.append("q.criado_por = %s")
                params.append(usuario_id)

            if status == "pendente":
                conditions.append("f.resolvido = FALSE")
            elif status == "resolvido":
                conditions.append("f.resolvido = TRUE")

            if busca:
                conditions.append("(LOWER(f.nome_aluno) LIKE %s OR LOWER(f.texto) LIKE %s OR LOWER(q.enunciado) LIKE %s)")
                termo = f"%{busca.lower()}%"
                params.extend([termo, termo, termo])

            filtro = "WHERE " + " AND ".join(conditions) if conditions else ""
            use_pagination = page is not None
            total = 0
            
            if use_pagination:
                pg = page or 1
                pp = per_page or 20
                cursor.execute(f"SELECT COUNT(*) FROM feedbacks_questoes f JOIN questoes q ON f.questao_id = q.id {filtro}", tuple(params))
                total = cursor.fetchone()[0] or 0
                offset = (pg - 1) * pp
                limit_sql = "LIMIT %s OFFSET %s"
                params_query = tuple(params + [pp, offset])
            else:
                limit_sql = ""
                params_query = tuple(params)

            cursor.execute(f"""
                SELECT
                    f.id, f.questao_id, q.enunciado, f.nome_aluno, f.texto, f.marcada_confusa,
                    f.data_criacao, f.resolvido, f.resolvido_em, f.publico, f.resposta_professor,
                    (SELECT COUNT(*) FROM feedbacks_questoes f2 WHERE f2.questao_id = f.questao_id AND f2.resolvido = FALSE) as impacto
                FROM feedbacks_questoes f
                JOIN questoes q ON f.questao_id = q.id
                {filtro}
                ORDER BY f.resolvido ASC, impacto DESC, f.data_criacao DESC
                {limit_sql};
            """, params_query)
            linhas = cursor.fetchall()

        dados = [{
            "id": l[0], "questao_id": l[1], "enunciado_questao": l[2], "nome_aluno": l[3],
            "texto": l[4], "marcada_confusa": l[5],
            "data_criacao": l[6].strftime("%d/%m/%Y %H:%M") if l[6] else "",
            "resolvido": l[7],
            "resolvido_em": l[8].strftime("%d/%m/%Y %H:%M") if l[8] else None,
            "publico": l[9], "resposta_professor": l[10] or "", "impacto": l[11] or 0
        } for l in linhas]

        if use_pagination:
            return {"data": dados, "total": int(total), "page": int(pg), "per_page": int(pp), "total_pages": -(-int(total) // int(pp)) if pp else 0}
        return {"data": dados}

    @staticmethod
    def contar_feedbacks_pendentes() -> int:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM feedbacks_questoes WHERE resolvido = FALSE;")
            return cursor.fetchone()[0]

    @staticmethod
    def resolver_feedback(feedback_id: int) -> bool:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE feedbacks_questoes SET resolvido = TRUE, resolvido_em = NOW() WHERE id = %s;", (feedback_id,))
            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def responder_feedback(feedback_id: int, resposta: str) -> bool:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE feedbacks_questoes SET resposta_professor = %s, resolvido = TRUE, resolvido_em = NOW() WHERE id = %s;", (resposta, feedback_id))
            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def alternar_publicacao_feedback(feedback_id: int) -> Optional[bool]:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT publico FROM feedbacks_questoes WHERE id = %s;", (feedback_id,))
            row = cursor.fetchone()
            if not row: return None
            novo_status = not row[0]
            cursor.execute("UPDATE feedbacks_questoes SET publico = %s WHERE id = %s;", (novo_status, feedback_id))
            conn.commit()
            return novo_status

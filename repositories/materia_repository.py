"""
repositories/materia_repository.py
Centraliza TODAS as operações de banco de dados para o ecossistema de Matérias:
  - materias
  - questoes_materias
  - solicitacoes_reorganizacao
"""

from database import get_conexao


class MateriaRepository:

    # ──────────────────────────────────────────────────────────────
    # CRUD BÁSICO
    # ──────────────────────────────────────────────────────────────

    @staticmethod
    def criar(nome: str, parent_id: int | None, id_externo: str | None) -> int:
        """Cria uma nova matéria e retorna seu ID."""
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO materias (nome, parent_id, id_externo) VALUES (%s, %s, %s) RETURNING id;",
                (nome, parent_id, id_externo)
            )
            novo_id = cursor.fetchone()[0]
            conn.commit()
        return novo_id

    @staticmethod
    def listar_todas() -> list[dict]:
        """Retorna todas as matérias em formato flat com contagem de questões."""
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT m.id, m.nome, m.parent_id, m.id_externo, m.indice, COUNT(qm.questao_id) AS total_questoes
                FROM materias m
                LEFT JOIN questoes_materias qm ON m.id = qm.materia_id
                GROUP BY m.id, m.nome, m.parent_id, m.id_externo, m.indice
                ORDER BY m.indice ASC NULLS LAST, m.nome ASC;
            """)
            linhas = cursor.fetchall()
        return [
            {"id": l[0], "nome": l[1], "parent_id": l[2], "id_externo": l[3], "indice": l[4], "total_questoes": l[5]}
            for l in linhas
        ]

    @staticmethod
    def listar_arvore(esconder_vazias: bool = False) -> list[dict]:
        """Retorna as matérias raiz (sem parent) com flag de filhos."""
        query = """
            SELECT m.id, m.nome, m.indice,
                   COUNT(qm.questao_id) AS total_questoes,
                   EXISTS(SELECT 1 FROM materias child WHERE child.parent_id = m.id) AS tem_filhos
            FROM materias m
            LEFT JOIN questoes_materias qm ON m.id = qm.materia_id
            WHERE m.parent_id IS NULL
            GROUP BY m.id, m.nome, m.indice
        """
        if esconder_vazias:
            query += """
            HAVING COUNT(qm.questao_id) > 0
                OR EXISTS(SELECT 1 FROM materias child WHERE child.parent_id = m.id)
            """
        query += " ORDER BY m.indice ASC NULLS LAST, m.nome ASC;"

        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute(query)
            linhas = cursor.fetchall()
        return [
            {"id": l[0], "nome": l[1], "indice": l[2], "total_questoes": l[3], "tem_filhos": l[4]}
            for l in linhas
        ]

    @staticmethod
    def listar_filhos(materia_id: int, esconder_vazias: bool = False) -> list[dict]:
        """Retorna os filhos diretos de uma matéria com contagem de questões."""
        query = """
            SELECT m.id, m.nome, m.parent_id, m.id_externo, m.indice,
                   COUNT(qm.questao_id) AS total_questoes,
                   EXISTS(SELECT 1 FROM materias child WHERE child.parent_id = m.id) AS tem_filhos
            FROM materias m
            LEFT JOIN questoes_materias qm ON m.id = qm.materia_id
            WHERE m.parent_id = %s
            GROUP BY m.id, m.nome, m.parent_id, m.id_externo, m.indice
        """
        if esconder_vazias:
            query += """
            HAVING COUNT(qm.questao_id) > 0
                OR EXISTS(SELECT 1 FROM materias child WHERE child.parent_id = m.id)
            """
        query += " ORDER BY m.indice ASC NULLS LAST, m.nome ASC;"

        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute(query, (materia_id,))
            linhas = cursor.fetchall()
        return [
            {
                "id": l[0], "nome": l[1], "parent_id": l[2], "id_externo": l[3], "indice": l[4],
                "total_questoes": l[5], "tem_filhos": l[6]
            }
            for l in linhas
        ]

    @staticmethod
    def editar(materia_id: int, nome: str, parent_id: int | None, id_externo: str | None, indice: str | None):
        """Atualiza os dados de uma matéria."""
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE materias SET nome = %s, parent_id = %s, id_externo = %s, indice = %s WHERE id = %s;",
                (nome, parent_id, id_externo, indice, materia_id)
            )
            conn.commit()

    @staticmethod
    def deletar(materia_id: int):
        """Remove uma matéria e seus vínculos (questões e professores)."""
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM questoes_materias WHERE materia_id = %s;", (materia_id,))
            cursor.execute("DELETE FROM professores_materias WHERE materia_id = %s;", (materia_id,))
            cursor.execute("DELETE FROM materias WHERE id = %s;", (materia_id,))
            conn.commit()

    @staticmethod
    def limpar_vazias() -> int:
        """
        Remove em loop matérias sem questões e sem filhos.
        Retorna o número total de matérias removidas.
        """
        total_removido = 0
        with get_conexao() as conn:
            cursor = conn.cursor()
            while True:
                cursor.execute("""
                    DELETE FROM materias
                    WHERE id NOT IN (SELECT DISTINCT materia_id FROM questoes_materias)
                      AND id NOT IN (SELECT DISTINCT parent_id FROM materias WHERE parent_id IS NOT NULL)
                    RETURNING id;
                """)
                removidos = cursor.fetchall()
                if not removidos:
                    break
                total_removido += len(removidos)
            conn.commit()
        return total_removido

    # ──────────────────────────────────────────────────────────────
    # SOLICITAÇÕES DE REORGANIZAÇÃO (Professores pedem, Admin aprova)
    # ──────────────────────────────────────────────────────────────

    @staticmethod
    def solicitar_movimento(materia_id: int, novo_parent_id: int | None, usuario_id: int) -> int:
        """Registra uma solicitação de mudança de hierarquia. Retorna o ID da solicitação."""
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO solicitacoes_reorganizacao (materia_id, novo_parent_id, solicitado_por)
                VALUES (%s, %s, %s)
                RETURNING id;
            """, (materia_id, novo_parent_id, usuario_id))
            sid = cursor.fetchone()[0]
            conn.commit()
        return sid

    @staticmethod
    def listar_solicitacoes_pendentes() -> list[dict]:
        """Lista solicitações com status 'pendente'."""
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT s.id, m.nome as materia_nome, p.nome as novo_parent_nome,
                       u.nome as solicitante, s.criado_em, s.materia_id, s.novo_parent_id
                FROM solicitacoes_reorganizacao s
                JOIN materias m ON s.materia_id = m.id
                LEFT JOIN materias p ON s.novo_parent_id = p.id
                JOIN usuarios u ON s.solicitado_por = u.id
                WHERE s.status = 'pendente'
                ORDER BY s.criado_em DESC;
            """)
            linhas = cursor.fetchall()
        return [
            {
                "id": l[0], "materia_nome": l[1], "novo_parent_nome": l[2] or "Raiz",
                "solicitante": l[3], "criado_em": l[4], "materia_id": l[5], "novo_parent_id": l[6]
            }
            for l in linhas
        ]

    @staticmethod
    def processar_solicitacao(solicitacao_id: int, status: str, admin_id: int):
        """
        Aprova ou rejeita uma solicitação.
        Se aprovada, executa o movimento de hierarquia.
        Retorna (materia_id, novo_parent_id) ou levanta exceção se não encontrada.
        """
        if status not in ("aprovado", "rejeitado"):
            raise ValueError("Status inválido. Use 'aprovado' ou 'rejeitado'.")

        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE solicitacoes_reorganizacao
                SET status = %s, processado_em = NOW(), processado_por = %s
                WHERE id = %s RETURNING materia_id, novo_parent_id;
            """, (status, admin_id, solicitacao_id))

            resultado = cursor.fetchone()
            if not resultado:
                raise LookupError("Solicitação não encontrada.")
            materia_id, novo_parent_id = resultado

            if status == "aprovado":
                cursor.execute(
                    "UPDATE materias SET parent_id = %s WHERE id = %s;",
                    (novo_parent_id, materia_id)
                )
            conn.commit()

        return materia_id, novo_parent_id

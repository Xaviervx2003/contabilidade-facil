from database import get_conexao

class SessaoRepository:
    def salvar_sessao(self, sessao) -> int:
        """
        Salva a sessão principal e o detalhamento das questões, e atualiza os contadores em lote.
        Retorna o ID da sessão criada.
        """
        matricula_aluno = (sessao.matricula_aluno or sessao.nome_aluno or "").strip()
        if not matricula_aluno:
            raise ValueError("matricula_aluno é obrigatória.")

        with get_conexao() as conn:
            cursor = conn.cursor()

            # Verifica se a matrícula existe na tabela usuarios (evita FK violation).
            # Se não existir, registra a sessão com matricula_aluno=None para não quebrar a FK,
            # mas preserva a identificação pelo campo nome_aluno.
            cursor.execute("SELECT matricula, nome FROM usuarios WHERE matricula = %s", (matricula_aluno,))
            usuario_row = cursor.fetchone()
            matricula_salvar = matricula_aluno if usuario_row else None

            nome_snapshot = sessao.nome_aluno_snapshot
            if not nome_snapshot:
                if usuario_row:
                    nome_snapshot = usuario_row[1]  # nome do usuário
                else:
                    nome_snapshot = sessao.nome_aluno or matricula_aluno

            # 1. Salvar a sessão principal
            cursor.execute(
                """
                INSERT INTO sessoes_estudo 
                (matricula_aluno, nome_aluno_snapshot, assunto_estudado, questoes_respondidas, taxa_acerto, tempo_gasto_segundos, eh_teste_professor)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id;
                """,
                (
                    matricula_salvar,
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

                # PREVENÇÃO DE DEADLOCKS: Ordena os detalhes pelo ID da questão
                # Isso garante que a aquisição de Row-Level Locks no Postgres (durante o executemany)
                # sempre ocorra na mesma ordem, evitando colisões mortais entre sessões simultâneas.
                detalhes_ordenados = sorted(sessao.lista_detalhes, key=lambda x: x.id)

                for detalhe in detalhes_ordenados:
                    acertou = bool(detalhe.acertou)
                    incremento_acerto = 1 if acertou else 0
                    update_params.append((incremento_acerto, detalhe.id))
                    insert_params.append((sessao_id, detalhe.id, acertou))

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
                    cursor.executemany(
                        """
                        INSERT INTO sessoes_questoes (sessao_id, questao_id, acertou)
                        VALUES (%s, %s, %s);
                        """,
                        insert_params
                    )

            conn.commit()
            return sessao_id

    def obter_historico_aluno(self, matricula: str):
        """Retorna o histórico completo de sessões de um aluno específico."""
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

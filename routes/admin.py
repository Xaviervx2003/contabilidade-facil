"""
routes/admin.py — Gestão centralizada de Usuários, Alunos e Matérias.
Todos os papéis (admin, professor, aluno) são gerenciados aqui.
"""

from fastapi import APIRouter, HTTPException
from database import get_conexao
from models import PromoverProfessorRequest, MateriaRequest
from repositories.usuario_repository import UsuarioRepository

router = APIRouter(prefix="/api/admin", tags=["Administração"])


# ══════════════════════════════════════════════════════════════
# 1. GESTÃO DE MATÉRIAS (Hierárquica com id_externo)
# ══════════════════════════════════════════════════════════════

@router.post("/materias")
def criar_materia(materia: MateriaRequest):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO materias (nome, parent_id, id_externo) VALUES (%s, %s, %s) RETURNING id;",
                (materia.nome, materia.parent_id, materia.id_externo)
            )
            novo_id = cursor.fetchone()[0]
            conn.commit()
        return {"sucesso": True, "mensagem": "Matéria criada!", "id": novo_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar matéria: {str(e)}")


@router.get("/materias")
def listar_materias():
    try:
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
        return [{"id": l[0], "nome": l[1], "parent_id": l[2], "id_externo": l[3], "indice": l[4], "total_questoes": l[5]} for l in linhas]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/materias/arvore")
def arvore_materias(esconder_vazias: bool = False):
    """Retorna apenas as matérias raiz (parent_id IS NULL)."""
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            
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
                # Mostrar apenas se tiver questões diretamente OU se tiver filhos
                query += """
                HAVING COUNT(qm.questao_id) > 0 OR EXISTS(SELECT 1 FROM materias child WHERE child.parent_id = m.id)
                """
                
            query += " ORDER BY m.indice ASC NULLS LAST, m.nome ASC;"
            
            cursor.execute(query)
            linhas = cursor.fetchall()
        return [{"id": l[0], "nome": l[1], "indice": l[2], "total_questoes": l[3], "tem_filhos": l[4]} for l in linhas]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/materias/{materia_id}/filhos")
def listar_filhos(materia_id: int, esconder_vazias: bool = False):
    """Retorna os filhos diretos de uma matéria com contagem de questões."""
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            
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
                HAVING COUNT(qm.questao_id) > 0 OR EXISTS(SELECT 1 FROM materias child WHERE child.parent_id = m.id)
                """
                
            query += " ORDER BY m.indice ASC NULLS LAST, m.nome ASC;"
            
            cursor.execute(query, (materia_id,))
            linhas = cursor.fetchall()
        return [{
            "id": l[0], "nome": l[1], "parent_id": l[2], "id_externo": l[3], "indice": l[4],
            "total_questoes": l[5], "tem_filhos": l[6]
        } for l in linhas]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/materias/{materia_id}")
def editar_materia(materia_id: int, materia: MateriaRequest):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE materias SET nome = %s, parent_id = %s, id_externo = %s, indice = %s WHERE id = %s;",
                (materia.nome, materia.parent_id, materia.id_externo, materia.indice, materia_id)
            )
            conn.commit()
        return {"sucesso": True, "mensagem": "Matéria atualizada!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao editar: {str(e)}")


@router.delete("/materias/{materia_id}")
def deletar_materia(materia_id: int):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM questoes_materias WHERE materia_id = %s;", (materia_id,))
            cursor.execute("DELETE FROM professores_materias WHERE materia_id = %s;", (materia_id,))
            cursor.execute("DELETE FROM materias WHERE id = %s;", (materia_id,))
            conn.commit()
        return {"sucesso": True, "mensagem": "Matéria removida!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao deletar: {str(e)}")


@router.delete("/materias/limpar-vazias")
def limpar_materias_vazias():
    """
    Remove matérias que não possuem questões vinculadas E não possuem filhos.
    Executa em loop até que não haja mais nada para limpar (limpa galhos vazios).
    """
    try:
        total_removido = 0
        with get_conexao() as conn:
            cursor = conn.cursor()
            
            while True:
                # Query: Deleta matérias que:
                # 1. Não estão na tabela questoes_materias
                # 2. Não são parent_id de ninguém na tabela materias
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
            
        return {"sucesso": True, "mensagem": f"Faxina concluída! {total_removido} matérias vazias removidas."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na faxina: {str(e)}")


# ══════════════════════════════════════════════════════════════
# 1.1 SOLICITAÇÕES DE REORGANIZAÇÃO
# ══════════════════════════════════════════════════════════════

@router.post("/materias/solicitar-mover")
def solicitar_mover(dados: dict):
    """Cria uma solicitação de mudança de hierarquia (para professores)."""
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO solicitacoes_reorganizacao (materia_id, novo_parent_id, solicitado_por)
                VALUES (%s, %s, %s)
                RETURNING id;
            """, (dados.get("materia_id"), dados.get("novo_parent_id"), dados.get("usuario_id")))
            conn.commit()
        return {"sucesso": True, "mensagem": "Solicitação enviada ao Admin!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/materias/solicitacoes-pendentes")
def listar_solicitacoes_pendentes():
    """Lista solicitações aguardando aprovação do admin."""
    try:
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
        return [{
            "id": l[0], "materia_nome": l[1], "novo_parent_nome": l[2] or "Raiz",
            "solicitante": l[3], "criado_em": l[4], "materia_id": l[5], "novo_parent_id": l[6]
        } for l in linhas]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/materias/processar-solicitacao/{solicitacao_id}")
def processar_solicitacao(solicitacao_id: int, dados: dict):
    """Aprova ou rejeita uma solicitação. Se aprovada, executa o movimento."""
    try:
        status = dados.get("status") # 'aprovado' ou 'rejeitado'
        admin_id = dados.get("usuario_id")

        if status not in ('aprovado', 'rejeitado'):
            raise HTTPException(status_code=400, detail="Status inválido")

        with get_conexao() as conn:
            cursor = conn.cursor()
            
            # 1. Atualiza a solicitação
            cursor.execute("""
                UPDATE solicitacoes_reorganizacao 
                SET status = %s, processado_em = NOW(), processado_por = %s
                WHERE id = %s RETURNING materia_id, novo_parent_id;
            """, (status, admin_id, solicitacao_id))
            
            resultado = cursor.fetchone()
            if not resultado:
                raise HTTPException(status_code=404, detail="Solicitação não encontrada")

            materia_id, novo_parent_id = resultado

            # 2. Se aprovado, executa o movimento
            if status == 'aprovado':
                cursor.execute(
                    "UPDATE materias SET parent_id = %s WHERE id = %s;",
                    (novo_parent_id, materia_id)
                )
            
            conn.commit()
        return {"sucesso": True, "mensagem": f"Solicitação {status} com sucesso!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════════════════════
# 2. GESTÃO DE USUÁRIOS (Admin, Professor e Aluno — tudo aqui)
# ══════════════════════════════════════════════════════════════


@router.get("/usuarios")
def listar_usuarios():
    """
    Retorna todos os usuários do sistema com seu papel e as matérias que ensinam.
    """
    try:
        return UsuarioRepository.listar_todos()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error in listar_usuarios: {str(e)}")


@router.get("/usuarios/{usuario_id}")
def obter_usuario(usuario_id: int):
    """Retorna um único usuário pelo ID, incluindo os IDs das matérias."""
    try:
        usuario = UsuarioRepository.obter_por_id(usuario_id)
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuário não encontrado.")
        return usuario
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error in obter_usuario: {str(e)}")

@router.post("/usuarios")
def criar_usuario(dados: dict):
    """
    Cria um novo usuário (aluno, professor ou admin).
    Campos: nome, matricula, senha, papel, email (opcional)
    """
    try:
        papel = dados.get("papel", "aluno")
        if papel not in ("admin", "professor", "aluno"):
            raise HTTPException(status_code=400, detail="Papel inválido.")
            
        novo_id = UsuarioRepository.criar(dados)
        return {"sucesso": True, "mensagem": "Usuário criado com sucesso!", "id": novo_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar usuário: {str(e)}")


@router.put("/usuarios/{usuario_id}")
def editar_usuario(usuario_id: int, dados: dict):
    """
    Edita nome, email e/ou papel de um usuário.
    Se papel == 'professor', pode receber materia_ids para vínculos.
    """
    try:
        papel = dados.get("papel")
        if papel and papel not in ("admin", "professor", "aluno"):
            raise HTTPException(status_code=400, detail="Papel inválido.")
            
        UsuarioRepository.atualizar(usuario_id, dados)
        return {"sucesso": True, "mensagem": "Usuário atualizado!"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao editar usuário: {str(e)}")


@router.delete("/usuarios/{usuario_id}")
def deletar_usuario(usuario_id: int):
    """Remove um usuário. Não permite deletar o admin principal (id=1)."""
    try:
        UsuarioRepository.deletar(usuario_id)
        return {"sucesso": True, "mensagem": "Usuário removido!"}
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao deletar: {str(e)}")
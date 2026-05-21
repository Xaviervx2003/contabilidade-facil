"""
routes/admin.py — Gestão centralizada de Usuários, Alunos e Matérias.
Todos os papéis (admin, professor, aluno) são gerenciados aqui.
"""

from fastapi import APIRouter, HTTPException
from models import PromoverProfessorRequest, MateriaRequest
from repositories.usuario_repository import UsuarioRepository
from repositories.materia_repository import MateriaRepository

router = APIRouter(prefix="/api/admin", tags=["Administração"])


# ══════════════════════════════════════════════════════════════
# 1. GESTÃO DE MATÉRIAS (Hierárquica com id_externo)
# ══════════════════════════════════════════════════════════════

@router.post("/materias")
def criar_materia(materia: MateriaRequest):
    try:
        novo_id = MateriaRepository.criar(materia.nome, materia.parent_id, materia.id_externo)
        return {"sucesso": True, "mensagem": "Matéria criada!", "id": novo_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar matéria: {str(e)}")


@router.get("/materias")
def listar_materias():
    try:
        return MateriaRepository.listar_todas()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/materias/arvore")
def arvore_materias(esconder_vazias: bool = False):
    """Retorna apenas as matérias raiz (parent_id IS NULL)."""
    try:
        return MateriaRepository.listar_arvore(esconder_vazias)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/materias/{materia_id}/filhos")
def listar_filhos(materia_id: int, esconder_vazias: bool = False):
    """Retorna os filhos diretos de uma matéria com contagem de questões."""
    try:
        return MateriaRepository.listar_filhos(materia_id, esconder_vazias)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/materias/{materia_id}")
def editar_materia(materia_id: int, materia: MateriaRequest):
    try:
        MateriaRepository.editar(materia_id, materia.nome, materia.parent_id, materia.id_externo, materia.indice)
        return {"sucesso": True, "mensagem": "Matéria atualizada!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao editar: {str(e)}")


@router.delete("/materias/limpar-vazias")
def limpar_materias_vazias():
    """Remove matérias sem questões e sem filhos (em loop até não restar nenhuma)."""
    try:
        total = MateriaRepository.limpar_vazias()
        return {"sucesso": True, "mensagem": f"Faxina concluída! {total} matérias vazias removidas."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na faxina: {str(e)}")


@router.delete("/materias/{materia_id}")
def deletar_materia(materia_id: int):
    try:
        MateriaRepository.deletar(materia_id)
        return {"sucesso": True, "mensagem": "Matéria removida!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao deletar: {str(e)}")


# ══════════════════════════════════════════════════════════════
# 1.1 SOLICITAÇÕES DE REORGANIZAÇÃO
# ══════════════════════════════════════════════════════════════

@router.post("/materias/solicitar-mover")
def solicitar_mover(dados: dict):
    """Cria uma solicitação de mudança de hierarquia (para professores)."""
    try:
        MateriaRepository.solicitar_movimento(
            dados.get("materia_id"), dados.get("novo_parent_id"), dados.get("usuario_id")
        )
        return {"sucesso": True, "mensagem": "Solicitação enviada ao Admin!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/materias/solicitacoes-pendentes")
def listar_solicitacoes_pendentes():
    """Lista solicitações aguardando aprovação do admin."""
    try:
        return MateriaRepository.listar_solicitacoes_pendentes()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/materias/processar-solicitacao/{solicitacao_id}")
def processar_solicitacao(solicitacao_id: int, dados: dict):
    """Aprova ou rejeita uma solicitação. Se aprovada, executa o movimento."""
    try:
        status = dados.get("status")
        admin_id = dados.get("usuario_id")
        if status not in ("aprovado", "rejeitado"):
            raise HTTPException(status_code=400, detail="Status inválido")
        MateriaRepository.processar_solicitacao(solicitacao_id, status, admin_id)
        return {"sucesso": True, "mensagem": f"Solicitação {status} com sucesso!"}
    except LookupError:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada")
    except HTTPException:
        raise
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
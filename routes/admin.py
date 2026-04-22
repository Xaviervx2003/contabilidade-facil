"""
routes/admin.py — Gestão centralizada de Usuários, Alunos e Matérias.
Todos os papéis (admin, professor, aluno) são gerenciados aqui.
"""

from fastapi import APIRouter, HTTPException
from database import get_conexao
from models import PromoverProfessorRequest, MateriaRequest

router = APIRouter(prefix="/api/admin", tags=["Administração"])


# ══════════════════════════════════════════════════════════════
# 1. GESTÃO DE MATÉRIAS
# ══════════════════════════════════════════════════════════════

@router.post("/materias")
def criar_materia(materia: MateriaRequest):
    try:
        conn = get_conexao()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO materias (nome) VALUES (%s) RETURNING id;",
            (materia.nome,)
        )
        novo_id = cursor.fetchone()[0]
        conn.commit()
        conn.close()
        return {"sucesso": True, "mensagem": "Matéria criada!", "id": novo_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar matéria: {str(e)}")


@router.get("/materias")
def listar_materias():
    try:
        conn = get_conexao()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT m.id, m.nome, COUNT(qm.questao_id) AS total_questoes
            FROM materias m
            LEFT JOIN questoes_materias qm ON m.id = qm.materia_id
            GROUP BY m.id, m.nome
            ORDER BY m.nome ASC;
        """)
        linhas = cursor.fetchall()
        conn.close()
        return [{"id": l[0], "nome": l[1], "total_questoes": l[2]} for l in linhas]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/materias/{materia_id}")
def editar_materia(materia_id: int, materia: MateriaRequest):
    try:
        conn = get_conexao()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE materias SET nome = %s WHERE id = %s;",
            (materia.nome, materia_id)
        )
        conn.commit()
        conn.close()
        return {"sucesso": True, "mensagem": "Matéria atualizada!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao editar: {str(e)}")


@router.delete("/materias/{materia_id}")
def deletar_materia(materia_id: int):
    try:
        conn = get_conexao()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM questoes_materias WHERE materia_id = %s;", (materia_id,))
        cursor.execute("DELETE FROM professores_materias WHERE materia_id = %s;", (materia_id,))
        cursor.execute("DELETE FROM materias WHERE id = %s;", (materia_id,))
        conn.commit()
        conn.close()
        return {"sucesso": True, "mensagem": "Matéria removida!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao deletar: {str(e)}")


# ══════════════════════════════════════════════════════════════
# 2. GESTÃO DE USUÁRIOS (Admin, Professor e Aluno — tudo aqui)
# ══════════════════════════════════════════════════════════════


@router.get("/usuarios")
def listar_usuarios():
    """
    Retorna todos os usuários do sistema com seu papel e as matérias que ensinam.
    """
    try:
        conn = get_conexao()
        cursor = conn.cursor()
        
        # We use COALESCE on email to ensure it never returns a pure NULL that might break a frontend parser.
        # We simplified the GROUP BY to only include the exact columns we select.
        cursor.execute("""
            SELECT
                u.id,
                u.nome,
                u.matricula,
                COALESCE(u.email, '') AS email,
                u.papel,
                STRING_AGG(m.nome, ', ' ORDER BY m.nome) AS materias_ensinadas
            FROM usuarios u
            LEFT JOIN professores_materias pm ON u.id = pm.usuario_id
            LEFT JOIN materias m              ON pm.materia_id = m.id
            GROUP BY u.id, u.nome, u.matricula, u.email, u.papel
            ORDER BY
                CASE u.papel
                    WHEN 'admin'     THEN 1
                    WHEN 'professor' THEN 2
                    ELSE                  3
                END,
                u.nome ASC;
        """)
        linhas = cursor.fetchall()
        conn.close()
        
        return [
            {
                "id":                 l[0],
                "nome":               l[1],
                "matricula":          l[2],
                "email":              l[3],
                "papel":              l[4],
                "materias_ensinadas": l[5] if l[5] else "—",
            }
            for l in linhas
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error in listar_usuarios: {str(e)}")


@router.get("/usuarios/{usuario_id}")
def obter_usuario(usuario_id: int):
    """Retorna um único usuário pelo ID, incluindo os IDs das matérias."""
    try:
        conn = get_conexao()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT
                u.id, 
                u.nome, 
                u.matricula, 
                COALESCE(u.email, '') AS email, 
                u.papel,
                STRING_AGG(m.nome, ', ' ORDER BY m.nome) AS materias_ensinadas,
                ARRAY_AGG(pm.materia_id) FILTER (WHERE pm.materia_id IS NOT NULL) AS materia_ids
            FROM usuarios u
            LEFT JOIN professores_materias pm ON u.id = pm.usuario_id
            LEFT JOIN materias m              ON pm.materia_id = m.id
            WHERE u.id = %s
            GROUP BY u.id, u.nome, u.matricula, u.email, u.papel;
        """, (usuario_id,))
        l = cursor.fetchone()
        conn.close()
        
        if not l:
            raise HTTPException(status_code=404, detail="Usuário não encontrado.")
            
        return {
            "id":                 l[0],
            "nome":               l[1],
            "matricula":          l[2],
            "email":              l[3],
            "papel":              l[4],
            "materias_ensinadas": l[5] if l[5] else "—",
            "materia_ids":        l[6] if l[6] else [],
        }
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
        conn = get_conexao()
        cursor = conn.cursor()
        
        # 1. Validação do papel
        papel = dados.get("papel", "aluno")
        if papel not in ("admin", "professor", "aluno"):
            raise HTTPException(status_code=400, detail="Papel inválido.")

        # 2. Tratamento de e-mail vazio para não dar erro UNIQUE no banco
        email = dados.get("email")
        if email == "":
            email = None

        # 3. Inserir o usuário
        cursor.execute("""
            INSERT INTO usuarios (nome, matricula, senha, email, papel)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id;
        """, (
            dados.get("nome"),
            dados.get("matricula"),
            dados.get("senha"),
            email,
            papel,
        ))
        novo_id = cursor.fetchone()[0]

        # 4. Vincular matérias se for professor
        if papel == "professor":
            materia_ids = dados.get("materia_ids", [])
            if materia_ids:
                valores = ",".join(["(%s,%s)"] * len(materia_ids))
                params = []
                for m_id in materia_ids:
                    params.extend([novo_id, m_id])
                cursor.execute(
                    f"INSERT INTO professores_materias (usuario_id, materia_id) VALUES {valores};",
                    tuple(params)
                )

        conn.commit()
        conn.close()
        return {"sucesso": True, "mensagem": "Usuário criado com sucesso!", "id": novo_id}
        
    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        raise HTTPException(status_code=500, detail=f"Erro ao criar usuário: {str(e)}")


@router.put("/usuarios/{usuario_id}")
def editar_usuario(usuario_id: int, dados: dict):
    """
    Edita nome, email e/ou papel de um usuário.
    Se papel == 'professor', pode receber materia_ids para vínculos.
    """
    try:
        conn = get_conexao()
        cursor = conn.cursor()

        papel = dados.get("papel")
        if papel and papel not in ("admin", "professor", "aluno"):
            raise HTTPException(status_code=400, detail="Papel inválido.")
            
        email = dados.get("email")
        if email == "":
            email = None

        # Atualiza campos básicos
        cursor.execute("""
            UPDATE usuarios
            SET nome  = COALESCE(%s, nome),
                email = %s,
                papel = COALESCE(%s, papel)
            WHERE id = %s;
        """, (dados.get("nome"), email, papel, usuario_id))

        # Se for professor, atualiza matérias
        if papel == "professor":
            cursor.execute(
                "DELETE FROM professores_materias WHERE usuario_id = %s;",
                (usuario_id,)
            )
            materia_ids = dados.get("materia_ids", [])
            if materia_ids:
                valores = ",".join(["(%s,%s)"] * len(materia_ids))
                params = []
                for m_id in materia_ids:
                    params.extend([usuario_id, m_id])
                cursor.execute(
                    f"INSERT INTO professores_materias (usuario_id, materia_id) VALUES {valores};",
                    tuple(params)
                )
        # Se deixou de ser professor, remove vínculos de matéria
        elif papel in ("admin", "aluno"):
            cursor.execute(
                "DELETE FROM professores_materias WHERE usuario_id = %s;",
                (usuario_id,)
            )

        conn.commit()
        conn.close()
        return {"sucesso": True, "mensagem": "Usuário atualizado!"}
    except HTTPException:
        raise
    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao editar usuário: {str(e)}")


@router.delete("/usuarios/{usuario_id}")
def deletar_usuario(usuario_id: int):
    """Remove um usuário. Não permite deletar o admin principal (id=1)."""
    try:
        if usuario_id == 1:
            raise HTTPException(status_code=403, detail="O admin principal não pode ser removido.")
        conn = get_conexao()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM usuarios WHERE id = %s;", (usuario_id,))
        conn.commit()
        conn.close()
        return {"sucesso": True, "mensagem": "Usuário removido!"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao deletar: {str(e)}")
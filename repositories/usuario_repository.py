from typing import List, Dict, Any, Optional
from fastapi import HTTPException
from database import get_conexao
from utils.security import get_password_hash

class UsuarioRepository:
    """
    Camada de acesso a dados (Repository) para a entidade Usuário.
    Centraliza as consultas SQL e o gerenciamento de conexões para esta entidade.
    """

    @staticmethod
    def listar_todos() -> List[Dict[str, Any]]:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT
                    u.id, u.nome, u.matricula, COALESCE(u.email, '') AS email, 
                    u.papel, u.status_aluno, u.celular, u.periodo,
                    STRING_AGG(m.nome, ', ' ORDER BY m.nome) AS materias_ensinadas
                FROM usuarios u
                LEFT JOIN professores_materias pm ON u.id = pm.usuario_id
                LEFT JOIN materias m ON pm.materia_id = m.id
                GROUP BY u.id, u.nome, u.matricula, u.email, u.papel, u.status_aluno, u.celular, u.periodo
                ORDER BY
                    CASE u.papel
                        WHEN 'admin' THEN 1
                        WHEN 'professor' THEN 2
                        ELSE 3
                    END,
                    u.nome ASC;
            """)
            linhas = cursor.fetchall()
            
            return [{
                "id": l[0], "nome": l[1], "matricula": l[2], "email": l[3],
                "papel": l[4], "status_aluno": l[5], "celular": l[6], "periodo": l[7],
                "materias_ensinadas": l[8] if l[8] else "—"
            } for l in linhas]

    @staticmethod
    def obter_por_id(usuario_id: int) -> Optional[Dict[str, Any]]:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT
                    u.id, u.nome, u.matricula, COALESCE(u.email, '') AS email, 
                    u.papel, u.status_aluno, u.celular, u.periodo,
                    STRING_AGG(m.nome, ', ' ORDER BY m.nome) AS materias_ensinadas,
                    ARRAY_AGG(pm.materia_id) FILTER (WHERE pm.materia_id IS NOT NULL) AS materia_ids
                FROM usuarios u
                LEFT JOIN professores_materias pm ON u.id = pm.usuario_id
                LEFT JOIN materias m ON pm.materia_id = m.id
                WHERE u.id = %s
                GROUP BY u.id, u.nome, u.matricula, u.email, u.papel, u.status_aluno, u.celular, u.periodo;
            """, (usuario_id,))
            l = cursor.fetchone()
            
            if not l:
                return None
                
            return {
                "id": l[0], "nome": l[1], "matricula": l[2], "email": l[3],
                "papel": l[4], "status_aluno": l[5], "celular": l[6], "periodo": l[7],
                "materias_ensinadas": l[8] if l[8] else "—",
                "materia_ids": l[9] if l[9] else []
            }

    @staticmethod
    def criar(dados: dict) -> int:
        with get_conexao() as conn:
            cursor = conn.cursor()
            
            papel = dados.get("papel", "aluno")
            email = dados.get("email") if dados.get("email") else None
            
            senha_limpa = dados.get("senha")
            senha_hash = get_password_hash(senha_limpa) if senha_limpa else None

            cursor.execute("""
                INSERT INTO usuarios (nome, matricula, senha, email, papel, status_aluno, celular, periodo)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id;
            """, (
                dados.get("nome"), dados.get("matricula"), senha_hash,
                email, papel, dados.get("status_aluno", "ativo"),
                dados.get("celular"), dados.get("periodo")
            ))
            novo_id = cursor.fetchone()[0]

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
            return novo_id

    @staticmethod
    def atualizar(usuario_id: int, dados: dict) -> bool:
        with get_conexao() as conn:
            cursor = conn.cursor()

            papel = dados.get("papel")
            email = dados.get("email") if dados.get("email") else None
            status_aluno = dados.get("status_aluno", "ativo")
            celular = dados.get("celular")
            periodo = dados.get("periodo")
            senha = dados.get("senha")

            if senha and senha.strip():
                senha_hash = get_password_hash(senha)
                cursor.execute("""
                    UPDATE usuarios
                    SET nome  = COALESCE(%s, nome), email = %s, papel = COALESCE(%s, papel),
                        senha = %s, status_aluno = COALESCE(%s, status_aluno),
                        celular = %s, periodo = %s
                    WHERE id = %s;
                """, (dados.get("nome"), email, papel, senha_hash, status_aluno, celular, periodo, usuario_id))
            else:
                cursor.execute("""
                    UPDATE usuarios
                    SET nome  = COALESCE(%s, nome), email = %s, papel = COALESCE(%s, papel),
                        status_aluno = COALESCE(%s, status_aluno), celular = %s, periodo = %s
                    WHERE id = %s;
                """, (dados.get("nome"), email, papel, status_aluno, celular, periodo, usuario_id))

            if papel == "professor":
                cursor.execute("DELETE FROM professores_materias WHERE usuario_id = %s;", (usuario_id,))
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
            elif papel in ("admin", "aluno"):
                cursor.execute("DELETE FROM professores_materias WHERE usuario_id = %s;", (usuario_id,))

            conn.commit()
            return True

    @staticmethod
    def deletar(usuario_id: int) -> bool:
        if usuario_id == 1:
            raise ValueError("O admin principal não pode ser removido.")
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM usuarios WHERE id = %s;", (usuario_id,))
            conn.commit()
            return True

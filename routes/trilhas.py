from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from psycopg.rows import dict_row

from database import get_conexao
from models import TrilhaCreate, TrilhaUpdate, ModuloCreate, ModuloUpdate, ProgressoModulo

router = APIRouter(prefix="/api/trilhas", tags=["Trilhas de Aprendizagem"])

# ─── PROFESSOR / ADMIN ──────────────────────────────────────────────

@router.get("")
def listar_trilhas(usuario_id: Optional[int] = Query(None)):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor(row_factory=dict_row)
            cursor.execute("""
                SELECT t.*, u.nome as criador_nome 
                FROM trilhas t
                LEFT JOIN usuarios u ON u.id = t.criado_por
                ORDER BY t.id DESC
            """)
            trilhas = cursor.fetchall()
            
            for t in trilhas:
                cursor.execute("""
                    SELECT m.*, mat.nome as materia_nome
                    FROM modulos m
                    LEFT JOIN materias mat ON mat.id = m.materia_id
                    WHERE m.trilha_id = %s
                    ORDER BY m.ordem ASC
                """, (t["id"],))
                t["modulos"] = cursor.fetchall()
                
            return trilhas
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
def criar_trilha(trilha: TrilhaCreate, usuario_id: int = Query(...)):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO trilhas (nome, descricao, criado_por, status)
                VALUES (%s, %s, %s, %s) RETURNING id
            """, (trilha.nome, trilha.descricao, usuario_id, trilha.status))
            trilha_id = cursor.fetchone()[0]

            for mod in trilha.modulos:
                cursor.execute("""
                    INSERT INTO modulos (trilha_id, nome, descricao, ordem, link_video, texto_teorico, materia_id, questoes_selecionadas)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (trilha_id, mod.nome, mod.descricao, mod.ordem, mod.link_video, mod.texto_teorico, mod.materia_id, mod.questoes_selecionadas))
            
            conn.commit()
            return {"sucesso": True, "mensagem": "Trilha criada com sucesso", "trilha_id": trilha_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{trilha_id}")
def editar_trilha(trilha_id: int, trilha: TrilhaUpdate):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            
            # Montar a query dinâmica
            campos = []
            valores = []
            if trilha.nome is not None:
                campos.append("nome = %s")
                valores.append(trilha.nome)
            if trilha.descricao is not None:
                campos.append("descricao = %s")
                valores.append(trilha.descricao)
            if trilha.status is not None:
                campos.append("status = %s")
                valores.append(trilha.status)
                
            if not campos:
                return {"sucesso": False, "mensagem": "Nenhum dado para atualizar."}
                
            valores.append(trilha_id)
            query = f"UPDATE trilhas SET {', '.join(campos)} WHERE id = %s"
            
            cursor.execute(query, tuple(valores))
            conn.commit()
            return {"sucesso": True, "mensagem": "Trilha atualizada com sucesso"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{trilha_id}")
def deletar_trilha(trilha_id: int):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM trilhas WHERE id = %s", (trilha_id,))
            conn.commit()
            return {"sucesso": True, "mensagem": "Trilha removida com sucesso"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── MÓDULOS ──────────────────────────────────────────────────────

@router.post("/{trilha_id}/modulos")
def adicionar_modulo(trilha_id: int, mod: ModuloCreate):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO modulos (trilha_id, nome, descricao, ordem, link_video, texto_teorico, materia_id, questoes_selecionadas)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
            """, (trilha_id, mod.nome, mod.descricao, mod.ordem, mod.link_video, mod.texto_teorico, mod.materia_id, mod.questoes_selecionadas))
            conn.commit()
            return {"sucesso": True, "mensagem": "Módulo adicionado", "modulo_id": cursor.fetchone()[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/modulos/{modulo_id}")
def editar_modulo(modulo_id: int, mod: ModuloUpdate):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            
            campos = []
            valores = []
            if mod.nome is not None:
                campos.append("nome = %s")
                valores.append(mod.nome)
            if mod.descricao is not None:
                campos.append("descricao = %s")
                valores.append(mod.descricao)
            if mod.ordem is not None:
                campos.append("ordem = %s")
                valores.append(mod.ordem)
            if mod.link_video is not None:
                campos.append("link_video = %s")
                valores.append(mod.link_video)
            if mod.texto_teorico is not None:
                campos.append("texto_teorico = %s")
                valores.append(mod.texto_teorico)
            if mod.materia_id is not None:
                campos.append("materia_id = %s")
                valores.append(mod.materia_id)
            if mod.questoes_selecionadas is not None:
                campos.append("questoes_selecionadas = %s")
                valores.append(mod.questoes_selecionadas)

            if not campos:
                return {"sucesso": False, "mensagem": "Nenhum dado para atualizar."}

            valores.append(modulo_id)
            query = f"UPDATE modulos SET {', '.join(campos)} WHERE id = %s"
            cursor.execute(query, tuple(valores))
            conn.commit()
            return {"sucesso": True, "mensagem": "Módulo atualizado com sucesso"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/modulos/{modulo_id}")
def deletar_modulo(modulo_id: int):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM modulos WHERE id = %s", (modulo_id,))
            conn.commit()
            return {"sucesso": True, "mensagem": "Módulo deletado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── ALUNO ─────────────────────────────────────────────────────────

@router.get("/aluno/{matricula}")
def listar_trilhas_aluno(matricula: str):
    """ Retorna todas as trilhas publicadas e o progresso do aluno nelas """
    try:
        with get_conexao() as conn:
            cursor = conn.cursor(row_factory=dict_row)
            
            # Buscar o ID do usuário através da matrícula
            cursor.execute("SELECT id FROM usuarios WHERE matricula = %s", (matricula,))
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Aluno não encontrado")
            usuario_id = row["id"]
            
            # Buscar trilhas publicadas
            cursor.execute("""
                SELECT t.*, u.nome as criador_nome 
                FROM trilhas t
                LEFT JOIN usuarios u ON u.id = t.criado_por
                WHERE t.status = 'publicado'
                ORDER BY t.id DESC
            """)
            trilhas = cursor.fetchall()
            
            for t in trilhas:
                cursor.execute("""
                    SELECT m.*, mat.nome as materia_nome,
                           COALESCE(pt.concluido, FALSE) as concluido
                    FROM modulos m
                    LEFT JOIN materias mat ON mat.id = m.materia_id
                    LEFT JOIN progresso_trilhas pt ON pt.modulo_id = m.id AND pt.usuario_id = %s
                    WHERE m.trilha_id = %s
                    ORDER BY m.ordem ASC
                """, (usuario_id, t["id"]))
                t["modulos"] = cursor.fetchall()
                
                # Calcular progresso
                total = len(t["modulos"])
                concluidos = sum(1 for m in t["modulos"] if m["concluido"])
                t["progresso_percentual"] = int((concluidos / total) * 100) if total > 0 else 0
                
            return trilhas
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/progresso/{modulo_id}")
def marcar_modulo_concluido(modulo_id: int, progresso: ProgressoModulo):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            
            cursor.execute("SELECT id FROM usuarios WHERE matricula = %s", (progresso.matricula,))
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Aluno não encontrado")
            usuario_id = row[0]
            
            # Upsert
            cursor.execute("""
                INSERT INTO progresso_trilhas (usuario_id, modulo_id, concluido, concluido_em)
                VALUES (%s, %s, TRUE, NOW())
                ON CONFLICT (usuario_id, modulo_id) DO UPDATE 
                SET concluido = TRUE, concluido_em = NOW()
            """, (usuario_id, modulo_id))
            
            conn.commit()
            return {"sucesso": True, "mensagem": "Módulo marcado como concluído"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── UTILITÁRIOS / DASHBOARD ───────────────────────────────────────

@router.post("/{trilha_id}/duplicar")
def duplicar_trilha(trilha_id: int, usuario_id: int = Query(...)):
    """ Cria uma cópia exata da trilha e seus módulos """
    try:
        with get_conexao() as conn:
            cursor = conn.cursor(row_factory=dict_row)
            
            # Buscar trilha original
            cursor.execute("SELECT * FROM trilhas WHERE id = %s", (trilha_id,))
            original = cursor.fetchone()
            if not original:
                raise HTTPException(status_code=404, detail="Trilha não encontrada")
            
            # Criar nova trilha
            cursor.execute("""
                INSERT INTO trilhas (nome, descricao, criado_por, status)
                VALUES (%s, %s, %s, 'rascunho') RETURNING id
            """, (f"Cópia de {original['nome']}", original['descricao'], usuario_id))
            nova_id = cursor.fetchone()["id"]
            
            # Copiar módulos
            cursor.execute("SELECT * FROM modulos WHERE trilha_id = %s ORDER BY ordem ASC", (trilha_id,))
            modulos = cursor.fetchall()
            for mod in modulos:
                cursor.execute("""
                    INSERT INTO modulos (trilha_id, nome, descricao, ordem, link_video, texto_teorico, materia_id, questoes_selecionadas)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (nova_id, mod['nome'], mod['descricao'], mod['ordem'], mod['link_video'], mod['texto_teorico'], mod['materia_id'], mod['questoes_selecionadas']))
            
            conn.commit()
            return {"sucesso": True, "trilha_id": nova_id, "mensagem": "Trilha duplicada com sucesso!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{trilha_id}/engajamento")
def engajamento_trilha(trilha_id: int):
    """ Retorna a lista de alunos e seu progresso na trilha """
    try:
        with get_conexao() as conn:
            cursor = conn.cursor(row_factory=dict_row)
            
            # Total de módulos na trilha
            cursor.execute("SELECT COUNT(*) as total FROM modulos WHERE trilha_id = %s", (trilha_id,))
            total_modulos = cursor.fetchone()["total"]
            
            if total_modulos == 0:
                return []

            # Lista de alunos com progresso
            cursor.execute("""
                SELECT 
                    u.nome, 
                    u.matricula,
                    COUNT(pt.id) FILTER (WHERE pt.concluido) as concluidos,
                    MAX(pt.concluido_em) as ultimo_acesso
                FROM usuarios u
                JOIN progresso_trilhas pt ON pt.usuario_id = u.id
                JOIN modulos m ON m.id = pt.modulo_id
                WHERE m.trilha_id = %s
                GROUP BY u.id
                ORDER BY concluidos DESC, ultimo_acesso DESC
            """, (trilha_id,))
            alunos = cursor.fetchall()
            
            for a in alunos:
                a["progresso_percentual"] = int((a["concluidos"] / total_modulos) * 100)
                a["total_modulos"] = total_modulos

            return alunos
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

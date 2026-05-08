from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from psycopg.rows import dict_row

from database import get_conexao
from models import TrilhaCreate, TrilhaUpdate, ModuloCreate, ModuloUpdate, ProgressoModulo, DuvidaTrilhaCreate, RespostaDuvida

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
                INSERT INTO trilhas (nome, descricao, criado_por, status, capa_url, nivel)
                VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
            """, (trilha.nome, trilha.descricao, usuario_id, trilha.status, trilha.capa_url, trilha.nivel))
            trilha_id = cursor.fetchone()[0]

            for mod in trilha.modulos:
                cursor.execute("""
                    INSERT INTO modulos (trilha_id, nome, descricao, ordem, link_video, texto_teorico, materia_id, questoes_selecionadas, duracao_minutos, material_apoio_url)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (trilha_id, mod.nome, mod.descricao, mod.ordem, mod.link_video, mod.texto_teorico, mod.materia_id, mod.questoes_selecionadas, mod.duracao_minutos, mod.material_apoio_url))
            
            conn.commit()
            return {"sucesso": True, "mensagem": "Trilha criada com sucesso", "trilha_id": trilha_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{trilha_id}")
def editar_trilha(trilha_id: int, trilha: TrilhaUpdate):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            
            campos = []
            valores = []
            if trilha.nome is not None:
                campos.append("nome = %s"); valores.append(trilha.nome)
            if trilha.descricao is not None:
                campos.append("descricao = %s"); valores.append(trilha.descricao)
            if trilha.status is not None:
                campos.append("status = %s"); valores.append(trilha.status)
            if trilha.capa_url is not None:
                campos.append("capa_url = %s"); valores.append(trilha.capa_url)
            if trilha.nivel is not None:
                campos.append("nivel = %s"); valores.append(trilha.nivel)
                
            if not campos:
                return {"sucesso": False, "mensagem": "Nenhum dado para atualizar."}
                
            valores.append(trilha_id)
            cursor.execute(f"UPDATE trilhas SET {', '.join(campos)} WHERE id = %s", tuple(valores))
            
            # Se a trilha foi publicada, notifica todos os alunos
            if trilha.status == 'publicado':
                cursor.execute("SELECT id FROM usuarios WHERE tipo = 'aluno'")
                alunos = cursor.fetchall()
                for aluno in alunos:
                    cursor.execute("""
                        INSERT INTO notificacoes (usuario_id, titulo, mensagem, link)
                        VALUES (%s, %s, %s, %s)
                    """, (
                        aluno[0], 
                        "Nova Trilha Disponível! 🚀", 
                        f"O curso '{trilha.nome or 'Nova Trilha'}' acaba de ser publicado. Confira!",
                        "/aluno/trilhas"
                    ))

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
                INSERT INTO modulos (trilha_id, nome, descricao, ordem, link_video, texto_teorico, materia_id, questoes_selecionadas, duracao_minutos, material_apoio_url)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
            """, (trilha_id, mod.nome, mod.descricao, mod.ordem, mod.link_video, mod.texto_teorico, mod.materia_id, mod.questoes_selecionadas, mod.duracao_minutos, mod.material_apoio_url))
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
                campos.append("nome = %s"); valores.append(mod.nome)
            if mod.descricao is not None:
                campos.append("descricao = %s"); valores.append(mod.descricao)
            if mod.ordem is not None:
                campos.append("ordem = %s"); valores.append(mod.ordem)
            if mod.link_video is not None:
                campos.append("link_video = %s"); valores.append(mod.link_video)
            if mod.texto_teorico is not None:
                campos.append("texto_teorico = %s"); valores.append(mod.texto_teorico)
            if mod.materia_id is not None:
                campos.append("materia_id = %s"); valores.append(mod.materia_id)
            if mod.questoes_selecionadas is not None:
                campos.append("questoes_selecionadas = %s"); valores.append(mod.questoes_selecionadas)
            if mod.duracao_minutos is not None:
                campos.append("duracao_minutos = %s"); valores.append(mod.duracao_minutos)
            if mod.material_apoio_url is not None:
                campos.append("material_apoio_url = %s"); valores.append(mod.material_apoio_url)

            if not campos:
                return {"sucesso": False, "mensagem": "Nenhum dado para atualizar."}

            valores.append(modulo_id)
            cursor.execute(f"UPDATE modulos SET {', '.join(campos)} WHERE id = %s", tuple(valores))
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
    try:
        with get_conexao() as conn:
            cursor = conn.cursor(row_factory=dict_row)
            
            cursor.execute("SELECT id FROM usuarios WHERE matricula = %s", (matricula,))
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Aluno não encontrado")
            usuario_id = row["id"]
            
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
                # Calcular progresso e média
                total = len(t["modulos"])
                concluidos = sum(1 for m in t["modulos"] if m["concluido"])
                t["progresso_percentual"] = int((concluidos / total) * 100) if total > 0 else 0

                # Calcular média de acertos nos quizzes vinculados à trilha
                somas_acertos = []
                for m in t["modulos"]:
                    if m["materia_id"]:
                        # Pega a última sessão do aluno para esta matéria
                        cursor.execute("""
                            SELECT taxa_acerto FROM sessoes_estudo 
                            WHERE matricula_aluno = %s AND (assunto_estudado LIKE %s OR assunto_estudado = (SELECT nome FROM materias WHERE id = %s))
                            ORDER BY data_sessao DESC LIMIT 1
                        """, (matricula, f"%{m['materia_nome']}%", m["materia_id"]))
                        sessao = cursor.fetchone()
                        if sessao: somas_acertos.append(sessao["taxa_acerto"])
                
                t["media_acertos"] = round(sum(somas_acertos) / len(somas_acertos), 1) if somas_acertos else None
                
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
    try:
        with get_conexao() as conn:
            cursor = conn.cursor(row_factory=dict_row)
            
            cursor.execute("SELECT * FROM trilhas WHERE id = %s", (trilha_id,))
            original = cursor.fetchone()
            if not original:
                raise HTTPException(status_code=404, detail="Trilha não encontrada")
            
            cursor.execute("""
                INSERT INTO trilhas (nome, descricao, criado_por, status, capa_url, nivel)
                VALUES (%s, %s, %s, 'rascunho', %s, %s) RETURNING id
            """, (f"Cópia de {original['nome']}", original['descricao'], usuario_id, original.get('capa_url'), original.get('nivel')))
            nova_id = cursor.fetchone()["id"]
            
            cursor.execute("SELECT * FROM modulos WHERE trilha_id = %s ORDER BY ordem ASC", (trilha_id,))
            modulos = cursor.fetchall()
            for mod in modulos:
                cursor.execute("""
                    INSERT INTO modulos (trilha_id, nome, descricao, ordem, link_video, texto_teorico, materia_id, questoes_selecionadas, duracao_minutos, material_apoio_url)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (nova_id, mod['nome'], mod['descricao'], mod['ordem'], mod['link_video'], mod['texto_teorico'], mod['materia_id'], mod['questoes_selecionadas'], mod.get('duracao_minutos'), mod.get('material_apoio_url')))
            
            conn.commit()
            return {"sucesso": True, "trilha_id": nova_id, "mensagem": "Trilha duplicada com sucesso!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{trilha_id}/engajamento")
def engajamento_trilha(trilha_id: int):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor(row_factory=dict_row)
            
            cursor.execute("SELECT COUNT(*) as total FROM modulos WHERE trilha_id = %s", (trilha_id,))
            total_modulos = cursor.fetchone()["total"]
            
            if total_modulos == 0:
                return []

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

# ─── DÚVIDAS E COMENTÁRIOS ─────────────────────────────────────────

@router.get("/modulos/{modulo_id}/duvidas")
def listar_duvidas_modulo(modulo_id: int):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor(row_factory=dict_row)
            cursor.execute("""
                SELECT d.*, u.nome as aluno_nome 
                FROM duvidas_trilhas d
                JOIN usuarios u ON u.id = d.usuario_id
                WHERE d.modulo_id = %s
                ORDER BY d.data_criacao DESC
            """, (modulo_id,))
            return cursor.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/duvidas")
def criar_duvida(duvida: DuvidaTrilhaCreate):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            
            cursor.execute("SELECT id FROM usuarios WHERE matricula = %s", (duvida.matricula,))
            row = cursor.fetchone()
            if not row: raise HTTPException(status_code=404, detail="Usuário não encontrado")
            usuario_id = row[0]
            
            cursor.execute("""
                INSERT INTO duvidas_trilhas (modulo_id, usuario_id, texto)
                VALUES (%s, %s, %s) RETURNING id
            """, (duvida.modulo_id, usuario_id, duvida.texto))
            conn.commit()
            return {"sucesso": True, "duvida_id": cursor.fetchone()[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/duvidas/pendentes")
def listar_duvidas_pendentes():
    try:
        with get_conexao() as conn:
            cursor = conn.cursor(row_factory=dict_row)
            cursor.execute("""
                SELECT d.*, u.nome as aluno_nome, m.nome as modulo_nome, t.nome as trilha_nome
                FROM duvidas_trilhas d
                JOIN usuarios u ON u.id = d.usuario_id
                JOIN modulos m ON m.id = d.modulo_id
                JOIN trilhas t ON t.id = m.trilha_id
                WHERE d.resposta_professor IS NULL
                ORDER BY d.data_criacao ASC
            """)
            return cursor.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/duvidas/{duvida_id}/responder")
def responder_duvida(duvida_id: int, resp: RespostaDuvida):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            
            # Pega o autor da dúvida e o nome do módulo
            cursor.execute("""
                SELECT d.usuario_id, m.nome as modulo_nome 
                FROM duvidas_trilhas d
                JOIN modulos m ON m.id = d.modulo_id
                WHERE d.id = %s
            """, (duvida_id,))
            duvida_info = cursor.fetchone()
            
            cursor.execute("""
                UPDATE duvidas_trilhas 
                SET resposta_professor = %s, respondida_em = NOW()
                WHERE id = %s
            """, (resp.resposta, duvida_id))
            
            if duvida_info:
                cursor.execute("""
                    INSERT INTO notificacoes (usuario_id, titulo, mensagem, link)
                    VALUES (%s, %s, %s, %s)
                """, (
                    duvida_info[0], 
                    "Dúvida Respondida! 🎓", 
                    f"O professor respondeu sua dúvida na aula: {duvida_info[1]}",
                    "/aluno/trilhas"
                ))
            
            conn.commit()
            return {"sucesso": True, "mensagem": "Dúvida respondida e aluno notificado!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── ENDPOINTS DE NOTIFICAÇÕES ────────────────────────────────────

@router.get("/notificacoes/{matricula}")
def listar_notificacoes(matricula: str):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor(row_factory=dict_row)
            cursor.execute("""
                SELECT n.* FROM notificacoes n
                JOIN usuarios u ON u.id = n.usuario_id
                WHERE u.matricula = %s
                ORDER BY n.data_criacao DESC LIMIT 20
            """, (matricula,))
            return cursor.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/notificacoes/{notif_id}/lida")
def marcar_notificacao_lida(notif_id: int):
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE notificacoes SET lida = TRUE WHERE id = %s", (notif_id,))
            conn.commit()
            return {"sucesso": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
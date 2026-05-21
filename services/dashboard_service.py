from typing import Optional, Dict, Any, List
from database import get_conexao
from utils.db_helpers import get_papel_usuario, get_matricula_usuario

def get_resumo_dashboard(usuario_id: int) -> tuple[Dict[str, Any], Optional[str]]:
    with get_conexao() as conn:
        cursor = conn.cursor()
        papel = get_papel_usuario(cursor, usuario_id)

        if not papel:
            return {}, None

        filtro_prof = ""
        if papel == "professor":
            filtro_prof = """
                AND EXISTS (
                    SELECT 1 FROM sessoes_questoes sq
                    JOIN questoes q ON q.id = sq.questao_id
                    WHERE sq.sessao_id = s.id AND q.criado_por = %s
                )
            """
            cursor.execute(f"""
                SELECT COUNT(DISTINCT COALESCE(s.matricula_aluno, s.nome_aluno)) as alunos_ativos,
                       SUM(s.questoes_respondidas) as total_questoes,
                       AVG(s.tempo_gasto_segundos) / 60.0 as tempo_medio
                FROM sessoes_estudo s
                WHERE s.eh_teste_professor IS NOT TRUE {filtro_prof}
            """, (usuario_id,))
            
            dados = cursor.fetchone()
            cursor.execute("SELECT COUNT(*) FROM questoes WHERE criado_por = %s", (usuario_id,))
            total_questoes_banco = cursor.fetchone()[0] or 0
            
        else: # aluno ou admin
            matricula = get_matricula_usuario(cursor, usuario_id)
            if papel == "aluno":
                cursor.execute("""
                    SELECT 1, SUM(questoes_respondidas), AVG(tempo_gasto_segundos) / 60.0
                    FROM sessoes_estudo WHERE COALESCE(matricula_aluno, nome_aluno) = %s
                """, (matricula,))
            else: # admin
                cursor.execute("""
                    SELECT COUNT(DISTINCT COALESCE(matricula_aluno, nome_aluno)), SUM(questoes_respondidas), 
                           AVG(tempo_gasto_segundos) / 60.0
                    FROM sessoes_estudo WHERE eh_teste_professor IS NOT TRUE
                """)
            
            dados = cursor.fetchone()
            cursor.execute("SELECT COUNT(*) FROM questoes")
            total_questoes_banco = cursor.fetchone()[0] or 0

    payload = {
        "alunos_ativos": int(dados[0] or 0),
        "total_questoes_resolvidas": int(dados[1] or 0),
        "tempo_medio_minutos": round(float(dados[2] or 0), 1),
        "total_questoes_banco": int(total_questoes_banco)
    }
    return payload, papel

def get_sessoes_por_mes(usuario_id: int) -> tuple[List[Dict[str, Any]], Optional[str]]:
    with get_conexao() as conn:
        cursor = conn.cursor()
        papel = get_papel_usuario(cursor, usuario_id)
        
        filtro = ""
        params = []
        
        if papel == "professor":
            filtro = "AND EXISTS (SELECT 1 FROM sessoes_questoes sq JOIN questoes q ON q.id = sq.questao_id WHERE sq.sessao_id = s.id AND q.criado_por = %s)"
            params.append(usuario_id)
        elif papel == "aluno":
            matricula = get_matricula_usuario(cursor, usuario_id)
            filtro = "AND COALESCE(s.matricula_aluno, s.nome_aluno) = %s"
            params.append(matricula)

        cursor.execute(f"""
            SELECT TO_CHAR(DATE_TRUNC('month', s.criado_em), 'Mon/YY') as mes,
                   COUNT(s.id) as total, ROUND(AVG(s.taxa_acerto)::numeric, 1) as media
            FROM sessoes_estudo s
            WHERE s.criado_em >= NOW() - INTERVAL '7 months' {filtro}
            GROUP BY DATE_TRUNC('month', s.criado_em)
            ORDER BY DATE_TRUNC('month', s.criado_em)
        """, params)
        
        rows = cursor.fetchall()
        payload = [{"mes": r[0], "sessoes": int(r[1]), "media_acerto": float(r[2] or 0)} for r in rows]
        return payload, papel

def get_visao_geral(usuario_id: int) -> tuple[Dict[str, Any], Optional[str]]:
    with get_conexao() as conn:
        cursor = conn.cursor()
        papel = get_papel_usuario(cursor, usuario_id)
        
        filtro = ""
        params = {}
        if papel == "professor":
            filtro = "AND EXISTS (SELECT 1 FROM sessoes_questoes sq JOIN questoes q ON q.id = sq.questao_id WHERE sq.sessao_id = s.id AND q.criado_por = %(uid)s)"
            params["uid"] = usuario_id
        elif papel == "aluno":
            params["mat"] = get_matricula_usuario(cursor, usuario_id)
            filtro = "AND COALESCE(s.matricula_aluno, s.nome_aluno) = %(mat)s"

        cursor.execute(f"""
            SELECT COALESCE(u.nome, s.nome_aluno_snapshot, s.matricula_aluno, s.nome_aluno), s.assunto_estudado, s.questoes_respondidas, 
                   s.taxa_acerto, s.criado_em
            FROM sessoes_estudo s
            LEFT JOIN usuarios u ON u.matricula = COALESCE(s.matricula_aluno, s.nome_aluno)
            WHERE 1=1 {filtro} ORDER BY s.criado_em DESC LIMIT 5
        """, params)
        
        ultimas = [{"aluno": r[0], "assunto": r[1], "questoes": r[2], "acerto": r[3], "data": r[4].isoformat() if r[4] else None} for r in cursor.fetchall()]
        
        cursor.execute(f"""
            SELECT ROUND(AVG(total_q), 1) FROM (
                SELECT COALESCE(matricula_aluno, nome_aluno), SUM(questoes_respondidas) as total_q
                FROM sessoes_estudo s WHERE 1=1 {filtro} GROUP BY COALESCE(matricula_aluno, nome_aluno)
            ) sub
        """, params)
        media_geral = cursor.fetchone()[0] or 0
        
        payload = {"ultimas_sessoes": ultimas, "media_questoes_por_aluno": float(media_geral)}
        return payload, papel

from typing import Optional, Dict, Any, List
from database import get_conexao
from utils.db_helpers import get_papel_usuario, get_matricula_usuario
from datetime import date

class AnalyticsRepository:
    def get_resumo_dashboard(self, usuario_id: int) -> tuple[Dict[str, Any], Optional[str]]:
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

    def get_sessoes_por_mes(self, usuario_id: int) -> tuple[List[Dict[str, Any]], Optional[str]]:
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

    def get_visao_geral(self, usuario_id: int) -> tuple[Dict[str, Any], Optional[str]]:
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

    def get_dashboard_aluno(self, matricula: str) -> Dict[str, Any]:
        with get_conexao() as conn:
            cursor = conn.cursor()

            # 1. Nome do aluno
            cursor.execute("SELECT nome FROM usuarios WHERE matricula = %s", (matricula,))
            row = cursor.fetchone()
            nome = row[0] if row else matricula

            # 2. Resumo de HOJE
            cursor.execute("""
                SELECT COUNT(id), COALESCE(SUM(questoes_respondidas), 0),
                       COALESCE(SUM(tempo_gasto_segundos), 0), ROUND(AVG(taxa_acerto)::numeric, 1)
                FROM sessoes_estudo
                WHERE COALESCE(matricula_aluno, nome_aluno) = %s AND DATE(criado_em) = CURRENT_DATE AND eh_teste_professor IS NOT TRUE;
            """, (matricula,))
            hoje = cursor.fetchone()

            # 3. Resumo da SEMANA
            cursor.execute("""
                SELECT COUNT(id), COALESCE(SUM(questoes_respondidas), 0),
                       COALESCE(SUM(tempo_gasto_segundos), 0), ROUND(AVG(taxa_acerto)::numeric, 1),
                       COUNT(DISTINCT DATE(criado_em))
                FROM sessoes_estudo
                WHERE COALESCE(matricula_aluno, nome_aluno) = %s AND criado_em >= CURRENT_DATE - INTERVAL '6 days' AND eh_teste_professor IS NOT TRUE;
            """, (matricula,))
            semana = cursor.fetchone()

            # 4. Resumo GERAL
            cursor.execute("""
                SELECT COUNT(id), COALESCE(SUM(questoes_respondidas), 0),
                       COALESCE(SUM(tempo_gasto_segundos), 0), ROUND(AVG(taxa_acerto)::numeric, 1), MAX(criado_em)
                FROM sessoes_estudo
                WHERE COALESCE(matricula_aluno, nome_aluno) = %s AND eh_teste_professor IS NOT TRUE;
            """, (matricula,))
            geral = cursor.fetchone()

            # 5. Streak
            cursor.execute("""
                SELECT DISTINCT DATE(criado_em) FROM sessoes_estudo
                WHERE COALESCE(matricula_aluno, nome_aluno) = %s AND eh_teste_professor IS NOT TRUE
                ORDER BY DATE(criado_em) DESC;
            """, (matricula,))
            datas = [r[0] for r in cursor.fetchall()]
            streak_atual = 0
            if datas:
                hoje_dt = date.today()
                diff = (hoje_dt - datas[0]).days
                if diff <= 1:
                    streak_atual = 1
                    for i in range(1, len(datas)):
                        if (datas[i - 1] - datas[i]).days == 1:
                            streak_atual += 1
                        else:
                            break

            # 6. Progresso
            cursor.execute("""
                SELECT COUNT(DISTINCT sq.questao_id), (SELECT COUNT(*) FROM questoes)
                FROM sessoes_estudo s JOIN sessoes_questoes sq ON sq.sessao_id = s.id
                WHERE COALESCE(s.matricula_aluno, s.nome_aluno) = %s;
            """, (matricula,))
            progresso_row = cursor.fetchone()
            respondidas = int(progresso_row[0] or 0)
            total_banco = int(progresso_row[1] or 1)

            # 7 e 8. Materias Fracas / Fortes
            query_materias = """
                SELECT COALESCE(NULLIF(TRIM(s.assunto_estudado), ''), 'Sem assunto'), SUM(s.questoes_respondidas),
                       ROUND((SUM(s.questoes_respondidas * s.taxa_acerto / 100.0) / NULLIF(SUM(s.questoes_respondidas), 0) * 100)::numeric, 1) as media_acerto
                FROM sessoes_estudo s
                WHERE COALESCE(s.matricula_aluno, s.nome_aluno) = %s AND s.eh_teste_professor IS NOT TRUE
                GROUP BY 1 HAVING SUM(s.questoes_respondidas) >= 3
                ORDER BY media_acerto {} LIMIT 5;
            """
            cursor.execute(query_materias.format("ASC"), (matricula,))
            materias_fracas = [{"materia": r[0], "questoes": int(r[1]), "media_acerto": float(r[2] or 0)} for r in cursor.fetchall()]
            
            cursor.execute(query_materias.format("DESC"), (matricula,))
            materias_fortes = [{"materia": r[0], "questoes": int(r[1]), "media_acerto": float(r[2] or 0)} for r in cursor.fetchall()]

            # 9. Ultimas
            cursor.execute("""
                SELECT COALESCE(assunto_estudado, 'Geral'), questoes_respondidas, taxa_acerto, tempo_gasto_segundos, criado_em
                FROM sessoes_estudo WHERE COALESCE(matricula_aluno, nome_aluno) = %s AND eh_teste_professor IS NOT TRUE
                ORDER BY criado_em DESC LIMIT 5;
            """, (matricula,))
            ultimas = [{"materia": r[0], "questoes": int(r[1]), "acerto": float(r[2]), "tempo_seg": int(r[3]), "data": r[4].isoformat() if r[4] else None} for r in cursor.fetchall()]

            # 10. Serie Semanal
            cursor.execute("""
                WITH dias AS (SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day')::date AS dia),
                por_dia AS (
                    SELECT DATE(criado_em) AS dia, COALESCE(SUM(questoes_respondidas), 0) AS questoes
                    FROM sessoes_estudo WHERE COALESCE(matricula_aluno, nome_aluno) = %s AND criado_em >= CURRENT_DATE - INTERVAL '6 days' AND eh_teste_professor IS NOT TRUE
                    GROUP BY DATE(criado_em)
                )
                SELECT d.dia, COALESCE(p.questoes, 0) FROM dias d LEFT JOIN por_dia p ON p.dia = d.dia ORDER BY d.dia;
            """, (matricula,))
            serie_semanal = [{"dia": r[0].isoformat(), "questoes": int(r[1])} for r in cursor.fetchall()]

        return {
            "nome": nome,
            "hoje": {"sessoes": int(hoje[0] or 0), "questoes": int(hoje[1] or 0), "tempo_seg": int(hoje[2] or 0), "media_acerto": float(hoje[3] or 0)},
            "semana": {"sessoes": int(semana[0] or 0), "questoes": int(semana[1] or 0), "tempo_seg": int(semana[2] or 0), "media_acerto": float(semana[3] or 0), "dias_estudados": int(semana[4] or 0)},
            "geral": {"total_sessoes": int(geral[0] or 0), "total_questoes": int(geral[1] or 0), "tempo_total_seg": int(geral[2] or 0), "media_geral": float(geral[3] or 0), "ultima_sessao": geral[4].isoformat() if geral[4] else None},
            "streak": streak_atual,
            "progresso": {"respondidas": respondidas, "total_banco": total_banco, "percentual": round((respondidas / total_banco) * 100, 1) if total_banco > 0 else 0},
            "materias_fracas": materias_fracas,
            "materias_fortes": materias_fortes,
            "ultimas_sessoes": ultimas,
            "serie_semanal": serie_semanal,
        }

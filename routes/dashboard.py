"""
routes/dashboard.py — Métricas do dashboard e desempenho dos alunos.
Suporta filtragem por papel: Admin vê tudo, Professor vê apenas seus alunos.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from database import get_conexao

router = APIRouter(prefix="/api", tags=["Dashboard"])


def _get_papel_usuario(cursor, usuario_id: int) -> Optional[str]:
    """Retorna o papel ('admin', 'professor', 'aluno') do usuário ou None se não encontrado."""
    cursor.execute("SELECT papel FROM usuarios WHERE id = %s", (usuario_id,))
    row = cursor.fetchone()
    return row[0] if row else None


@router.get("/dashboard")
def resumo_dashboard(usuario_id: Optional[int] = Query(None)):
    """
    Retorna as métricas globais do dashboard.
    - Admin / sem ID: conta todas as sessões.
    - Professor: conta apenas sessões de alunos que usaram suas questões,
      ignorando sessões de teste (eh_teste_professor = TRUE).
    """
    try:
        conn = get_conexao()
        cursor = conn.cursor()

        papel = _get_papel_usuario(cursor, usuario_id) if usuario_id else None

        if papel == "professor":
            # Filtra sessões vinculadas às questões criadas por este professor,
            # excluindo as sessões de teste dele mesmo.
            cursor.execute("""
                SELECT
                    COUNT(s.id)                          AS total_sessoes,
                    SUM(s.questoes_respondidas)          AS total_questoes,
                    AVG(s.tempo_gasto_segundos) / 60     AS tempo_medio_minutos
                FROM sessoes_estudo s
                WHERE s.eh_teste_professor IS NOT TRUE
                  AND EXISTS (
                      SELECT 1
                      FROM questoes q
                      WHERE q.criado_por = %s
                        AND q.assunto = s.assunto_estudado
                  );
            """, (usuario_id,))
        else:
            # Admin ou acesso sem autenticação: retorna tudo.
            cursor.execute("""
                SELECT
                    COUNT(id)                        AS total_sessoes,
                    SUM(questoes_respondidas)        AS total_questoes,
                    AVG(tempo_gasto_segundos) / 60   AS tempo_medio_minutos
                FROM sessoes_estudo;
            """)

        dados = cursor.fetchone()
        conn.close()

        return {
            "usuarios_ativos": int(dados[0] or 0),
            "total_questoes_resolvidas": int(dados[1] or 0),
            "tempo_medio_minutos": float(round(dados[2] or 0, 1)),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no dashboard: {str(e)}")


@router.get("/alunos/desempenho")
def obter_desempenho_alunos(usuario_id: Optional[int] = Query(None)):
    """
    Retorna o desempenho dos alunos.
    - Admin / sem ID: retorna todos os alunos.
    - Professor: retorna apenas alunos que estudaram com suas questões,
      ignorando sessões de teste (eh_teste_professor = TRUE).
    """
    try:
        conn = get_conexao()
        cursor = conn.cursor()

        papel = _get_papel_usuario(cursor, usuario_id) if usuario_id else None

        if papel == "professor":
            cursor.execute("""
                SELECT u.nome, u.matricula, s.id, s.assunto_estudado,
                       s.questoes_respondidas, s.taxa_acerto, s.tempo_gasto_segundos
                FROM usuarios u
                LEFT JOIN sessoes_estudo s ON u.matricula = s.nome_aluno
                WHERE u.papel = 'aluno'
                  AND (
                      s.id IS NULL
                      OR (
                          s.eh_teste_professor IS NOT TRUE
                          AND EXISTS (
                              SELECT 1
                              FROM questoes q
                              WHERE q.criado_por = %s
                                AND q.assunto = s.assunto_estudado
                          )
                      )
                  );
            """, (usuario_id,))
        else:
            # Admin ou sem ID: todos os alunos
            cursor.execute("""
                SELECT u.nome, u.matricula, s.id, s.assunto_estudado,
                       s.questoes_respondidas, s.taxa_acerto, s.tempo_gasto_segundos
                FROM usuarios u
                LEFT JOIN sessoes_estudo s ON u.matricula = s.nome_aluno
                WHERE u.papel = 'aluno';
            """)

        linhas = cursor.fetchall()
        conn.close()

        desempenho = {}
        for linha in linhas:
            nome, matricula, s_id, assunto, questoes_respondidas, taxa, tempo = linha

            if matricula not in desempenho:
                desempenho[matricula] = {
                    "nome": nome,
                    "matricula": matricula,
                    "sessoes": 0,
                    "total_questoes": 0,
                    "soma_taxas": 0.0,
                    "soma_tempo": 0,
                    "materias": {},
                }

            if s_id is not None:
                q_resp_int = int(questoes_respondidas) if questoes_respondidas is not None else 0
                taxa_float = float(taxa) if taxa is not None else 0.0
                tempo_int = int(tempo) if tempo is not None else 0

                desempenho[matricula]["sessoes"] += 1
                desempenho[matricula]["total_questoes"] += q_resp_int
                desempenho[matricula]["soma_taxas"] += taxa_float
                desempenho[matricula]["soma_tempo"] += tempo_int

                q_certas = q_resp_int * (taxa_float / 100.0)
                q_erros = q_resp_int - q_certas

                if assunto not in desempenho[matricula]["materias"]:
                    desempenho[matricula]["materias"][assunto] = {"erros": 0, "total": 0}

                desempenho[matricula]["materias"][assunto]["erros"] += int(round(q_erros))
                desempenho[matricula]["materias"][assunto]["total"] += q_resp_int

        resultado = []
        for mat, d in desempenho.items():
            media_geral = d["soma_taxas"] / d["sessoes"] if d["sessoes"] > 0 else 0.0
            tempo_medio = d["soma_tempo"] / d["sessoes"] if d["sessoes"] > 0 else 0
            resultado.append({
                "nome": d["nome"],
                "matricula": mat,
                "sessoes": d["sessoes"],
                "questoes": d["total_questoes"],
                "media_numero": media_geral,
                "tempo_medio_segundos": tempo_medio,
                "erros_por_materia": d["materias"],
            })

        resultado.sort(key=lambda x: x["nome"])
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar desempenho: {str(e)}")
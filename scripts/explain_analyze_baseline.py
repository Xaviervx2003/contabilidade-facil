"""
Gera baseline de EXPLAIN ANALYZE para as queries mais pesadas.
Saida: docs/BASELINE_EXPLAIN.md
"""

from datetime import datetime, UTC
from pathlib import Path
import os

from dotenv import load_dotenv
import psycopg


def get_conn():
    load_dotenv()
    return psycopg.connect(
        host=os.getenv("DB_HOST"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        port=os.getenv("DB_PORT"),
    )


def first_value(cursor, sql: str, fallback):
    cursor.execute(sql)
    row = cursor.fetchone()
    return row[0] if row and row[0] is not None else fallback


def explain(cursor, title: str, sql: str, params=()):
    cursor.execute(f"EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) {sql}", params)
    lines = [r[0] for r in cursor.fetchall()]
    content = [f"## {title}", "", "```text", *lines, "```", ""]
    return "\n".join(content)


def main():
    out_path = Path("docs/BASELINE_EXPLAIN.md")
    sections = [f"# Baseline EXPLAIN ANALYZE", "", f"Gerado em: {datetime.now(UTC).isoformat()}", ""]

    with get_conn() as conn:
        with conn.cursor() as cur:
            usuario_id = first_value(cur, "SELECT id FROM usuarios ORDER BY id LIMIT 1;", 1)
            matricula = first_value(cur, "SELECT matricula FROM usuarios WHERE papel = 'aluno' ORDER BY id LIMIT 1;", "admin")
            feedback_limit = 20
            feedback_offset = 0

            sections.append(
                explain(
                    cur,
                    "Dashboard /sessoes-por-mes",
                    """
                    SELECT TO_CHAR(DATE_TRUNC('month', s.criado_em), 'Mon/YY') as mes,
                           COUNT(s.id) as total,
                           ROUND(AVG(s.taxa_acerto)::numeric, 1) as media
                    FROM sessoes_estudo s
                    WHERE s.criado_em >= NOW() - INTERVAL '7 months'
                    GROUP BY DATE_TRUNC('month', s.criado_em)
                    ORDER BY DATE_TRUNC('month', s.criado_em)
                    """,
                )
            )

            sections.append(
                explain(
                    cur,
                    "Feedbacks paginados",
                    """
                    SELECT
                        f.id, f.questao_id, q.enunciado, f.nome_aluno, f.texto, f.marcada_confusa,
                        f.data_criacao, f.resolvido, f.resolvido_em, f.publico, f.resposta_professor,
                        (SELECT COUNT(*) FROM feedbacks_questoes f2 WHERE f2.questao_id = f.questao_id AND f2.resolvido = FALSE) as impacto
                    FROM feedbacks_questoes f
                    JOIN questoes q ON f.questao_id = q.id
                    ORDER BY f.resolvido ASC, impacto DESC, f.data_criacao DESC
                    LIMIT %s OFFSET %s
                    """,
                    (feedback_limit, feedback_offset),
                )
            )

            sections.append(
                explain(
                    cur,
                    "Busca textual em questoes",
                    """
                    SELECT q.id
                    FROM questoes q
                    WHERE q.enunciado ILIKE %s
                       OR q.banca ILIKE %s
                       OR q.orgao ILIKE %s
                       OR q.cargo ILIKE %s
                    ORDER BY q.id ASC
                    LIMIT 50
                    """,
                    ("%contabilidade%", "%contabilidade%", "%contabilidade%", "%contabilidade%"),
                )
            )

            sections.append(f"Contexto de amostra: usuario_id={usuario_id}, matricula='{matricula}'")

    out_path.write_text("\n".join(sections), encoding="utf-8")
    print(f"Baseline gerada em {out_path}")


if __name__ == "__main__":
    main()

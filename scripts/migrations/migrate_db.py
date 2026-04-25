import psycopg
import sys

sys.stdout.reconfigure(encoding='utf-8')

conn = psycopg.connect('dbname=plataforma_questoes user=joao_xavier password=sua_senha_segura12 host=localhost port=5432')
cur = conn.cursor()

print("=== Aplicando migracoes de banco de dados ===\n")

cur.execute("""
    ALTER TABLE feedbacks_questoes
        ADD COLUMN IF NOT EXISTS resolvido BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS resolvido_em TIMESTAMP DEFAULT NULL;
""")
print("OK feedbacks_questoes: colunas 'resolvido' e 'resolvido_em' adicionadas")

cur.execute("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email VARCHAR(255);")
print("OK usuarios: coluna 'email' garantida")

indexes = [
    ("idx_sessoes_nome_aluno",   "CREATE INDEX IF NOT EXISTS idx_sessoes_nome_aluno ON sessoes_estudo (nome_aluno)"),
    ("idx_feedbacks_resolvido",  "CREATE INDEX IF NOT EXISTS idx_feedbacks_resolvido ON feedbacks_questoes (resolvido)"),
    ("idx_qm_materia_id",        "CREATE INDEX IF NOT EXISTS idx_qm_materia_id ON questoes_materias (materia_id)"),
    ("idx_qm_questao_id",        "CREATE INDEX IF NOT EXISTS idx_qm_questao_id ON questoes_materias (questao_id)"),
    ("idx_pm_usuario_id",        "CREATE INDEX IF NOT EXISTS idx_pm_usuario_id ON professores_materias (usuario_id)"),
    ("idx_feedbacks_questao_id", "CREATE INDEX IF NOT EXISTS idx_feedbacks_questao_id ON feedbacks_questoes (questao_id)"),
    ("idx_sessoes_criado_em",    "CREATE INDEX IF NOT EXISTS idx_sessoes_criado_em ON sessoes_estudo (criado_em DESC)"),
]

for name, sql in indexes:
    cur.execute(sql)
    print(f"OK Indice criado: {name}")

conn.commit()
conn.close()
print("\n=== Todas as migracoes aplicadas com sucesso! ===")

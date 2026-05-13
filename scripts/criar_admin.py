"""
scripts/criar_admin.py
Cria ou atualiza o usuário admin com senha hasheada (argon2).
Execute UMA VEZ após o init.sql:

    python scripts/criar_admin.py

Variáveis de ambiente necessárias (carregadas do .env):
    DATABASE_URL ou DB_HOST + DB_PORT + DB_NAME + DB_USER + DB_PASSWORD
    ADMIN_MATRICULA  (padrão: admin)
    ADMIN_SENHA      (obrigatório — defina antes de rodar)
"""

import os
import sys

# Permite rodar da raiz do projeto
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from utils.security import get_password_hash
from database import iniciar_pool, get_conexao

MATRICULA = os.getenv("ADMIN_MATRICULA", "admin")
SENHA     = os.getenv("ADMIN_SENHA", "")

if not SENHA:
    print("❌ Defina ADMIN_SENHA no .env antes de rodar este script.")
    print("   Ex: ADMIN_SENHA=MinhaSenhaForte123!")
    sys.exit(1)

if len(SENHA) < 8:
    print("❌ ADMIN_SENHA deve ter pelo menos 8 caracteres.")
    sys.exit(1)

iniciar_pool()

with get_conexao() as conn:
    cursor = conn.cursor()
    senha_hash = get_password_hash(SENHA)

    cursor.execute("SELECT id FROM usuarios WHERE matricula = %s;", (MATRICULA,))
    existe = cursor.fetchone()

    if existe:
        cursor.execute(
            "UPDATE usuarios SET senha = %s, papel = 'admin' WHERE matricula = %s;",
            (senha_hash, MATRICULA),
        )
        print(f"✅ Senha do admin '{MATRICULA}' atualizada com sucesso.")
    else:
        cursor.execute(
            "INSERT INTO usuarios (nome, matricula, senha, papel) VALUES (%s, %s, %s, 'admin');",
            ("Administrador", MATRICULA, senha_hash),
        )
        print(f"✅ Admin '{MATRICULA}' criado com sucesso.")

    conn.commit()

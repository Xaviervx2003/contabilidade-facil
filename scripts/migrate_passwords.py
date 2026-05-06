import sys
import os

# Adiciona o diretório raiz ao path para importar database e utils
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database import get_conexao, iniciar_pool
from utils.security import get_password_hash
from utils.logger import setup_logger

logger = setup_logger("migration")

def migrate_passwords():
    """
    Script de migração para converter senhas de texto plano para Hash (Bcrypt).
    Seguro: Não re-hashea senhas que já parecem ser hashes.
    """
    logger.info("Iniciando migração de senhas para formato seguro...")
    
    try:
        # Inicia o pool antes de tentar conectar
        iniciar_pool()
        
        with get_conexao() as conn:
            cursor = conn.cursor()
            
            # 1. Buscar todos os usuários
            cursor.execute("SELECT id, matricula, senha FROM usuarios;")
            usuarios = cursor.fetchall()
            
            logger.info(f"Total de usuários encontrados: {len(usuarios)}")
            
            migrados = 0
            pulados = 0
            
            for user_id, matricula, senha_atual in usuarios:
                # Verificar se já é um hash seguro (Bcrypt ou Argon2)
                if any(senha_atual.startswith(p) for p in ["$argon2id$", "$2b$", "$2a$"]):
                    pulados += 1
                    continue
                
                # Gerar novo hash
                novo_hash = get_password_hash(senha_atual)
                
                # Atualizar no banco
                cursor.execute(
                    "UPDATE usuarios SET senha = %s WHERE id = %s;",
                    (novo_hash, user_id)
                )
                migrados += 1
                logger.info(f"Senha migrada para usuário: {matricula}")
            
            conn.commit()
            logger.info(f"Migração concluída! Migrados: {migrados}, Já protegidos: {pulados}")
            
    except Exception as e:
        logger.error(f"Erro crítico durante a migração: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    migrate_passwords()

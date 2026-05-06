import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database import get_conexao, iniciar_pool
from utils.logger import setup_logger

logger = setup_logger("db_cleanup")

def limpar_banco():
    logger.info("Iniciando limpeza das tabelas questoes e materias...")
    iniciar_pool()
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            
            logger.info("Deletando sessoes_questoes...")
            cursor.execute("TRUNCATE TABLE sessoes_questoes CASCADE;")
            
            logger.info("Deletando feedbacks_questoes...")
            cursor.execute("TRUNCATE TABLE feedbacks_questoes CASCADE;")
            
            logger.info("Deletando questoes_materias...")
            cursor.execute("TRUNCATE TABLE questoes_materias CASCADE;")
            
            logger.info("Deletando questoes...")
            cursor.execute("TRUNCATE TABLE questoes CASCADE;")
            
            logger.info("Deletando professores_materias...")
            cursor.execute("TRUNCATE TABLE professores_materias CASCADE;")
            
            logger.info("Deletando materias...")
            cursor.execute("TRUNCATE TABLE materias CASCADE;")
            
            conn.commit()
            logger.info("✅ Banco limpo com sucesso!")
    except Exception as e:
        logger.error(f"Erro ao limpar banco: {str(e)}")

if __name__ == "__main__":
    limpar_banco()

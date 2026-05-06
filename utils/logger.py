import logging
import sys
import os
from logging.handlers import RotatingFileHandler

def setup_logger(name: str):
    """
    Configura um logger padronizado para a aplicação (Fator XI - Logs).
    Em produção, logs devem ser enviados para o stdout.
    """
    logger = logging.getLogger(name)
    
    # Se já tiver handlers, não adiciona de novo
    if logger.handlers:
        return logger
        
    logger.setLevel(logging.INFO)
    
    # Formato do log: [DATA] [NÍVEL] [NOME] Mensagem
    formatter = logging.Formatter(
        '[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # StreamHandler para stdout (Melhor para Docker/PaaS - 12 Factor)
    stdout_handler = logging.StreamHandler(sys.stdout)
    stdout_handler.setFormatter(formatter)
    logger.addHandler(stdout_handler)

    return logger

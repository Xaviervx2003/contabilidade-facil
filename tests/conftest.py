import pytest
from database import iniciar_pool, encerrar_pool

@pytest.fixture(scope="session", autouse=True)
def manage_db_pool():
    """Garante que o pool de conexões seja iniciado antes dos testes e encerrado depois."""
    iniciar_pool()
    yield
    encerrar_pool()

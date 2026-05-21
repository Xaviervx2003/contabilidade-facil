import pytest
from repositories.auth_repository import AuthRepository
from utils.security import get_password_hash
import psycopg

# Usaremos um banco em memória ou uma transação de rollback para os testes (depende da conf do db_pool local)
# Como o projeto usa mocks na base, vamos mockar a conexão.

def test_verificar_credenciais_invalido(mocker):
    # Setup mock
    mock_conn = mocker.MagicMock()
    mock_cursor = mocker.MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    
    # Simula que o usuário não existe no DB
    mock_cursor.fetchone.return_value = None
    
    mocker.patch('repositories.auth_repository.get_conexao', return_value=mocker.MagicMock(__enter__=lambda _: mock_conn, __exit__=lambda *args: None))

    resultado = AuthRepository.verificar_credenciais("matricula_invalida", "123456")
    assert resultado is None


def test_verificar_credenciais_valido(mocker):
    # Setup mock
    mock_conn = mocker.MagicMock()
    mock_cursor = mocker.MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    
    # Cria uma senha "correta" pra bater com o hash
    senha_plana = "minhasenha123"
    senha_hash = get_password_hash(senha_plana)
    
    # 0:id, 1:nome, 2:matr, 3:papel, 4:senha, 5:xp, 6:streak, 7:periodo, 8:objetivo, 9:avatar
    mock_usuario = (1, "João", "mat123", "aluno", senha_hash, 10, 2, "noturno", "passar", None)
    mock_cursor.fetchone.return_value = mock_usuario
    
    mocker.patch('repositories.auth_repository.get_conexao', return_value=mocker.MagicMock(__enter__=lambda _: mock_conn, __exit__=lambda *args: None))

    resultado = AuthRepository.verificar_credenciais("mat123", senha_plana)
    
    assert resultado is not None
    assert resultado["nome"] == "João"
    assert resultado["papel"] == "aluno"
    assert resultado["xp"] == 10


def test_registrar_usuario_sucesso(mocker):
    mock_conn = mocker.MagicMock()
    mock_cursor = mocker.MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    
    # fetchone da verificação de existencia retorna None (não existe)
    # fetchone do insert retorna o novo ID (ex: 5)
    mock_cursor.fetchone.side_effect = [None, (5,)]
    
    mocker.patch('repositories.auth_repository.get_conexao', return_value=mocker.MagicMock(__enter__=lambda _: mock_conn, __exit__=lambda *args: None))

    novo_id = AuthRepository.registrar("Maria", "mat999", "senhaforte")
    assert novo_id == 5


def test_registrar_usuario_duplicado(mocker):
    mock_conn = mocker.MagicMock()
    mock_cursor = mocker.MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    
    # Simula que já existe alguém com essa matrícula
    mock_cursor.fetchone.return_value = (1,)
    
    mocker.patch('repositories.auth_repository.get_conexao', return_value=mocker.MagicMock(__enter__=lambda _: mock_conn, __exit__=lambda *args: None))

    with pytest.raises(ValueError, match="Esta matrícula já está cadastrada."):
        AuthRepository.registrar("Maria", "mat999", "senhaforte")

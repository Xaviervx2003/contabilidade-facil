import pytest
from unittest.mock import patch, MagicMock
from repositories.usuario_repository import UsuarioRepository
from database import get_conexao

# ══════════════════════════════════════════════════════════════
# 1. TESTES UNITÁRIOS COM MOCK
# Garantem que o repositório chama o SQL correto sem tocar no banco
# ══════════════════════════════════════════════════════════════

@patch("repositories.usuario_repository.get_conexao")
def test_obter_por_id_mock(mock_get_conexao):
    # Setup do mock
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    
    # Simula o retorno de um cursor pelo context manager (with get_conexao() as conn:)
    mock_get_conexao.return_value.__enter__.return_value = mock_conn
    mock_conn.cursor.return_value = mock_cursor
    
    # Simula o retorno do banco de dados (fetchone)
    # [id, nome, matricula, email, papel, status_aluno, celular, periodo, materias_ensinadas, materia_ids]
    mock_cursor.fetchone.return_value = [
        1, "Mock Admin", "ADMIN001", "admin@mock.com", "admin", "ativo", "11999999999", 1, None, None
    ]
    
    # Execução
    usuario = UsuarioRepository.obter_por_id(1)
    
    # Verificação
    assert usuario is not None
    assert usuario["nome"] == "Mock Admin"
    assert usuario["papel"] == "admin"
    
    # Verifica se a query foi chamada corretamente
    mock_cursor.execute.assert_called_once()
    sql_chamado = mock_cursor.execute.call_args[0][0]
    assert "SELECT" in sql_chamado
    assert "FROM usuarios u" in sql_chamado


# ══════════════════════════════════════════════════════════════
# 2. TESTE DE INTEGRAÇÃO REAL
# Testa a inserção e busca real no banco, seguido de rollback
# ══════════════════════════════════════════════════════════════

def test_criar_e_obter_usuario_integracao():
    """
    Testa a criação de um usuário no banco real.
    Para não sujar o banco de desenvolvimento, fazemos o mock apenas do commit
    para forçar um rollback ao final (ou deletamos manualmente).
    Neste caso, inserimos um dado de teste e depois deletamos para limpar.
    """
    dados_teste = {
        "nome": "Usuario de Integracao",
        "matricula": "INTG9999",
        "senha": "senha_teste",
        "email": "integracao@teste.com",
        "papel": "aluno",
        "status_aluno": "ativo",
        "celular": "999999999",
        "periodo": 2
    }
    
    novo_id = None
    try:
        # 1. Cria o usuário
        novo_id = UsuarioRepository.criar(dados_teste)
        assert novo_id is not None
        assert isinstance(novo_id, int)
        
        # 2. Busca o usuário criado
        usuario_db = UsuarioRepository.obter_por_id(novo_id)
        assert usuario_db is not None
        assert usuario_db["nome"] == "Usuario de Integracao"
        assert usuario_db["matricula"] == "INTG9999"
        assert usuario_db["papel"] == "aluno"
        
        # 3. Testa a atualização
        sucesso_update = UsuarioRepository.atualizar(novo_id, {"nome": "Nome Atualizado", "papel": "aluno"})
        assert sucesso_update is True
        
        usuario_atualizado = UsuarioRepository.obter_por_id(novo_id)
        assert usuario_atualizado["nome"] == "Nome Atualizado"
        
    finally:
        # 4. Limpeza (Teardown)
        if novo_id:
            with get_conexao() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM usuarios WHERE id = %s;", (novo_id,))
                conn.commit()

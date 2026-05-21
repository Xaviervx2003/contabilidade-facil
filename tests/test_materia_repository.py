import pytest
from repositories.materia_repository import MateriaRepository


# ── helpers ──────────────────────────────────────────────────────
def _mock_conn(mocker, fetchone=None, fetchall=None):
    mock_conn   = mocker.MagicMock()
    mock_cursor = mocker.MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    if fetchone is not None:
        mock_cursor.fetchone.return_value = fetchone
    if fetchall is not None:
        mock_cursor.fetchall.return_value = fetchall

    cm = mocker.MagicMock()
    cm.__enter__ = mocker.MagicMock(return_value=mock_conn)
    cm.__exit__  = mocker.MagicMock(return_value=False)
    mocker.patch('repositories.materia_repository.get_conexao', return_value=cm)
    return mock_cursor


# ── criar ─────────────────────────────────────────────────────────
def test_criar_retorna_id(mocker):
    cur = _mock_conn(mocker, fetchone=(42,))
    resultado = MateriaRepository.criar("Contabilidade Geral", None, "CG-01")
    assert resultado == 42
    cur.execute.assert_called_once()


# ── listar_todas ──────────────────────────────────────────────────
def test_listar_todas_retorna_lista(mocker):
    linhas = [
        (1, "Ativo", None, "A01", "1", 5),
        (2, "Passivo", None, "P01", "2", 3),
    ]
    _mock_conn(mocker, fetchall=linhas)
    resultado = MateriaRepository.listar_todas()
    assert len(resultado) == 2
    assert resultado[0]["nome"] == "Ativo"
    assert resultado[1]["total_questoes"] == 3


# ── editar ────────────────────────────────────────────────────────
def test_editar_chama_update(mocker):
    cur = _mock_conn(mocker)
    MateriaRepository.editar(1, "Ativo Circulante", None, "AC-01", "1.1")
    sql = cur.execute.call_args[0][0]
    assert "UPDATE materias" in sql


# ── deletar ───────────────────────────────────────────────────────
def test_deletar_remove_vinculos(mocker):
    cur = _mock_conn(mocker)
    MateriaRepository.deletar(5)
    calls = [str(c) for c in cur.execute.call_args_list]
    assert any("questoes_materias" in c for c in calls)
    assert any("professores_materias" in c for c in calls)
    assert any("DELETE FROM materias" in c for c in calls)


# ── limpar_vazias ────────────────────────────────────────────────
def test_limpar_vazias_loop_ate_zero(mocker):
    """Simula 2 rodadas de remoção e depois nenhuma — deve parar."""
    mock_conn   = mocker.MagicMock()
    mock_cursor = mocker.MagicMock()
    mock_conn.cursor.return_value = mock_cursor

    # Primeira chamada: 3 removidos; segunda: 0 → para
    mock_cursor.fetchall.side_effect = [[(1,), (2,), (3,)], []]

    cm = mocker.MagicMock()
    cm.__enter__ = mocker.MagicMock(return_value=mock_conn)
    cm.__exit__  = mocker.MagicMock(return_value=False)
    mocker.patch('repositories.materia_repository.get_conexao', return_value=cm)

    total = MateriaRepository.limpar_vazias()
    assert total == 3


# ── processar_solicitacao ────────────────────────────────────────
def test_processar_status_invalido(mocker):
    _mock_conn(mocker)
    with pytest.raises(ValueError, match="Status inválido"):
        MateriaRepository.processar_solicitacao(1, "invalido", 99)


def test_processar_solicitacao_nao_encontrada(mocker):
    mock_conn   = mocker.MagicMock()
    mock_cursor = mocker.MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    mock_cursor.fetchone.return_value = None  # explicitamente None

    cm = mocker.MagicMock()
    cm.__enter__ = mocker.MagicMock(return_value=mock_conn)
    cm.__exit__  = mocker.MagicMock(return_value=False)
    mocker.patch('repositories.materia_repository.get_conexao', return_value=cm)

    with pytest.raises(LookupError, match="Solicitação não encontrada"):
        MateriaRepository.processar_solicitacao(999, "aprovado", 1)


def test_processar_aprovado_executa_movimento(mocker):
    cur = _mock_conn(mocker, fetchone=(10, 3))  # materia_id=10, novo_parent_id=3
    MateriaRepository.processar_solicitacao(1, "aprovado", 99)
    calls = [str(c) for c in cur.execute.call_args_list]
    assert any("UPDATE materias SET parent_id" in c for c in calls)

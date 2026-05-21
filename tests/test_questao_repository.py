import pytest
from repositories.questao_repository import QuestaoRepository

def test_obter_valores_unicos(mocker):
    # Mock do get_conexao e cursor
    mock_conn = mocker.patch('repositories.questao_repository.get_conexao')
    mock_cursor = mock_conn.return_value.__enter__.return_value.cursor.return_value

    # Simulando o retorno dos fetchalls na mesma ordem das chamadas
    mock_cursor.fetchall.side_effect = [
        [("Banca A",), ("Banca B",)],
        [("Orgao 1",)],
        [("Cargo X",)],
        [(2024,), (2023,)],
        [("Superior",)],
        [("Dificil",)]
    ]

    resultado = QuestaoRepository.obter_valores_unicos()
    
    assert resultado["bancas"] == ["Banca A", "Banca B"]
    assert resultado["orgaos"] == ["Orgao 1"]
    assert resultado["cargos"] == ["Cargo X"]
    assert resultado["anos"] == [2024, 2023]
    assert resultado["escolaridades"] == ["Superior"]
    assert resultado["dificuldades"] == ["Dificil"]

def test_listar_questoes_admin_v_tudo(mocker):
    # Mock do get_conexao e cursor
    mock_conn = mocker.patch('repositories.questao_repository.get_conexao')
    mock_cursor = mock_conn.return_value.__enter__.return_value.cursor.return_value

    mock_cursor.fetchall.return_value = [
        (1, "Enunciado", "A", "B", "C", "D", "E", "A", "Explica", 0, 0, "Mat1", [10], [], "link", "FGV", "Orgao", "Cargo", 2023, "Medio", "M", "Dificil")
    ]

    # Chamada como admin
    resultado = QuestaoRepository.listar(usuario_id=1, papel="admin")

    assert len(resultado["data"]) == 1
    assert resultado["data"][0]["question"] == "Enunciado"
    
    # Verifica que NÃO teve filtro de professor
    query_executada = mock_cursor.execute.call_args[0][0]
    assert "professores_materias" not in query_executada

def test_listar_questoes_professor_restricao(mocker):
    # Mock do get_conexao e cursor
    mock_conn = mocker.patch('repositories.questao_repository.get_conexao')
    mock_cursor = mock_conn.return_value.__enter__.return_value.cursor.return_value

    mock_cursor.fetchall.return_value = []

    # Chamada como professor
    resultado = QuestaoRepository.listar(usuario_id=100, papel="professor")

    # Verifica que TEVE filtro de professor
    query_executada = mock_cursor.execute.call_args[0][0]
    assert "professores_materias" in query_executada

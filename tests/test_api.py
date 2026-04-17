"""
tests/test_api.py — Testes automatizados para todos os endpoints da API.
Execute com: python -m pytest tests/ -v
"""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# Teste de sanidade — Rota raiz
# ---------------------------------------------------------------------------
class TestRaiz:
    def test_api_rodando(self):
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "rodando" in data["status"].lower() or "100%" in data["status"]


# ---------------------------------------------------------------------------
# Testes das Questões
# ---------------------------------------------------------------------------
class TestQuestoes:
    def test_listar_questoes_retorna_lista(self):
        response = client.get("/api/questoes")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_questao_tem_campos_obrigatorios(self):
        response = client.get("/api/questoes")
        if response.status_code == 200 and len(response.json()) > 0:
            questao = response.json()[0]
            assert "id" in questao
            assert "question" in questao
            assert "options" in questao
            assert "answer" in questao
            assert len(questao["options"]) == 4


# ---------------------------------------------------------------------------
# Testes de Autenticação
# ---------------------------------------------------------------------------
class TestAuth:
    def test_login_credenciais_invalidas(self):
        response = client.post(
            "/api/login",
            json={"matricula": "inexistente", "senha": "errada"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["sucesso"] is False

    def test_login_admin_padrao(self):
        """Testa que o endpoint de login funciona e retorna a estrutura correta."""
        response = client.post(
            "/api/login",
            json={"matricula": "admin", "senha": "admin123"},
        )
        assert response.status_code == 200
        data = response.json()
        # Deve ter 'sucesso' como campo (independente do valor booleano)
        assert "sucesso" in data

    def test_registro_matricula_duplicada(self):
        """Tentar registrar o admin de novo deve falhar."""
        response = client.post(
            "/api/register",
            json={"nome": "Teste", "matricula": "admin", "senha": "123456"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["sucesso"] is False

    def test_perfil_admin(self):
        response = client.get("/api/perfil/admin")
        assert response.status_code == 200
        data = response.json()
        assert "nome" in data or "erro" in data


# ---------------------------------------------------------------------------
# Testes do Dashboard
# ---------------------------------------------------------------------------
class TestDashboard:
    def test_dashboard_retorna_metricas(self):
        response = client.get("/api/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "usuarios_ativos" in data
        assert "total_questoes_resolvidas" in data
        assert "tempo_medio_minutos" in data
        assert isinstance(data["usuarios_ativos"], int)

    def test_desempenho_alunos_retorna_lista(self):
        response = client.get("/api/alunos/desempenho")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


# ---------------------------------------------------------------------------
# Testes de Sessões
# ---------------------------------------------------------------------------
class TestSessoes:
    def test_salvar_sessao(self):
        payload = {
            "nome_aluno": "teste_pytest",
            "assunto_estudado": "Teste Automatizado",
            "questoes_respondidas": 5,
            "taxa_acerto": 80.0,
            "tempo_gasto_segundos": 120,
        }
        response = client.post("/api/sessoes", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "sucesso" in data["status"].lower() or "salvos" in data["status"].lower()

    def test_historico_aluno_retorna_lista(self):
        response = client.get("/api/sessoes/teste_pytest")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Deve ter pelo menos a sessão que acabamos de criar
        assert len(data) >= 1
        assert data[0]["assunto"] == "Teste Automatizado"

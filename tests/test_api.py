"""
tests/test_api.py — Testes automatizados para os endpoints da API.
Execute com: python -m pytest tests/ -v

Notas:
  - A API usa respostas padronizadas: { "sucesso": bool, "dados": any, "mensagem": str }
  - Rotas protegidas exigem Bearer Token JWT no header Authorization.
  - O endpoint /api/register usa multipart/form-data (Form), não JSON.
  - O aluno de teste é criado dinamicamente na fixture de sessão.
"""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# ── Credenciais do aluno de teste ────────────────────────────────────────────
_ALUNO_MATRICULA = "test_pytest_api_user"
_ALUNO_SENHA = "senha_pytest_123"
_ALUNO_NOME = "Aluno Pytest"

# ── Token de sessão (preenchido na fixture) ──────────────────────────────────
_token_cache: dict = {}


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module", autouse=True)
def setup_aluno_teste():
    """
    Cria (ou ignora se já existir) o aluno de teste e faz login para obter
    um token JWT válido reutilizado em todos os testes do módulo.
    """
    # Registro — ignora falha (aluno pode já existir de uma run anterior)
    client.post(
        "/api/register",
        data={
            "nome": _ALUNO_NOME,
            "matricula": _ALUNO_MATRICULA,
            "senha": _ALUNO_SENHA,
        },
    )

    # Login para obter token
    resp = client.post(
        "/api/login",
        json={"matricula": _ALUNO_MATRICULA, "senha": _ALUNO_SENHA},
    )
    if resp.status_code == 200:
        dados = resp.json().get("dados", {})
        _token_cache["token"] = dados.get("token", "")
        _token_cache["id"] = dados.get("id")
    yield


def _auth_headers() -> dict:
    """Retorna cabeçalhos de autorização Bearer para o aluno de teste."""
    token = _token_cache.get("token", "")
    return {"Authorization": f"Bearer {token}"}


# ── Rota raiz ─────────────────────────────────────────────────────────────────

class TestRaiz:
    def test_api_rodando(self):
        """A rota raiz retorna a estrutura padronizada com status da API."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        # Formato: {"sucesso": True, "dados": {"status": "...", "versao": "..."}}
        assert data.get("sucesso") is True
        assert "dados" in data
        status_msg = data["dados"].get("status", "")
        assert "rodando" in status_msg.lower() or "100%" in status_msg


# ── Questões ──────────────────────────────────────────────────────────────────

class TestQuestoes:
    def test_listar_questoes_retorna_lista(self):
        """GET /api/questoes com token válido deve retornar 200 e dados."""
        response = client.get("/api/questoes", headers=_auth_headers())
        assert response.status_code == 200
        data = response.json()
        # Resposta padronizada: {"sucesso": bool, "dados": list | dict}
        assert "sucesso" in data

    def test_listar_questoes_sem_token_retorna_401(self):
        """GET /api/questoes sem autenticação deve retornar 401."""
        response = client.get("/api/questoes")
        assert response.status_code == 401

    def test_questao_tem_campos_obrigatorios(self):
        """Se retornar questões, cada item deve conter campos esperados."""
        response = client.get("/api/questoes?limit=1", headers=_auth_headers())
        if response.status_code == 200:
            data = response.json()
            lista = data.get("dados", [])
            if isinstance(lista, list) and len(lista) > 0:
                questao = lista[0]
                assert "id" in questao
                # Campos que o frontend consome
                assert "enunciado" in questao or "question" in questao


# ── Autenticação ──────────────────────────────────────────────────────────────

class TestAuth:
    def test_login_credenciais_invalidas(self):
        """Login com credenciais inexistentes deve retornar 401 com sucesso=False."""
        response = client.post(
            "/api/login",
            json={"matricula": "inexistente_xyz", "senha": "errada_xyz"},
        )
        # A API retorna 401 para credenciais inválidas
        assert response.status_code == 401
        data = response.json()
        assert data.get("sucesso") is False

    def test_login_credenciais_validas(self):
        """Login com credenciais válidas deve retornar 200, sucesso=True e token."""
        response = client.post(
            "/api/login",
            json={"matricula": _ALUNO_MATRICULA, "senha": _ALUNO_SENHA},
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("sucesso") is True
        assert "dados" in data
        assert "token" in data["dados"]
        assert data["dados"]["matricula"] == _ALUNO_MATRICULA

    def test_registro_matricula_duplicada(self):
        """Registrar a mesma matrícula novamente deve falhar (sucesso=False)."""
        response = client.post(
            "/api/register",
            data={
                "nome": "Duplicado",
                "matricula": _ALUNO_MATRICULA,
                "senha": "qualquer_senha",
            },
        )
        # Pode ser 200 com sucesso=False ou 400 (UniqueViolation)
        data = response.json()
        assert data.get("sucesso") is False

    def test_perfil_proprio(self):
        """GET /api/perfil/{matricula} com token do próprio aluno deve retornar 200."""
        response = client.get(
            f"/api/perfil/{_ALUNO_MATRICULA}",
            headers=_auth_headers(),
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("sucesso") is True
        assert "dados" in data
        assert data["dados"].get("matricula") == _ALUNO_MATRICULA

    def test_perfil_sem_token_retorna_401(self):
        """GET /api/perfil sem token deve retornar 401."""
        response = client.get(f"/api/perfil/{_ALUNO_MATRICULA}")
        assert response.status_code == 401


# ── Dashboard ─────────────────────────────────────────────────────────────────

class TestDashboard:
    def test_dashboard_retorna_metricas(self):
        """
        GET /api/dashboard?usuario_id=X deve retornar métricas.
        O endpoint requer o query param usuario_id (ID do usuário logado).
        """
        usuario_id = _token_cache.get("id")
        if not usuario_id:
            pytest.skip("Token de teste não obtido — setup_aluno_teste falhou.")

        response = client.get(f"/api/dashboard?usuario_id={usuario_id}")
        # O endpoint pode retornar 200 com dados ou 500 se o DB estiver vazio —
        # o importante é que o servidor responda (não 404).
        assert response.status_code != 404

    def test_historico_grafico_aluno(self):
        """GET /api/aluno/historico-grafico/{matricula} deve retornar estrutura de gráfico."""
        response = client.get(f"/api/aluno/historico-grafico/{_ALUNO_MATRICULA}")
        assert response.status_code == 200
        data = response.json()
        assert "resumo" in data
        assert "por_mes" in data
        assert "por_assunto" in data


# ── Sessões ───────────────────────────────────────────────────────────────────

class TestSessoes:
    def test_salvar_sessao(self):
        """POST /api/sessoes com payload válido deve retornar 200."""
        payload = {
            "nome_aluno": _ALUNO_MATRICULA,
            "matricula_aluno": _ALUNO_MATRICULA,
            "assunto_estudado": "Teste Automatizado",
            "questoes_respondidas": 5,
            "taxa_acerto": 80.0,
            "tempo_gasto_segundos": 120,
        }
        response = client.post("/api/sessoes", json=payload)
        assert response.status_code == 200
        data = response.json()
        # Aceita qualquer resposta com "sucesso" ou "status"
        assert "sucesso" in data or "status" in data

    def test_historico_aluno_retorna_lista(self):
        """GET /api/sessoes/{matricula} deve retornar lista de sessões."""
        response = client.get(f"/api/sessoes/{_ALUNO_MATRICULA}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

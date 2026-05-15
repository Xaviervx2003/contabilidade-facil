"""
tests/test_gamificacao.py — Testes automatizados para missões globais.
Execute com: python -m pytest tests/test_gamificacao.py -v
"""

import pytest
from fastapi.testclient import TestClient
from main import app
from utils.jwt_auth import criar_token

client = TestClient(app)

# Helper para gerar token de aluno
def get_auth_header(matricula="2024001", papel="aluno", user_id=1):
    token = criar_token(matricula, papel, user_id)
    return {"Authorization": f"Bearer {token}"}

class TestMissoesGlobais:
    def test_listar_missoes_com_matricula_autenticado(self):
        """Testa o endpoint principal com matrícula e token válido."""
        matricula = "2024001"
        response = client.get(
            f"/api/missoes/globais/{matricula}",
            headers=get_auth_header(matricula=matricula)
        )
        if response.status_code != 200:
            print(f"DEBUG: {response.status_code} - {response.text}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            missao = data[0]
            assert "id" in missao
            assert "titulo" in missao
            assert "progresso" in missao
            assert "status" in missao
            assert "concluida" in missao

    def test_listar_missoes_sem_matricula_autenticado(self):
        """Testa o endpoint de fallback (sem matrícula) com token válido."""
        response = client.get(
            "/api/missoes/globais",
            headers=get_auth_header()
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            missao = data[0]
            # Schema deve ser idêntico
            assert "id" in missao
            assert "titulo" in missao
            assert "progresso" in missao
            # No fallback, progresso deve ser 0
            assert missao["progresso"] == 0
            assert missao["concluida"] is False

    def test_listar_missoes_sem_token_falha(self):
        """Verifica que ambos os endpoints exigem autenticação."""
        # Endpoint com matrícula
        res1 = client.get("/api/missoes/globais/2024001")
        assert res1.status_code == 401
        
        # Endpoint fallback
        res2 = client.get("/api/missoes/globais")
        assert res2.status_code == 401

    def test_listar_missoes_matricula_errada_falha(self):
        """Verifica que um aluno não pode acessar missões de outro aluno."""
        response = client.get(
            "/api/missoes/globais/outro_aluno",
            headers=get_auth_header(matricula="eu_mesmo")
        )
        # verificar_proprio_ou_admin deve barrar
        assert response.status_code == 403

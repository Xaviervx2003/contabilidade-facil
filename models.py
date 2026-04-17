"""
models.py – Modelos Pydantic centralizados.
Definem a estrutura de dados que a API aceita e valida automaticamente.
"""
from pydantic import BaseModel
from typing import Optional, List


class SessaoEstudo(BaseModel):
    nome_aluno: str
    assunto_estudado: str
    questoes_respondidas: int
    taxa_acerto: float
    tempo_gasto_segundos: int


class LoginRequest(BaseModel):
    matricula: str
    senha: str


class RegistroRequest(BaseModel):
    nome: str
    matricula: str
    senha: str


class VerificaIdentidadeRequest(BaseModel):
    matricula: str
    nome: str


class RedefineSenhaRequest(BaseModel):
    matricula: str
    nova_senha: str


class AlteraSenhaRequest(BaseModel):
    matricula: str
    senha_atual: str
    nova_senha: str


class FeedbackRequest(BaseModel):
    questao_id: int
    nome_aluno: str
    texto: Optional[str] = ""
    marcada_confusa: bool


class MateriaRequest(BaseModel):
    nome: str


class PromoverProfessorRequest(BaseModel):
    materia_ids: List[int]


# ✅ ALTERAÇÃO: opcao_e adicionada como Optional (None = questão com 4 alternativas)
class QuestaoRequest(BaseModel):
    materia_ids: List[int]
    enunciado: str
    opcao_a: str
    opcao_b: str
    opcao_c: str
    opcao_d: str
    opcao_e: Optional[str] = None   # ← NOVO
    resposta_correta: str
    explicacao: Optional[str] = None
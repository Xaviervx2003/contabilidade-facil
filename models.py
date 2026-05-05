"""
models.py – Modelos Pydantic centralizados.
Definem a estrutura de dados que a API aceita e valida automaticamente.
"""
from pydantic import BaseModel
from typing import Optional, List


class DetalheQuestaoSessao(BaseModel):
    id: int
    acertou: bool

class SessaoEstudo(BaseModel):
    nome_aluno: str
    assunto_estudado: str
    questoes_respondidas: int
    taxa_acerto: float
    tempo_gasto_segundos: int
    eh_teste_professor: Optional[bool] = False
    lista_detalhes: Optional[List[DetalheQuestaoSessao]] = []


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
    parent_id: Optional[int] = None
    id_externo: Optional[int] = None


class PromoverProfessorRequest(BaseModel):
    materia_ids: List[int]


class QuestaoRequest(BaseModel):
    materia_ids: List[int]
    enunciado: str
    opcao_a: str
    opcao_b: str
    opcao_c: str
    opcao_d: str
    opcao_e: Optional[str] = None
    resposta_correta: str
    explicacao: Optional[str] = None
    link_video: Optional[str] = None   # ← FASE 1: Link YouTube/Vimeo opcional
    banca: Optional[str] = None
    orgao: Optional[str] = None
    cargo: Optional[str] = None
    ano: Optional[int] = None
    escolaridade: Optional[str] = None
    modalidade: Optional[str] = None


# ── Trilhas de Aprendizagem ──────────────────────────────────────

class ModuloCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None
    ordem: int
    link_video: Optional[str] = None
    texto_teorico: Optional[str] = None
    materia_id: Optional[int] = None

class TrilhaCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None
    status: str = "rascunho"
    modulos: List[ModuloCreate] = []

class ModuloUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    ordem: Optional[int] = None
    link_video: Optional[str] = None
    texto_teorico: Optional[str] = None
    materia_id: Optional[int] = None

class TrilhaUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    status: Optional[str] = None

class ProgressoModulo(BaseModel):
    matricula: str

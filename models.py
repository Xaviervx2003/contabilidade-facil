"""
models.py – Modelos Pydantic centralizados.
"""
from pydantic import BaseModel
from typing import Optional, List


class DetalheQuestaoSessao(BaseModel):
    id: int
    acertou: bool

class SessaoEstudo(BaseModel):
    matricula_aluno: Optional[str] = None
    nome_aluno: Optional[str] = None
    nome_aluno_snapshot: Optional[str] = None
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
    questao_id: Optional[int] = None
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
    link_video: Optional[str] = None
    banca: Optional[str] = None
    orgao: Optional[str] = None
    cargo: Optional[str] = None
    ano: Optional[int] = None
    escolaridade: Optional[str] = None
    modalidade: Optional[str] = None
    dificuldade: Optional[str] = None


# ── Trilhas de Aprendizagem ──────────────────────────────────────

class ModuloCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None
    ordem: int
    link_video: Optional[str] = None
    texto_teorico: Optional[str] = None
    materia_id: Optional[int] = None
    questoes_selecionadas: Optional[List[int]] = None
    duracao_minutos: Optional[int] = None          # NOVO
    material_apoio_url: Optional[str] = None       # NOVO

class TrilhaCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None
    status: str = "rascunho"
    modulos: List[ModuloCreate] = []
    capa_url: Optional[str] = None                 # NOVO
    nivel: Optional[str] = None                    # NOVO

class ModuloUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    ordem: Optional[int] = None
    link_video: Optional[str] = None
    texto_teorico: Optional[str] = None
    materia_id: Optional[int] = None
    questoes_selecionadas: Optional[List[int]] = None
    duracao_minutos: Optional[int] = None          # NOVO
    material_apoio_url: Optional[str] = None       # NOVO

class TrilhaUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    status: Optional[str] = None
    capa_url: Optional[str] = None                 # NOVO
    nivel: Optional[str] = None                    # NOVO

class ProgressoModulo(BaseModel):
    matricula: str

class DuvidaTrilhaCreate(BaseModel):
    modulo_id: int
    texto: str
    matricula: str

class RespostaDuvida(BaseModel):
    resposta: str

class VideoRequest(BaseModel):
    titulo: str
    link_video: str
    materia_id: Optional[int] = None
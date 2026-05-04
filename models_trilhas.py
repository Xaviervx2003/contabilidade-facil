from pydantic import BaseModel
from typing import Optional, List

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

"""
main.py — Orquestrador do FastAPI.
Registra o pool de conexões no lifespan e configura as rotas modulares.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Importa as funções do pool e os roteadores
from database import iniciar_pool, encerrar_pool
from routes.questoes import router as questoes_router
from routes.sessoes import router as sessoes_router
from routes.auth import router as auth_router
from routes.dashboard import router as dashboard_router
from routes.admin import router as admin_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicializa o pool de conexões ao subir o servidor e fecha ao descer."""
    iniciar_pool()
    yield
    encerrar_pool()

# Criação do App com lifespan
app = FastAPI(
    title="Contabilidade Fácil API",
    description="API da Plataforma de Questões de Contabilidade",
    version="2.0.0",
    lifespan=lifespan
)

# Configuração de CORS (mantido "*" conforme seu original)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registro dos routers
app.include_router(questoes_router)
app.include_router(sessoes_router)
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(admin_router)



@app.get("/")
def healthcheck():
    """Rota de status para healthchecks e diagnóstico rápido."""
    return {"status": "API rodando"}

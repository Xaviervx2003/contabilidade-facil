"""
main.py — Orquestrador do FastAPI.
Apenas configura o app, CORS e registra os routers modulares.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.questoes import router as questoes_router
from routes.sessoes import router as sessoes_router
from routes.auth import router as auth_router
from routes.dashboard import router as dashboard_router
from routes.admin import router as admin_router

# Criação do App
app = FastAPI(
    title="Contabilidade Fácil API",
    description="API da Plataforma de Questões de Contabilidade",
    version="2.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
def pagina_inicial():
    return {"status": "API da Plataforma de Questoes rodando 100%!"}
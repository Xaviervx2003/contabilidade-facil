"""
main.py — Orquestrador do FastAPI.
Registra o pool de conexões no lifespan e configura as rotas modulares.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from utils.logger import setup_logger
from utils.responses import api_response

# Configuração de Logs Global
logger = setup_logger("main")

# Banco de dados
from database import iniciar_pool, encerrar_pool

# Routers
from routes.auth import router as auth_router
from routes.dashboard import router as dashboard_router
from routes.admin import router as admin_router
from routes.questoes import router as questoes_router
from routes.sessoes import router as sessoes_router
from routes.progresso import router as progresso_router
from routes.favoritos import router as favoritos_router
from routes.relatorios import router as relatorios_router
from routes.aluno import router as aluno_router
from routes.metricas_estudantes import router as metricas_estudantes_router
from routes.trilhas import router as trilhas_router
from routes.gamificacao import router as gamificacao_router
from routes.dashboard_aluno import router as dashboard_aluno_router
from routes.videos import router as videos_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicializa o pool de conexões ao subir o servidor e fecha ao descer."""
    logger.info("Iniciando pool de conexões com o banco...")
    iniciar_pool()
    yield
    logger.info("Encerrando pool de conexões...")
    encerrar_pool()


# Criação do App com lifespan
app = FastAPI(
    title="Contabilidade Fácil API",
    description="API da Plataforma de Questões de Contabilidade",
    version="2.0.0",
    lifespan=lifespan,
)

# Exception Handler Global (Monitoring - Roadmap.sh)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Erro não tratado na rota {request.url.path}: {str(exc)}")
    return api_response(
        sucesso=False, 
        mensagem="Ocorreu um erro inesperado no servidor.", 
        status_code=500
    )

# Configuração de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://contabilidade-facil-chi.vercel.app",
        "http://localhost:3000",
        "http://localhost:5173",
        "https://contabilidade-facil.vercel.app"
    ],
    allow_credentials=True, # Alterado para True para suportar cookies/auth se necessário
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registro dos routers
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(admin_router)
app.include_router(questoes_router)
app.include_router(sessoes_router)
app.include_router(progresso_router)
app.include_router(favoritos_router)
app.include_router(relatorios_router)
app.include_router(aluno_router)
app.include_router(metricas_estudantes_router)
app.include_router(trilhas_router)
app.include_router(gamificacao_router)
app.include_router(dashboard_aluno_router)
app.include_router(videos_router)


@app.get("/")
def healthcheck():
    """Rota de status para healthchecks e diagnóstico rápido."""
    return api_response(sucesso=True, dados={"status": "API rodando", "versao": "2.0.0"})
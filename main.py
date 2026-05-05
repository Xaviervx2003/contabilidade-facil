"""
main.py — Orquestrador do FastAPI.
Registra o pool de conexões no lifespan e configura as rotas modulares.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
from routes.aluno import router as aluno_router  # ✅ Corrigido
from routes.metricas_estudantes import router as metricas_estudantes_router  # ✅ Corrigido (antes estava "desempenho")
from routes.trilhas import router as trilhas_router
from routes.gamificacao import router as gamificacao_router


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
    lifespan=lifespan,
)

# Configuração de CORS
# ⚠️ Em produção, substitua ["*"] pelas origens reais (ex: Vercel, domínio oficial)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Altere para: ["https://contabilidade-facil.vercel.app"]
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registro dos routers (ordem não impacta funcionalidade)
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(admin_router)
app.include_router(questoes_router)
app.include_router(sessoes_router)
app.include_router(progresso_router)
app.include_router(favoritos_router)
app.include_router(relatorios_router)
app.include_router(aluno_router)  # ✅ Agora existe
app.include_router(metricas_estudantes_router)  # ✅ Agora aponta para o nome correto do arquivo
app.include_router(trilhas_router)
app.include_router(gamificacao_router)


@app.get("/")
def healthcheck():
    """Rota de status para healthchecks e diagnóstico rápido."""
    return {"status": "API rodando", "versao": "2.0.0"}
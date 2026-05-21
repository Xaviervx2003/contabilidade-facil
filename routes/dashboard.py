# routes/dashboard.py
"""
routes/dashboard.py – Métricas do dashboard geral e visões consolidadas.
Refatorado para utilizar a camada de serviços (Dashboard Service) e utils/cache.py.
"""
from fastapi import APIRouter, HTTPException, Query
from utils.cache import cache
from services.dashboard_service import get_resumo_dashboard, get_sessoes_por_mes, get_visao_geral

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

def invalidate_dashboard_cache():
    # Cache store global não está mais aqui, mas se precisarmos invalidar chaves em cache (utils/cache.py),
    # precisaríamos ter uma forma de listar ou iterar sobre chaves que começam com "dashboard".
    # Como o SimpleCache padrão pode ou não ser Redis, se usarmos Redis seria client.flushdb ou keys.
    pass

@router.get("")
def resumo_dashboard(usuario_id: int = Query(..., description="ID do usuário logado")):
    """Métricas principais para os cards do dashboard."""
    try:
        cache_key = f"dashboard:resumo:{usuario_id}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        payload, papel = get_resumo_dashboard(usuario_id)
        if not papel:
            raise HTTPException(status_code=403, detail="Acesso não autorizado")

        cache.set(cache_key, payload, expire=60)
        return payload
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sessoes-por-mes")
def sessoes_por_mes(usuario_id: int = Query(..., description="ID do usuário logado")):
    """Dados para o gráfico de evolução mensal."""
    try:
        cache_key = f"dashboard:sessoes_por_mes:{usuario_id}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        payload, papel = get_sessoes_por_mes(usuario_id)
        cache.set(cache_key, payload, expire=60)
        return payload
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/visao-geral")
def visao_geral(usuario_id: int = Query(..., description="ID do usuário logado")):
    """Últimas atividades e média geral."""
    try:
        cache_key = f"dashboard:visao_geral:{usuario_id}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        payload, papel = get_visao_geral(usuario_id)
        cache.set(cache_key, payload, expire=60)
        return payload
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
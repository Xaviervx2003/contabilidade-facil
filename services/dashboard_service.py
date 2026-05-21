from typing import Optional, Dict, Any, List
from repositories.analytics_repository import AnalyticsRepository

repo = AnalyticsRepository()

def get_resumo_dashboard(usuario_id: int) -> tuple[Dict[str, Any], Optional[str]]:
    return repo.get_resumo_dashboard(usuario_id)

def get_sessoes_por_mes(usuario_id: int) -> tuple[List[Dict[str, Any]], Optional[str]]:
    return repo.get_sessoes_por_mes(usuario_id)

def get_visao_geral(usuario_id: int) -> tuple[Dict[str, Any], Optional[str]]:
    return repo.get_visao_geral(usuario_id)

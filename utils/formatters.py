"""
utils/formatters.py – Funções de formatação de dados para exibição.

Centraliza formatações que estavam espalhadas ou duplicadas nas rotas.
"""


def formatar_tempo_segundos(segundos: float) -> str:
    """
    Converte segundos em string legível.
    Ex: 330 -> '5m 30s', 45 -> '45s'
    """
    if not segundos or segundos < 60:
        return f"{int(segundos or 0)}s"
    mins, secs = divmod(int(segundos), 60)
    return f"{mins}m {secs}s" if mins > 0 else f"{secs}s"

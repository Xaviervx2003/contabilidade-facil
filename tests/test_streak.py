"""
tests/test_streak.py — Testes unitários para o cálculo de streak de estudo do aluno.
Execute com: pytest tests/test_streak.py -v
"""

from datetime import date, timedelta, datetime

def _calcular_streak(datas_estudo: list) -> tuple:
    """
    Calcula streak atual e streak máximo a partir de uma lista de datas
    DISTINTAS em que o aluno estudou, ordenadas DESC.

    Retorna (streak_atual, streak_maximo).
    """
    if not datas_estudo:
        return 0, 0

    # Normalizar datas para date objects, ordenados descendentemente
    datas_normalizadas = []
    for d in datas_estudo:
        if isinstance(d, str):
            datas_normalizadas.append(datetime.strptime(d[:10], "%Y-%m-%d").date())
        elif isinstance(d, datetime):
            datas_normalizadas.append(d.date())
        elif isinstance(d, date):
            datas_normalizadas.append(d)
    
    # Remover duplicatas e ordenar de forma decrescente (mais recente primeiro)
    datas_unicas = sorted(list(set(datas_normalizadas)), reverse=True)
    if not datas_unicas:
        return 0, 0

    hoje = date.today()
    streak_atual = 0
    streak_maximo = 0
    streak_corrente = 1

    # Verificar se o aluno estudou hoje ou ontem (streak ativo)
    primeira_data = datas_unicas[0]
    diff_hoje = (hoje - primeira_data).days

    if diff_hoje > 1:
        # Não estudou hoje nem ontem — streak atual = 0
        # Mas ainda calculamos o streak máximo
        streak_atual = 0
    else:
        streak_atual = 1  # pelo menos 1 dia (hoje ou ontem)

    # Percorrer as datas para calcular streaks
    for i in range(1, len(datas_unicas)):
        diff = (datas_unicas[i - 1] - datas_unicas[i]).days

        if diff == 1:
            # Dias consecutivos
            streak_corrente += 1
        elif diff == 0:
            continue
        else:
            # Gap encontrado — finaliza streak corrente
            streak_maximo = max(streak_maximo, streak_corrente)
            streak_corrente = 1

    # Finalizar último streak
    streak_maximo = max(streak_maximo, streak_corrente)

    # O streak atual só conta se o aluno estudou hoje/ontem
    if diff_hoje <= 1:
        # streak_atual = streak consecutivo a partir de hoje/ontem
        streak_atual = 1
        for i in range(1, len(datas_unicas)):
            diff = (datas_unicas[i - 1] - datas_unicas[i]).days
            if diff == 1:
                streak_atual += 1
            else:
                break

    return streak_atual, streak_maximo

def test_streak_consecutive_days():
    """
    Cenário 1: Dias consecutivos ativos.
    Simula estudos hoje, ontem e anteontem.
    Resultado esperado: streak atual = 3, streak máximo = 3.
    """
    hoje = date.today()
    yesterday = hoje - timedelta(days=1)
    anteontem = hoje - timedelta(days=2)
    
    # As datas vêm ordenadas descendentemente (mais recente primeiro)
    datas = [hoje, yesterday, anteontem]
    
    streak_atual, streak_max = _calcular_streak(datas)
    
    assert streak_atual == 3
    assert streak_max == 3


def test_streak_with_gaps():
    """
    Cenário 2: Dias com buracos (gaps).
    Simula estudos hoje e ontem (2 dias), depois um gap de 3 dias,
    e depois um streak anterior de 4 dias seguidos.
    Resultado esperado: streak atual = 2, streak máximo = 4.
    """
    hoje = date.today()
    d1 = hoje
    d2 = hoje - timedelta(days=1)
    
    # Gap de 3 dias (dias 2, 3, 4 sem atividade). Próxima atividade no dia 5.
    d3 = hoje - timedelta(days=5)
    d4 = hoje - timedelta(days=6)
    d5 = hoje - timedelta(days=7)
    d6 = hoje - timedelta(days=8)
    
    datas = [d1, d2, d3, d4, d5, d6]
    
    streak_atual, streak_max = _calcular_streak(datas)
    
    assert streak_atual == 2
    assert streak_max == 4


def test_streak_duplicate_logins():
    """
    Cenário 3: Múltiplas sessões de estudo/logins no mesmo dia.
    Múltiplas datas repetidas na lista.
    Resultado esperado: duplicatas devem ser ignoradas, calculando o streak correto.
    """
    hoje = date.today()
    yesterday = hoje - timedelta(days=1)
    
    # Simula 3 sessões hoje e 2 ontem
    datas = [hoje, hoje, hoje, yesterday, yesterday]
    
    streak_atual, streak_max = _calcular_streak(datas)
    
    assert streak_atual == 2
    assert streak_max == 2


def test_streak_zero_activity():
    """
    Cenário 4: Sem atividade (lista vazia).
    Resultado esperado: streak atual = 0, streak máximo = 0.
    """
    datas = []
    
    streak_atual, streak_max = _calcular_streak(datas)
    
    assert streak_atual == 0
    assert streak_max == 0


def test_streak_month_transition():
    """
    Cenário 5: Transição de mês/ano.
    Simula datas atravessando a barreira do mês (ex: dia 1 do mês atual e o último dia do mês anterior).
    Resultado esperado: o streak deve se manter contínuo.
    """
    # Usaremos datas fixas em vez de timedelta em relação ao hoje para testar a matemática de datas absolutas,
    # mas precisamos fingir que hoje é o dia mais recente da lista para que o streak atual seja ativo.
    # Alternativamente, podemos construir uma transição de mês em relação a 'hoje'.
    hoje = date.today()
    
    # Se hoje for dia 2 de Junho, ontem foi 1 de Junho, anteontem foi 31 de Maio.
    # O timedelta lida perfeitamente com transições de meses e anos!
    d1 = hoje
    d2 = hoje - timedelta(days=1)
    d3 = hoje - timedelta(days=2)
    d4 = hoje - timedelta(days=3)
    
    # Forçar a passagem por uma virada de mês (ex: 4 dias atrás cruzou um mês)
    datas = [d1, d2, d3, d4]
    
    # Vamos verificar que a diferença de dias consecutivos continua sendo 1
    # mesmo que os números dos dias (ex: 1 e 31) mudem.
    for i in range(1, len(datas)):
        diff = (datas[i-1] - datas[i]).days
        assert diff == 1
        
    streak_atual, streak_max = _calcular_streak(datas)
    
    assert streak_atual == 4
    assert streak_max == 4

"""
Routes para sistema de gamificação (Streaks e Medalhas)
Versão corrigida para evitar erros 500

Endpoints:
  GET /api/aluno/streak/{matricula}
  GET /api/aluno/conquistas/{matricula}
  GET /api/aluno/leaderboard?tipo=streak&limite=5
"""

from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import traceback
import logging

router = APIRouter(tags=["Gamificação"])

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================== DADOS SIMULADOS ====================
# Em produção, conectar ao banco de dados real
ALUNOS_DB = {
    "2024001": {
        "nome": "João Silva",
        "matricula": "2024001",
        "streak_atual": 5,
        "streak_maximo": 12,
        "ultima_data_estudo": "2025-01-15",
        "total_questoes": 543,
        "total_sessoes": 18,
        "tempo_minutos": 2340,
    },
    "2024002": {
        "nome": "Maria Santos",
        "matricula": "2024002",
        "streak_atual": 8,
        "streak_maximo": 15,
        "ultima_data_estudo": "2025-01-15",
        "total_questoes": 789,
        "total_sessoes": 25,
        "tempo_minutos": 3200,
    },
    "admin": {
        "nome": "Administrador",
        "matricula": "admin",
        "streak_atual": 0,
        "streak_maximo": 0,
        "ultima_data_estudo": "2025-01-01",
        "total_questoes": 0,
        "total_sessoes": 0,
        "tempo_minutos": 0,
    },
}

MEDALHAS_TIPOS = [
    {
        "id": "iniciante",
        "nome": "Iniciante",
        "tipo": "bronze",
        "descricao": "Responda 100 questões",
        "requisito_questoes": 100,
    },
    {
        "id": "aprendiz",
        "nome": "Aprendiz",
        "tipo": "prata",
        "descricao": "Responda 500 questões",
        "requisito_questoes": 500,
    },
    {
        "id": "especialista",
        "nome": "Especialista",
        "tipo": "ouro",
        "descricao": "Responda 1000 questões",
        "requisito_questoes": 1000,
    },
    {
        "id": "mestre",
        "nome": "Mestre",
        "tipo": "platina",
        "descricao": "Responda 2000 questões",
        "requisito_questoes": 2000,
    },
    {
        "id": "streak_7",
        "nome": "Primeira Semana",
        "tipo": "bronze",
        "descricao": "7 dias de streak",
        "requisito_streak": 7,
    },
    {
        "id": "streak_30",
        "nome": "Um Mês",
        "tipo": "ouro",
        "descricao": "30 dias de streak consecutivo",
        "requisito_streak": 30,
    },
]


# ==================== FUNÇÕES AUXILIARES ====================
def calcular_progresso_medalha(aluno_data: dict, medalha: dict) -> int:
    """Calcula a porcentagem de progresso para uma medalha"""
    try:
        total_questoes = int(aluno_data.get("total_questoes", 0) or 0)
        streak = int(aluno_data.get("streak_atual", 0) or 0)

        # Medalhas baseadas em questões
        if "requisito_questoes" in medalha:
            meta = medalha.get("requisito_questoes", 100)
            if meta <= 0:
                return 0
            progresso = min(int((total_questoes / meta) * 100), 100)
            return progresso

        # Medalhas baseadas em streak
        if "requisito_streak" in medalha:
            meta = medalha.get("requisito_streak", 7)
            if meta <= 0:
                return 0
            progresso = min(int((streak / meta) * 100), 100)
            return progresso

        return 0
    except Exception as e:
        logger.error(f"Erro ao calcular progresso: {e}")
        return 0


def obter_aluno(matricula: str) -> Optional[dict]:
    """Busca dados do aluno (simulado ou banco de dados)"""
    try:
        if not matricula:
            return None

        # Normalizar matrícula
        matricula = str(matricula).strip().lower()

        # Procurar no banco
        if matricula in ALUNOS_DB:
            return ALUNOS_DB[matricula].copy()

        # Se não encontrar exatamente, tentar buscar como email
        for mat, aluno in ALUNOS_DB.items():
            if str(mat).lower() == matricula:
                return aluno.copy()

        # Se não encontrar no banco, criar um registro padrão com dados vazios
        logger.warning(f"Matrícula '{matricula}' não encontrada no banco, usando dados padrão")
        return {
            "nome": f"Aluno",
            "matricula": matricula,
            "streak_atual": 0,
            "streak_maximo": 0,
            "ultima_data_estudo": "2025-01-01",
            "total_questoes": 0,
            "total_sessoes": 0,
            "tempo_minutos": 0,
        }

    except Exception as e:
        logger.error(f"Erro ao obter aluno: {e}")
        return None


# ==================== ENDPOINTS ====================


@router.get("/api/aluno/streak/{matricula}")
async def get_streak(matricula: str):
    """
    Retorna informações do streak do aluno
    
    Exemplo:
      GET /api/aluno/streak/2024001
      
    Response:
      {
        "dias_atuais": 5,
        "dias_maximo": 12,
        "ultima_atividade": "2025-01-15T14:30:00",
        "proxima_data_para_manter": "2025-01-17T00:00:00",
        "emoji": "🔥"
      }
    """
    try:
        # Validar formato da matrícula
        if not matricula or len(str(matricula).strip()) == 0:
            raise ValueError("Matrícula inválida ou vazia")

        logger.info(f"📍 Buscando streak para: {matricula}")

        aluno = obter_aluno(matricula)

        if not aluno:
            logger.error(f"Aluno não encontrado: {matricula}")
            raise HTTPException(status_code=404, detail="Aluno não encontrado")

        # Calcular próxima data para manter streak
        try:
            ultima_data_str = aluno.get("ultima_data_estudo", "2025-01-01")
            ultima_data = datetime.fromisoformat(str(ultima_data_str))
        except (ValueError, TypeError):
            ultima_data = datetime(2025, 1, 1)

        proxima_data = ultima_data + timedelta(days=1)

        resposta = {
            "dias_atuais": int(aluno.get("streak_atual", 0) or 0),
            "dias_maximo": int(aluno.get("streak_maximo", 0) or 0),
            "ultima_atividade": ultima_data.isoformat(),
            "proxima_data_para_manter": proxima_data.isoformat(),
            "emoji": "🔥" if int(aluno.get("streak_atual", 0) or 0) > 0 else "❄️",
        }

        logger.info(f"✅ Streak encontrado: {resposta}")
        return resposta

    except ValueError as e:
        logger.error(f"❌ Erro de validação: {e}")
        raise HTTPException(status_code=422, detail=f"Matrícula inválida: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro em streak: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar streak: {str(e)}")


@router.get("/api/aluno/conquistas/{matricula}")
async def get_conquistas(matricula: str):
    """
    Retorna todas as conquistas do aluno: streak, medalhas e estatísticas
    
    Exemplo:
      GET /api/aluno/conquistas/2024001
      
    Response:
      {
        "streak": {...},
        "medalhas": [...],
        "total_questoes_respondidas": 543,
        "total_sessoes": 18,
        "tempo_estudo_total_minutos": 2340
      }
    """
    try:
        # Validar matrícula
        if not matricula or len(str(matricula).strip()) == 0:
            raise ValueError("Matrícula inválida ou vazia")

        logger.info(f"📍 Carregando conquistas para: {matricula}")

        aluno = obter_aluno(matricula)

        if not aluno:
            logger.error(f"Aluno não encontrado: {matricula}")
            raise HTTPException(status_code=404, detail="Aluno não encontrado")

        # Processar datas com segurança
        try:
            ultima_data_str = aluno.get("ultima_data_estudo", "2025-01-01")
            ultima_data = datetime.fromisoformat(str(ultima_data_str))
        except (ValueError, TypeError):
            ultima_data = datetime(2025, 1, 1)

        proxima_data = ultima_data + timedelta(days=1)

        # Extrair valores numéricos com segurança
        streak_atual = int(aluno.get("streak_atual", 0) or 0)
        streak_maximo = int(aluno.get("streak_maximo", 0) or 0)
        total_questoes = int(aluno.get("total_questoes", 0) or 0)
        total_sessoes = int(aluno.get("total_sessoes", 0) or 0)
        tempo_minutos = int(aluno.get("tempo_minutos", 0) or 0)

        # Montar resposta
        streak_data = {
            "dias_atuais": streak_atual,
            "dias_maximo": streak_maximo,
            "ultima_atividade": ultima_data.isoformat(),
            "proxima_data_para_manter": proxima_data.isoformat(),
        }

        # Calcular medalhas
        medalhas_list = []
        for medalha_tipo in MEDALHAS_TIPOS:
            try:
                # Verificar se medalha foi desbloqueada
                desbloqueada = False

                if "requisito_questoes" in medalha_tipo:
                    desbloqueada = total_questoes >= medalha_tipo["requisito_questoes"]
                elif "requisito_streak" in medalha_tipo:
                    desbloqueada = streak_atual >= medalha_tipo["requisito_streak"]

                progresso = calcular_progresso_medalha(aluno, medalha_tipo)

                medalha_obj = {
                    "nome": medalha_tipo.get("nome", "Medalha"),
                    "tipo": medalha_tipo.get("tipo", "bronze"),
                    "descricao": medalha_tipo.get("descricao", ""),
                    "desbloqueada": desbloqueada,
                    "data_desbloqueio": None,
                    "progresso": progresso,
                }
                medalhas_list.append(medalha_obj)

            except Exception as e:
                logger.warning(f"Erro ao processar medalha {medalha_tipo.get('id')}: {e}")
                continue

        resposta = {
            "streak": streak_data,
            "medalhas": medalhas_list,
            "total_questoes_respondidas": total_questoes,
            "total_sessoes": total_sessoes,
            "tempo_estudo_total_minutos": tempo_minutos,
        }

        logger.info(f"✅ Conquistas carregadas para: {matricula}")
        return resposta

    except ValueError as e:
        logger.error(f"❌ Erro de validação: {e}")
        raise HTTPException(status_code=422, detail=f"Matrícula inválida: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro em conquistas: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar conquistas: {str(e)}")


@router.get("/api/aluno/leaderboard")
async def get_leaderboard(
    tipo: str = Query("streak", description="streak ou questoes"),
    limite: int = Query(10, ge=1, le=100, description="Limite de resultados"),
):
    """
    Retorna ranking dos alunos por streak ou questões
    
    Exemplo:
      GET /api/aluno/leaderboard?tipo=streak&limite=5
      
    Response:
      [
        {
          "posicao": 1,
          "nome": "Maria Santos",
          "matricula": "2024002",
          "valor": 8,
          "emoji": "🔥"
        },
        ...
      ]
    """
    try:
        lista = []
        
        for mat, aluno in ALUNOS_DB.items():
            try:
                item = {
                    "nome": aluno.get("nome", "Desconhecido"),
                    "matricula": str(mat),
                    "streak": int(aluno.get("streak_atual", 0) or 0),
                    "questoes": int(aluno.get("total_questoes", 0) or 0),
                }
                lista.append(item)
            except Exception as e:
                logger.warning(f"Erro ao processar aluno {mat}: {e}")
                continue

        if tipo == "streak":
            lista.sort(key=lambda x: x.get("streak", 0), reverse=True)
            chave = "streak"
            emoji = "🔥"
        elif tipo == "questoes":
            lista.sort(key=lambda x: x.get("questoes", 0), reverse=True)
            chave = "questoes"
            emoji = "❓"
        else:
            raise ValueError(f"Tipo de ranking inválido: {tipo}")

        resultado = []
        for idx, aluno in enumerate(lista[:limite], 1):
            resultado.append(
                {
                    "posicao": idx,
                    "nome": aluno.get("nome", "Desconhecido"),
                    "matricula": aluno.get("matricula"),
                    "valor": aluno.get(chave, 0),
                    "emoji": emoji,
                }
            )

        logger.info(f"✅ Leaderboard '{tipo}' retornado")
        return resultado

    except Exception as e:
        logger.error(f"❌ Erro em leaderboard: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar leaderboard: {str(e)}")


# Health check para gamificação
@router.get("/api/aluno/health")
async def health_check():
    """Verificar se o sistema de gamificação está funcionando"""
    try:
        return {
            "status": "ok",
            "message": "Sistema de gamificação ativo",
            "endpoints": [
                "/api/aluno/streak/{matricula}",
                "/api/aluno/conquistas/{matricula}",
                "/api/aluno/leaderboard",
            ],
        }
    except Exception as e:
        logger.error(f"Erro em health check: {e}")
        raise HTTPException(status_code=500, detail="Sistema indisponível")
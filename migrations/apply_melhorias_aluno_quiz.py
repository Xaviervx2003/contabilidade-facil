#!/usr/bin/env python3
"""
Script para aplicar a migração de melhorias do aluno e quiz.
Baseado em: awesome-scalability, sql-style-guide, python-clean-architecture

Execução: python migrations/apply_melhorias_aluno_quiz.py
"""

import os
import sys
from pathlib import Path

# Adiciona o root do projeto ao path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import get_conexao
from utils.logger import setup_logger

logger = setup_logger(__name__)

MIGRATION_SQL = Path(__file__).parent / "2026_melhorias_aluno_quiz.sql"


def aplicar_migracao():
    """Aplica todas as mudanças do script SQL de melhorias."""
    
    if not MIGRATION_SQL.exists():
        logger.error(f"Arquivo de migração não encontrado: {MIGRATION_SQL}")
        return False
    
    logger.info(f"Lendo script de migração: {MIGRATION_SQL}")
    with open(MIGRATION_SQL, "r", encoding="utf-8") as f:
        sql_script = f.read()
    
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute(sql_script)
            conn.commit()
        
        logger.info("✅ Migração aplicada com sucesso!")
        logger.info("\nResumo das alterações:")
        logger.info("  • Tabela usuarios: +9 colunas (periodo, objetivo, status_aluno, celular, avatar_url, data_nascimento, ultimo_acesso, plataforma_preferida, xp, streak_atual, streak_maximo)")
        logger.info("  • Tabela eventos_aluno: criada para tracking de comportamento")
        logger.info("  • Tabela sessoes_questoes: +2 colunas (tempo_segundos, opcao_marcada)")
        logger.info("  • Índices estratégicos criados para performance")
        logger.info("  • View vw_analytics_aluno criada para dashboards")
        logger.info("  • Função fn_limpar_eventos_antigos() criada para manutenção")
        
        return True
        
    except Exception as e:
        logger.exception(f"❌ Erro ao aplicar migração: {e}")
        return False


def verificar_colunas_existentes():
    """Verifica quais colunas já existem na tabela usuarios."""
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'usuarios' 
                ORDER BY ordinal_position;
            """)
            colunas = cursor.fetchall()
            
        logger.info("\n📋 Colunas atuais da tabela 'usuarios':")
        for col in colunas:
            logger.info(f"   • {col[0]} ({col[1]})")
            
        return [c[0] for c in colunas]
        
    except Exception as e:
        logger.error(f"Erro ao verificar colunas: {e}")
        return []


def verificar_tabela_eventos():
    """Verifica se a tabela eventos_aluno já existe."""
    try:
        with get_conexao() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'eventos_aluno'
                );
            """)
            existe = cursor.fetchone()[0]
            
        if existe:
            logger.info("✅ Tabela 'eventos_aluno' já existe")
        else:
            logger.info("⏳ Tabela 'eventos_aluno' será criada")
            
        return existe
        
    except Exception as e:
        logger.error(f"Erro ao verificar tabela eventos_aluno: {e}")
        return False


def main():
    print("=" * 70)
    print("MIGRAÇÃO: Melhorias Backend + Dados do Aluno + Quiz")
    print("=" * 70)
    
    # Verifica estado atual
    print("\n1️⃣  Verificando schema atual...")
    colunas_existentes = verificar_colunas_existentes()
    verificar_tabela_eventos()
    
    # Confirmação
    print("\n2️⃣  Pronto para aplicar migração.")
    print("    Esta operação é SEGURA (usa IF NOT EXISTS).")
    
    resposta = input("\nDeseja continuar? (s/N): ").strip().lower()
    if resposta != 's':
        logger.info("Migração cancelada pelo usuário.")
        return
    
    # Aplica migração
    print("\n3️⃣  Aplicando migração...")
    sucesso = aplicar_migracao()
    
    if sucesso:
        print("\n" + "=" * 70)
        print("✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!")
        print("=" * 70)
        print("\nPróximos passos recomendados:")
        print("  1. Testar rotas de perfil: GET/PUT /api/perfil/{matricula}")
        print("  2. Testar rota de eventos: POST /api/aluno/evento")
        print("  3. Testar analytics: GET /api/aluno/quiz-analytics/{matricula}")
        print("  4. Atualizar frontend para exibir/editar novos campos")
        print("  5. Configurar job periódico: SELECT fn_limpar_eventos_antigos(90)")
    else:
        print("\n" + "=" * 70)
        print("❌ MIGRAÇÃO FALHOU - Verifique os logs")
        print("=" * 70)
        sys.exit(1)


if __name__ == "__main__":
    main()

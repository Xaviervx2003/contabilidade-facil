import sys
import os
import random

# Adiciona o diretório atual ao path para poder importar módulos do app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import get_conexao, iniciar_pool

ALUNOS = [
    "João Victor Xavier - 213150043",
    "Will - 2613150130",
    "Marcelle Souza - 2613150054",
    "Giba - 2613150044",
    "Davi - 2613150039",
    "Mariana - 2613150056",
    "Sara Pacheco - 2613150016",
    "Eloisa Pessoa - 2613150042",
    "Richard - 2613150106",
    "Anna Cecília - 2613150103",
    "Maria Luysa - 2613150055",
    "Camila Castro - 2613150002",
    "Paulo André - 26131500069",
    "Rayan - 2613150001",
    "Ana Cássia - 2613150037",
    "Jayna Rocha - 2613150046",
    "Mateus - 2613150057",
    "Diego - 2613150040",
    "Alice - 2613150012",
    "Nicole - 2613150013",
    "Anne Caliandra - 2613150091",
    "Yan Gabriel - 2613150063",
    "Manoel - 2613150053",
]

COMENTARIOS = [
    "Gente, essa questão é pegadinha! Cuidado com a interpretação.",
    "Excelente questão para fixar o conceito de introdução à administração.",
    "Prof, não entendi muito bem o motivo da resposta ser essa, alguém explica?",
    "Essa achei que era sobre departamentalização, mas caí na pegadinha.",
    "Sempre confundo esses conceitos, a plataforma tá salvando minha vida antes da prova!",
    "Achei meio confusa a redação do enunciado, mas por eliminação deu pra fazer.",
    "Essa plataforma tá ajudando demais a revisar pra prova da monitoria.",
    "Finalmente entendi a diferença entre eficiência e eficácia! Valeu demais.",
    "Bora galera, foco total nas provas!",
    "Errei por falta de atenção na leitura kkkk",
    "Questão muito boa, nível excelente para TGA.",
    "Essa eu tive que pesquisar no livro do Chiavenato antes de responder.",
    "Marquei a alternativa por intuição e acertei kkk",
    "Fiquei em grande dúvida, mas lembrei dos exemplos dados em sala de aula.",
    "O esquema de gamificação da plataforma vicia, não consigo parar de responder questões!",
    "Alguém sabe dizer se esse assunto costuma cair muito?",
    "Achei que era a abordagem clássica, erro meu.",
    "Muito fácil essa, pra não zerar a prova.",
    "Alguém tem um resumo dessa matéria pra compartilhar?",
    "Essa questão resume perfeitamente a abordagem sistêmica.",
]

def seed_feedbacks():
    try:
        iniciar_pool()
        with get_conexao() as conn:
            cursor = conn.cursor()
            
            # Pegar até 15 questões aleatórias do banco para distribuir os feedbacks
            cursor.execute("SELECT id FROM questoes LIMIT 50;")
            questoes_ids = [row[0] for row in cursor.fetchall()]
            
            if not questoes_ids:
                print("Nenhuma questão encontrada no banco de dados. Cadastre questões primeiro.")
                return

            feedbacks_inseridos = 0
            
            # Vamos gerar um feedback para cada aluno
            for aluno in ALUNOS:
                q_id = random.choice(questoes_ids)
                texto = random.choice(COMENTARIOS)
                
                # Sorteio para ver se é marcada confusa ou não
                marcada_confusa = random.choice([True, False, False, False]) # 25% de chance de ser confusa
                
                # Sorteio para definir se o professor já resolveu
                resolvido = random.choice([True, False])
                
                # Se for resolvido, colocar uma resposta do professor e definir data de resolução
                resposta_professor = None
                resolvido_em = None
                if resolvido:
                    resposta_professor = "Ótima observação! Continue focado nos estudos."
                    resolvido_em = "NOW()"
                
                # Sorteio para definir se o comentário fica público para outros alunos verem (70% de chance)
                publico = random.choice([True, True, True, False])
                
                # Inserir no banco
                query = f"""
                    INSERT INTO feedbacks_questoes 
                    (questao_id, nome_aluno, texto, marcada_confusa, resolvido, publico, resposta_professor, resolvido_em, data_criacao)
                    VALUES 
                    (%s, %s, %s, %s, %s, %s, %s, CASE WHEN %s = TRUE THEN NOW() ELSE NULL END, NOW() - (random() * interval '7 days'))
                """
                
                cursor.execute(query, (
                    q_id, 
                    aluno, 
                    texto, 
                    marcada_confusa, 
                    resolvido, 
                    publico, 
                    resposta_professor,
                    resolvido
                ))
                
                feedbacks_inseridos += 1
            
            conn.commit()
            print(f"Sucesso! Foram gerados {feedbacks_inseridos} comentários aleatórios com o nome dos alunos no banco de dados.")

    except Exception as e:
        print(f"Erro ao inserir feedbacks: {e}")

if __name__ == '__main__':
    seed_feedbacks()

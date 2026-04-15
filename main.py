import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg

# 1. MODELOS DE DADOS
class SessaoEstudo(BaseModel):
    nome_aluno: str
    assunto_estudado: str
    questoes_respondidas: int
    taxa_acerto: float
    tempo_gasto_segundos: int

class LoginRequest(BaseModel):
    matricula: str
    senha: str

class RegistroRequest(BaseModel):
    nome: str
    matricula: str
    senha: str

class VerificaIdentidadeRequest(BaseModel):
    matricula: str
    nome: str

class RedefineSenhaRequest(BaseModel):
    matricula: str
    nova_senha: str

# 2. CRIAÇÃO DO APP E CONFIGURAÇÃO
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. CONEXÃO COM O BANCO
def get_conexao():
    return psycopg.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        dbname=os.getenv('DB_NAME', 'plataforma_questoes'),
        user=os.getenv('DB_USER', 'joao_xavier'),
        password=os.getenv('DB_PASSWORD', 'sua_senha_segura12'),
        port=int(os.getenv('DB_PORT', 5432))
    )

# 4. ROTAS DA API
@app.get("/")
def pagina_inicial():
    return {"status": "API da Plataforma de Questoes rodando 100%!"}

@app.get("/api/questoes")
def obter_questoes():
    conn = get_conexao()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, assunto, enunciado, opcao_a, opcao_b, opcao_c, opcao_d, resposta_correta FROM questoes;")
    linhas = cursor.fetchall()
    conn.close()

    resultado = []
    for linha in linhas:
        resultado.append({
            "id": linha[0],
            "assunto": linha[1],
            "question": linha[2],
            "options": [linha[3], linha[4], linha[5], linha[6]],
            "answer": linha[7]
        })
        
    return resultado

@app.post("/api/sessoes")
def salvar_sessao(sessao: SessaoEstudo):
    conn = get_conexao()
    cursor = conn.cursor()
    
    query = """
        INSERT INTO sessoes_estudo 
        (nome_aluno, assunto_estudado, questoes_respondidas, taxa_acerto, tempo_gasto_segundos)
        VALUES (%s, %s, %s, %s, %s)
    """
    valores = (
        sessao.nome_aluno, 
        sessao.assunto_estudado, 
        sessao.questoes_respondidas, 
        sessao.taxa_acerto, 
        sessao.tempo_gasto_segundos
    )
    
    cursor.execute(query, valores)
    conn.commit()
    conn.close()
    
    return {"status": "Dados salvos com sucesso!"}

@app.get("/api/dashboard")
def resumo_dashboard():
    conn = get_conexao()
    cursor = conn.cursor()
    
    # Calcula totais e médias direto no banco de dados
    cursor.execute("""
        SELECT 
            COUNT(id) as total_sessoes,
            SUM(questoes_respondidas) as total_questoes,
            AVG(tempo_gasto_segundos) / 60 as tempo_medio_minutos
        FROM sessoes_estudo;
    """)
    dados = cursor.fetchone()
    conn.close()

    # Retorna os dados mastigados para os gráficos do React
    return {
        "usuarios_ativos": dados[0] or 0,
        "total_questoes_resolvidas": dados[1] or 0,
        "tempo_medio_minutos": round(dados[2] or 0, 1)
    }

@app.post("/api/login")
def fazer_login(credenciais: LoginRequest):
    conn = get_conexao()
    cursor = conn.cursor()
    
    # Procura o usuário no banco
    cursor.execute(
        "SELECT id, nome, matricula, papel FROM usuarios WHERE matricula = %s AND senha = %s;",
        (credenciais.matricula, credenciais.senha)
    )
    usuario = cursor.fetchone()
    conn.close()

    if usuario:
        return {
            "sucesso": True,
            "dados": {
                "id": usuario[0],
                "nome": usuario[1],
                "matricula": usuario[2],
                "papel": usuario[3]
            }
        }
    else:
        return {"sucesso": False, "mensagem": "Matrícula ou senha incorretos."}

@app.post("/api/register")
def registrar_usuario(dados: RegistroRequest):
    conn = get_conexao()
    cursor = conn.cursor()
    
    # 1. Verifica se o aluno já tem conta
    cursor.execute("SELECT id FROM usuarios WHERE matricula = %s;", (dados.matricula,))
    if cursor.fetchone():
        conn.close()
        return {"sucesso": False, "mensagem": "Esta matrícula já está cadastrada."}

    # 2. Salva o novo aluno no banco
    cursor.execute(
        "INSERT INTO usuarios (nome, matricula, senha, papel) VALUES (%s, %s, %s, 'aluno');",
        (dados.nome, dados.matricula, dados.senha)
    )
    conn.commit()
    conn.close()
    
    return {"sucesso": True, "mensagem": "Conta criada com sucesso!"}
@app.get("/api/alunos/desempenho")
def obter_desempenho_alunos():
    conn = get_conexao()
    cursor = conn.cursor()
    
    # Busca dados dos usuários e agrupa o desempenho das sessões
    query = """
        SELECT 
            u.nome, 
            u.matricula, 
            COUNT(s.id) as sessoes, 
            COALESCE(SUM(s.questoes_respondidas), 0) as total_questoes,
            COALESCE(AVG(s.taxa_acerto), 0) as media
        FROM usuarios u
        LEFT JOIN sessoes_estudo s ON u.matricula = s.nome_aluno -- Ajustamos para bater com a matrícula/nome
        WHERE u.papel = 'aluno'
        GROUP BY u.nome, u.matricula;
    """
    cursor.execute(query)
    alunos = cursor.fetchall()
    conn.close()

    return [{
        "nome": a[0],
        "matricula": a[1],
        "sessoes": a[2],
        "questoes": a[3],
        "media": f"{round(a[4], 1)}%"
    } for a in alunos]

@app.post("/api/verificar-identidade")
def verificar_identidade(dados: VerificaIdentidadeRequest):
    """Passo 1 da redefinição: confirma que a matrícula + nome batem no banco."""
    conn = get_conexao()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id FROM usuarios WHERE matricula = %s AND LOWER(nome) = LOWER(%s);",
        (dados.matricula, dados.nome)
    )
    usuario = cursor.fetchone()
    conn.close()

    if usuario:
        return {"sucesso": True}
    else:
        return {"sucesso": False, "mensagem": "Matrícula ou nome não encontrados. Verifique os dados e tente novamente."}

@app.post("/api/redefinir-senha")
def redefinir_senha(dados: RedefineSenhaRequest):
    """Passo 2 da redefinição: atualiza a senha do usuário identificado pela matrícula."""
    if len(dados.nova_senha) < 6:
        return {"sucesso": False, "mensagem": "A senha deve ter pelo menos 6 caracteres."}

    conn = get_conexao()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE usuarios SET senha = %s WHERE matricula = %s;",
        (dados.nova_senha, dados.matricula)
    )
    conn.commit()
    linhas_afetadas = cursor.rowcount
    conn.close()

    if linhas_afetadas > 0:
        return {"sucesso": True, "mensagem": "Senha redefinida com sucesso!"}
    else:
        return {"sucesso": False, "mensagem": "Usuário não encontrado."}
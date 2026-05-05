# 📚 Documentação de APIs Gran Cursos (Engenharia Reversa)

Este documento centraliza as URLs e o funcionamento das APIs descobertas durante o desenvolvimento para facilitar a manutenção e expansão dos scrapers.

---

## 1. Árvore de Matérias e Assuntos
Utilizada para reconstruir a hierarquia de estudos e os filtros do sistema.

**URL Base:**
`https://rota-api.grancursosonline.com.br/v3/materia/arvore`

**Parâmetros de Query:**
- `raiz[]`: ID da matéria pai. Se omitido, retorna as disciplinas raiz.
- `comQuestoes=1`: Retorna apenas itens que possuem questões vinculadas.
- `perPage=150`: Quantidade de itens por página.
- `sort=indiceOrdenacao`: Ordena pelo índice oficial do edital (ex: 1.1, 1.1.2).
- `_source[]`: Filtra quais campos o servidor deve retornar. Exemplos: `id`, `nome`, `pai`, `filhos`, `indice`, `nivel`.

---

## 2. Filtros de Metadados
APIs que retornam as listas para popular os dropdowns de busca.

- **Bancas**: `.../v3/banca`
- **Órgãos**: `.../v3/orgao`
- **Cargos**: `.../v3/cargo`
- **Anos**: `.../v3/ano`
- **Escolaridade**: `.../v3/escolaridade`
- **Modalidade**: `.../v3/modalidade`

---

## 3. Busca de Questões
Endpoint principal para extração do conteúdo das questões.

**URL Base:**
`https://rota-api.grancursosonline.com.br/v3/questoes`

**Parâmetros Úteis:**
- `materia[]`: ID da matéria/assunto.
- `banca[]`: ID da banca.
- `ano[]`: Ano da questão.
- `perPage`: Quantidade de questões.

---

## 4. Estrutura de Resposta (Materia)
```json
{
  "id": 404572,
  "nome": "Introdução à Administração",
  "pai": 404571,
  "indice": "1.1.",
  "nivel": 2,
  "filhos": [417269, 417294]
}
```
*Nota: O campo `indice` é fundamental para manter a ordem lógica de estudo.*

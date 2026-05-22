<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
| ------ | ---------- |
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.

## Diretrizes de Seleção de Modelos e Controle de Custos

- **Não use Opus o tempo todo:** O Opus custa cerca de 5x mais por token do que o Sonnet. Mesma resposta, conta muito maior.
- **Use Sonnet para:** Escrever e editar código, análise de dados, perguntas gerais, resumos.
- **Use Opus para:** Decisões complexas de arquitetura, depuração profunda envolvendo múltiplos arquivos, redação de textos longos e sofisticados.
- **Use Haiku para:** Consultas rápidas, classificação de dados, formatação e tarefas simples em alto volume.

---

## 🎨 Sistema de Design Tokens (OBRIGATÓRIO para novas views)

> **REGRA CRÍTICA:** Nunca defina um objeto `tokens` ou `tk` local dentro de um arquivo `.jsx`.
> A fonte da verdade é **única**: `painel-admin/src/tokens.js`.

### Importação correta

```js
// ✅ CORRETO — Sempre use assim em qualquer view nova
import { tokens } from '../../tokens'

// ✅ Para views admin que usam alias 'tk':
import { tokens as tk } from '../../tokens'

// ✅ Para views que precisam das paletas de cores (ex: seletor de tema):
import { COLOR_PALETTES } from '../../tokens'

// ✅ Para cores dinâmicas que respondem à paleta ativa do usuário:
import { buildTokens } from '../../tokens'
import { useTheme } from '../../context/themeContext'
const { currentPalette } = useTheme()
const tk = buildTokens(currentPalette)
```

### ❌ Padrão PROIBIDO (nunca mais)

```js
// ❌ ERRADO — Nunca faça isso:
const tokens = {
  rausch: '#FF385C',
  babu: '#00A699',
  ...
}
```

### Referência rápida dos tokens

| Token | Valor padrão | Uso |
|---|---|---|
| `tokens.rausch` | `#FF385C` | Cor de destaque principal |
| `tokens.babu` | `#00A699` | Cor secundária (sucesso) |
| `tokens.arches` | `#FC642D` | Cor terciária (avisos) |
| `tokens.foggy` | `#767676` | Texto muted / secundário |
| `tokens.border` | `var(--color-border)` | Bordas (tema-aware) |
| `tokens.bg` | `var(--color-bg-elevated)` | Fundo de cards |
| `tokens.bgSub` | `var(--color-bg-tertiary)` | Fundo secundário |
| `tokens.text` | `var(--color-text-primary)` | Texto principal |

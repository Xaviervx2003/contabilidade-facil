# 🚀 Guia de Boas Práticas - Contabilidade Fácil (Airbnb Style)

Este guia define os padrões técnicos para o desenvolvimento em JavaScript/React no projeto.

---

## 1. Tipos e Referências

### 1.1 Primitivos vs Complexos

- **Primitivos**: (string, number, boolean, null, undefined) são acessados por valor.
- **Complexos**: (object, array, function) são acessados por **referência**.

### 1.2 Use `const` sempre

Evite `var`. Use `const` para todas as suas referências. Use `let` apenas se precisar reatribuir o valor.

```javascript
// ✅ BOM
const a = 1;
let count = 1;
if (true) {
  count += 1;
}
```

---

## 2. Objetos e Arrays

### 2.1 Sintaxe Literal

Sempre use `{}` e `[]`.

```javascript
const item = {}; // ✅ BOM
const items = []; // ✅ BOM
```

### 2.2 Shorthand e Propriedades

```javascript
const name = "Luke";
// ✅ BOM (Shorthand)
const obj = { name };

// ✅ BOM (Computed name)
const dynamicKey = "status";
const user = { [dynamicKey]: "active" };
```

### 2.3 Spread Operator (`...`)

Use para copiar ou mesclar objetos e arrays sem mutar o original.

```javascript
const original = { a: 1, b: 2 };
const copy = { ...original, c: 3 }; // ✅ BOM
```

---

## 3. Desestruturação (Destructuring)

Use para acessar múltiplas propriedades de forma limpa.

```javascript
// ✅ BOM
function getFullName({ firstName, lastName }) {
  return `${firstName} ${lastName}`;
}

const [first, second] = [1, 2, 3]; // Array destructuring
```

---

## 4. Strings

- Use **aspas simples** `''`.
- Use **Template Strings** `` `${var}` `` para interpolação.

```javascript
const message = `Olá, ${name}!`; // ✅ BOM
```

---

## 5. Funções e Arrow Functions

### 5.1 Use Arrow Functions para callbacks

```javascript
[1, 2, 3].map((x) => x + 1); // ✅ BOM (Retorno implícito)
```

### 5.2 Parâmetros Default

Sempre coloque parâmetros com valor padrão por último.

```javascript
function handle(name, options = {}) { ... }
```

---

## 6. Classes e Módulos

### 6.1 Use `class` e `extends`

Evite manipular `prototype` diretamente.

```javascript
class Aluno extends Usuario { ... }
```

### 6.2 Módulos (import/export)

- Não use `require`.
- Coloque todos os `import` no topo do arquivo.
- Não inclua a extensão `.js` ou `.jsx` no import de arquivos locais.

```javascript
import MateriaCard from "./MateriaCard"; // ✅ BOM
```

---

## 7. Iteradores e Higher-Order Functions

**Evite loops `for` ou `while`.** Use os métodos funcionais de Array:

- `map()`: Para transformar dados.
- `filter()`: Para filtrar listas.
- `reduce()`: Para consolidar valores (ex: somas).
- `find()`: Para buscar um item específico.

---

## 8. React Hooks (Padrão do Projeto)

### 8.1 `useState`

```javascript
const [trilhas, setTrilhas] = useState([]);
```

### 8.2 `useEffect`

Sempre adicione um `return` para limpeza de listeners/timers:

```javascript
useEffect(() => {
  const handleResize = () => { ... };
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize); // ✅ Limpeza
}, []);
```

### 8.3 `useCallback` para Performance

Quando passar funções como props para componentes otimizados:

```javascript
const carregarTrilhas = useCallback(async () => {
  const res = await fetch(`${API_URL}/api/trilhas`);
  setTrilhas(await res.json());
}, []);
```

### 8.4 `useNavigate` (React Router v6)

```javascript
const navigate = useNavigate();
navigate("/quiz?ids=1,2,3&modulo_id=5");
```

---

## 9. Padrões para Trilhas de Aprendizagem

### 9.1 Estrutura de Componente (MinhasTrilhas.jsx)

```javascript
const MinhasTrilhas = () => {
  const [trilhas, setTrilhas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const matricula = getAlunoMatricula(); // ✅ Sempre validar autenticação

  const carregarTrilhas = useCallback(async () => {
    if (!matricula) return; // Guard clause
    try {
      const res = await fetch(`${API_URL}/api/trilhas/aluno/${matricula}`);
      if (!res.ok) throw new Error("Erro ao carregar");
      setTrilhas(await res.json());
    } catch (err) {
      setError("Erro ao carregar trilhas.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [matricula]);

  useEffect(() => {
    carregarTrilhas();
  }, [carregarTrilhas]);

  // Retorno com tratamento de estados (loading, error, vazio)
  if (loading) return <CSpinner color="primary" />;
  if (error) return <CAlert color="danger">{error}</CAlert>;
  if (!trilhas.length)
    return <CAlert color="info">Nenhuma trilha disponível.</CAlert>;

  return <div>{/* Renderizar trilhas */}</div>;
};
```

### 9.2 Acessar Módulo (Lógica de Navegação)

```javascript
const handleAcessarModulo = (m) => {
  // Prioridade: Vídeo/Texto > Quiz
  if (m.link_video || m.texto_teorico) {
    setModuloAtivo(m);
    setModalAula(true);
  } else if (m.materia_id || m.questoes_selecionadas?.length > 0) {
    const ids = m.questoes_selecionadas.join(",");
    navigate(`/quiz?ids=${ids}&modulo_id=${m.id}`);
  }
};
```

### 9.3 Marcar Concluído (Atualização de Estado)

```javascript
const marcarConcluido = async (moduloId) => {
  setSalvando(moduloId);
  try {
    const res = await fetch(`${API_URL}/api/trilhas/progresso/${moduloId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matricula }),
    });
    if (!res.ok) throw new Error(`Erro ${res.status}`);
    await carregarTrilhas(); // Recarregar para atualizar UI
  } catch (e) {
    console.error(e);
    setToastErro("Não foi possível salvar seu progresso.");
  } finally {
    setSalvando(null);
  }
};
```

---

## 10. Formatação e Pontuação

- **Indentação**: 2 espaços.
- **Ponto e Vírgula**: Obrigatório `;`.
- **Vírgula Pendente**: Use em objetos/arrays multiline para melhores diffs no Git.

---

## 11. Comentários e Nomeação

- **camelCase**: Variáveis e funções.
- **PascalCase**: Componentes React e Classes.
- **FIXME/TODO**: Para dívidas técnicas.

---

> [!TIP]
> Um código limpo é um código que outros conseguem ler sem te perguntar o que ele faz. Siga estas regras e o projeto será um sucesso!

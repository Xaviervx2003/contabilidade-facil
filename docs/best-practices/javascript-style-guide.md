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
if (true) { count += 1; }
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
const name = 'Luke';
// ✅ BOM (Shorthand)
const obj = { name }; 

// ✅ BOM (Computed name)
const dynamicKey = 'status';
const user = { [dynamicKey]: 'active' };
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
import MateriaCard from './MateriaCard'; // ✅ BOM
```

---

## 7. Iteradores e Higher-Order Functions
**Evite loops `for` ou `while`.** Use os métodos funcionais de Array:
- `map()`: Para transformar dados.
- `filter()`: Para filtrar listas.
- `reduce()`: Para consolidar valores (ex: somas).
- `find()`: Para buscar um item específico.

---

## 8. Formatação e Pontuação
- **Indentação**: 2 espaços.
- **Ponto e Vírgula**: Obrigatório `;`.
- **Vírgula Pendente**: Use em objetos/arrays multiline para melhores diffs no Git.

---

## 9. Comentários e Nomeação
- **camelCase**: Variáveis e funções.
- **PascalCase**: Componentes React e Classes.
- **FIXME/TODO**: Para dívidas técnicas.

---

> [!TIP]
> Um código limpo é um código que outros conseguem ler sem te perguntar o que ele faz. Siga estas regras e o projeto será um sucesso!

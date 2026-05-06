# 🎨 Sistema de Tema Light/Dark Mode - Documentação

## 📋 Resumo das Mudanças

Criei um sistema completo de tema (light/dark mode) para seu site com:

✅ **Suporte a dois modos**: Light (padrão) e Dark (com sua paleta customizada)
✅ **Persistência de preferência**: Salva a escolha do usuário no localStorage
✅ **Detecção automática**: Usa preferência do sistema se nenhuma foi salva
✅ **Sem flash**: Script de inicialização previne mudança visível de tema
✅ **Transições suaves**: Todas as mudanças de cor têm transições CSS
✅ **Componente de toggle**: Botão para trocar entre temas
✅ **CSS Variables**: Fácil de customizar e manter

---

## 📁 Arquivos Criados

### 1. **themeContext.jsx**
Context React que gerencia o estado do tema
- `ThemeProvider`: Wrapper para a aplicação
- `useTheme()`: Hook para acessar tema e toggle
- Definição de todas as cores (light/dark)

### 2. **getNavItens.jsx** (Atualizado)
Componente de navegação melhorado
- Inclui novo componente `ThemeToggle`
- Ícones de sun/moon para trocar tema
- Mantém toda lógica original de papéis de usuário

### 3. **nav.scss**
Estilos para navegação com tema
- Cores adaptativas com CSS variables
- Transições suaves
- Estados hover/active
- Responsividade

### 4. **index.html** (Atualizado)
HTML com suporte a tema
- Meta tags para tema
- Script de inicialização para evitar flash
- Detecção de preferência do sistema

### 5. **App.jsx** (Exemplo)
Como integrar o ThemeProvider no seu App

### 6. **DefaultLayout.jsx** (Exemplo)
Layout completo com tema integrado
- Header com toggle de tema
- Sidebar responsiva
- Footer
- Logout

### 7. **DefaultLayout.scss**
Estilos completos do layout
- Componentes: cards, forms, buttons, tables
- Scrollbar customizado
- Responsividade mobile

---

## 🚀 Como Implementar

### Passo 1: Copiar Arquivos
```bash
# Copie os arquivos para seu projeto
src/
├── context/
│   └── themeContext.jsx
├── components/
│   ├── getNavItens.jsx
│   └── layout/
│       ├── DefaultLayout.jsx
│       └── DefaultLayout.scss
├── styles/
│   ├── nav.scss
│   └── theme.scss
└── App.jsx

public/
└── index.html
```

### Passo 2: Atualizar App.jsx
```jsx
import { ThemeProvider } from './context/themeContext'

function App() {
  return (
    <ThemeProvider>
      {/* Seu router e componentes */}
    </ThemeProvider>
  )
}
```

### Passo 3: Usar o Theme Toggle
```jsx
import { ThemeToggle } from './components/getNavItens'

// Em qualquer componente dentro do ThemeProvider:
<ThemeToggle />
```

### Passo 4: Acessar o Tema em Componentes
```jsx
import { useTheme } from './context/themeContext'

function MyComponent() {
  const { isDark, toggleTheme, currentTheme } = useTheme()
  
  return (
    <div style={{
      backgroundColor: currentTheme.bg.primary,
      color: currentTheme.text.primary
    }}>
      {isDark ? 'Modo escuro' : 'Modo claro'}
      <button onClick={toggleTheme}>Trocar tema</button>
    </div>
  )
}
```

---

## 🎨 Paleta de Cores

### Light Mode
```
Primário: #2c3e50 (Azul escuro)
Secundário: #3498db (Azul claro)
Accent: #e74c3c (Vermelho)

Background: #ffffff (Branco)
Text: #2c3e50 (Cinza escuro)
```

### Dark Mode
```
Primário: #E1E0CC (Bege claro)
Secundário: #9ca3af (Cinza)
Accent: #DEDBC8 (Bege)

Background: #000000 (Preto)
Text: #E1E0CC (Bege)
```

---

## 🔧 Customizar Cores

No `themeContext.jsx`, edite o objeto `themes`:

```jsx
const themes = {
  light: {
    bg: {
      primary: '#seu-cor-aqui',
      // ... mais cores
    }
  },
  dark: {
    // ... suas cores escuras
  }
}
```

---

## 📱 Responsividade

O sistema é totalmente responsivo:
- ✅ Desktop: Layout completo
- ✅ Tablet: Sidebar colapsável
- ✅ Mobile: Menu hambúrguer

---

## ⚡ Performance

- **CSS Variables**: Sem re-renders desnecessários
- **Transições suaves**: Apenas transições essenciais
- **Lazy loading**: Temas carregados sob demanda
- **Sem flash**: Script de inicialização rápido

---

## 🔌 Integração com CoreUI

O sistema é 100% compatível com CoreUI:
- ✅ Componentes CNavItem, CNavTitle
- ✅ Cores adaptam automaticamente
- ✅ Sem conflitos de estilos

---

## 🎯 Features Inclusos

✅ Toggle tema com ícones sun/moon
✅ Salva preferência do usuário
✅ Detecta modo escuro do sistema
✅ Previne flash de tema
✅ Transições suaves
✅ Documentação completa
✅ Exemplos prontos para usar
✅ Responsivo (mobile/tablet/desktop)
✅ Sem dependências extras
✅ Acessibilidade (ARIA labels)

---

## 📝 Notas Importantes

1. **Cache**: Clear cache do browser se a cor não atualizar
2. **localStorage**: O tema é salvo em `theme-mode`
3. **Preferência de sistema**: Automaticamente detectada se nenhuma preferência salva
4. **Transições**: Desativadas para usuários com `prefers-reduced-motion`

---

## 🐛 Troubleshooting

### Tema não muda?
- Verifique se o `ThemeProvider` envolve toda a app
- Limpe cache e localStorage

### Flash de tema na inicialização?
- O script no `index.html` deve resolver isso
- Se persistir, aumente o tamanho da fonte no script

### Cores não estão corretas?
- Verifique se os CSS variables estão sendo injetados
- Abra DevTools → Inspect element → check computed styles

---

Tudo pronto! 🎉 Seu site agora tem um sistema robusto de tema com light/dark mode!
# 💻 EXEMPLOS PRÁTICOS - Componente Conquistas

## 1. Importação Básica

```jsx
import Conquistas from 'src/pages/Conquistas/Conquistas'
import 'src/pages/Conquistas/Conquistas.scss'

export default function App() {
    return (
        <ThemeProvider>
            <Conquistas />
        </ThemeProvider>
    )
}
```

---

## 2. Integração em Layout

```jsx
// layout.jsx
import Conquistas from 'src/pages/Conquistas/Conquistas'
import Header from 'src/components/Header'
import Sidebar from 'src/components/Sidebar'

export default function Layout() {
    return (
        <div className="app-layout">
            <Header />
            <div className="main-content">
                <Sidebar />
                <main className="page-content">
                    <Conquistas />
                </main>
            </div>
        </div>
    )
}
```

---

## 3. Usar com React Router

```jsx
// routes.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Conquistas from 'src/pages/Conquistas/Conquistas'

export default function AppRoutes() {
    return (
        <Router>
            <Routes>
                <Route path="/conquistas" element={<Conquistas />} />
                <Route path="/dashboard" element={<Dashboard />} />
                {/* Outras rotas */}
            </Routes>
        </Router>
    )
}
```

---

## 4. Customizar Cores do Tema

### Opção A: Via CSS Variables
```css
/* styles/theme-custom.css */
:root {
    --color-primary: #3498db;      /* Novo azul */
    --color-warning: #e74c3c;      /* Novo avermelhado */
    --color-success: #2ecc71;      /* Novo verde */
}

[data-theme='dark'] {
    --color-primary: #f39c12;      /* Amarelo */
    --color-warning: #e67e22;      /* Laranja */
}
```

### Opção B: Via SCSS Variables
```scss
// Conquistas.scss (customizado)
$primary-color: #3498db;
$dark-primary: #f39c12;

:root {
    --color-primary: #{$primary-color};
}

[data-theme='dark'] {
    --color-primary: #{$dark-primary};
}
```

---

## 5. Modificar Animações

### Tornar Animações Mais Rápidas
```scss
// Conquistas.scss
--transition-fast: 0.1s ease;      // Era 0.2s
--transition-normal: 0.15s ease;   // Era 0.3s
--transition-slow: 0.3s ease;      // Era 0.5s

@keyframes fadeInUp {
    // Reduzir duração de 0.6s para 0.3s
    animation-duration: 0.3s;
}
```

### Desabilitar Animações (para teste)
```scss
.medal-card {
    animation: none !important;
}

.streak-card:hover .streak-glow {
    animation: none !important;
}
```

### Adicionar Efeito Bounce
```scss
@keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
}

.medal-emoji {
    animation: bounce 0.6s ease infinite;
}
```

---

## 6. Modificar Dados da API

```jsx
// Conquistar dados do backend
const mockData = {
    streak: {
        dias_atuais: 7,
        dias_maximo: 30,
        proxima_data_para_manter: '2026-05-07T00:00:00'
    },
    medalhas: [
        {
            nome: 'Iniciante',
            descricao: 'Responda 10 questões',
            tipo: 'bronze',
            desbloqueada: true,
            data_desbloqueio: '2026-05-01',
            progresso: 100
        },
        {
            nome: 'Diligente',
            descricao: 'Estude por 7 dias seguidos',
            tipo: 'prata',
            desbloqueada: false,
            progresso: 60
        }
    ],
    total_questoes_respondidas: 45,
    total_sessoes: 12,
    tempo_estudo_total_minutos: 480
}
```

---

## 7. Estender Funcionalidades

### Adicionar Botão de Compartilhar
```jsx
// Dentro de Conquistas.jsx
const compartilharConquista = (medalha) => {
    const texto = `🏆 Desbloqueei a medalha "${medalha.nome}" em Contabilidade Fácil!`
    const url = window.location.href
    
    // Opção 1: WhatsApp
    window.open(`https://wa.me/?text=${encodeURIComponent(texto + ' ' + url)}`)
    
    // Opção 2: Twitter
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(texto)}`)
    
    // Opção 3: Copiar para clipboard
    navigator.clipboard.writeText(texto)
}

// No medal-card:
<button onClick={() => compartilharConquista(medalha)}>
    📤 Compartilhar
</button>
```

### Adicionar Notificação ao Desbloquear
```jsx
import toast from 'react-hot-toast'

useEffect(() => {
    if (conquistas?.medalhas) {
        conquistas.medalhas.forEach(medalha => {
            if (medalha.desbloqueada && !localStorage.getItem(`notified_${medalha.nome}`)) {
                toast.success(`🎉 Parabéns! Você desbloqueou "${medalha.nome}"!`)
                localStorage.setItem(`notified_${medalha.nome}`, 'true')
            }
        })
    }
}, [conquistas])
```

---

## 8. Adicionar Modal de Detalhes da Medalha

```jsx
import { CModal, CModalHeader, CModalBody, CModalFooter, CButton } from '@coreui/react'
import { useState } from 'react'

export default function ConquistasComModal() {
    const [selectedMedal, setSelectedMedal] = useState(null)

    return (
        <>
            {/* Componente original */}
            <Conquistas />

            {/* Modal */}
            <CModal visible={!!selectedMedal} onClose={() => setSelectedMedal(null)} size="lg">
                <CModalHeader>
                    <span style={{ fontSize: '2rem', marginRight: '0.5rem' }}>
                        {selectedMedal?.tipo === 'ouro' && '🥇'}
                    </span>
                    {selectedMedal?.nome}
                </CModalHeader>
                <CModalBody>
                    <p>{selectedMedal?.descricao}</p>
                    <p><strong>Critério:</strong> {selectedMedal?.criterio}</p>
                    <p><strong>Progresso:</strong> {selectedMedal?.progresso}%</p>
                </CModalBody>
                <CModalFooter>
                    <CButton color="primary" onClick={() => setSelectedMedal(null)}>
                        Fechar
                    </CButton>
                </CModalFooter>
            </CModal>
        </>
    )
}
```

---

## 9. Reusável: Componente Medal Card Separado

```jsx
// MedalCard.jsx
import './MedalCard.scss'

export default function MedalCard({ medalha, onShareClick }) {
    return (
        <div className={`medal-card ${medalha.desbloqueada ? 'unlocked' : 'locked'}`}>
            <div className="medal-icon">
                {medalha.tipo === 'bronze' && '🥉'}
                {medalha.tipo === 'prata' && '🥈'}
                {medalha.tipo === 'ouro' && '🥇'}
                {medalha.tipo === 'platina' && '💎'}
            </div>

            <h5>{medalha.nome}</h5>
            <p>{medalha.descricao}</p>

            {!medalha.desbloqueada && medalha.progresso && (
                <div className="progress-bar">
                    {medalha.progresso}%
                </div>
            )}

            {medalha.desbloqueada && (
                <button onClick={() => onShareClick(medalha)}>
                    📤 Compartilhar
                </button>
            )}
        </div>
    )
}
```

---

## 10. Testes Unitários

```jsx
// Conquistas.test.jsx
import { render, screen, waitFor } from '@testing-library/react'
import Conquistas from './Conquistas'

describe('Componente Conquistas', () => {
    
    test('Renderiza loading state', () => {
        render(<Conquistas />)
        expect(screen.getByText(/Carregando suas conquistas/i)).toBeInTheDocument()
    })

    test('Renderiza erro quando matrícula não encontrada', async () => {
        sessionStorage.removeItem('matricula')
        render(<Conquistas />)
        
        await waitFor(() => {
            expect(screen.getByText(/Matrícula não encontrada/i)).toBeInTheDocument()
        })
    })

    test('Renderiza streaks com dados corretos', async () => {
        // Mock data
        const mockData = { streak: { dias_atuais: 15 } }
        
        render(<Conquistas />)
        
        await waitFor(() => {
            expect(screen.getByText('15')).toBeInTheDocument()
        })
    })

    test('Renderiza medalhas desbloqueadas com badge', async () => {
        render(<Conquistas />)
        
        await waitFor(() => {
            expect(screen.getByText(/✅ Desbloqueada/i)).toBeInTheDocument()
        })
    })

    test('Renderiza barra de progresso para medalhas trancadas', async () => {
        render(<Conquistas />)
        
        await waitFor(() => {
            const progressBars = screen.getAllByRole('progressbar')
            expect(progressBars.length).toBeGreaterThan(0)
        })
    })
})
```

---

## 11. Integração com Redux (Opcional)

```jsx
// store/slices/conquistasSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

export const fetchConquistas = createAsyncThunk(
    'conquistas/fetchConquistas',
    async (matricula) => {
        const response = await fetch(`/api/aluno/conquistas/${matricula}`)
        return response.json()
    }
)

const conquistasSlice = createSlice({
    name: 'conquistas',
    initialState: {
        data: null,
        loading: false,
        error: null
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchConquistas.pending, (state) => {
                state.loading = true
            })
            .addCase(fetchConquistas.fulfilled, (state, action) => {
                state.data = action.payload
                state.loading = false
            })
            .addCase(fetchConquistas.rejected, (state, action) => {
                state.error = action.error.message
                state.loading = false
            })
    }
})

export default conquistasSlice.reducer

// Uso no componente:
import { useDispatch, useSelector } from 'react-redux'

const dispatch = useDispatch()
const { data, loading, error } = useSelector(state => state.conquistas)

useEffect(() => {
    const matricula = sessionStorage.getItem('matricula')
    if (matricula) {
        dispatch(fetchConquistas(matricula))
    }
}, [dispatch])
```

---

## 12. PWA: Instalar como App

```jsx
// Dentro do componente ou App.jsx
useEffect(() => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('✅ Service Worker registrado'))
            .catch(err => console.error('❌ Erro ao registrar SW:', err))
    }
}, [])
```

---

## 13. Analytics: Rastrear Conquistas

```jsx
// Dentro de Conquistas.jsx
import { useAnalytics } from 'src/hooks/useAnalytics'

const { trackEvent } = useAnalytics()

// Rastrear quando medalha é desbloqueada
useEffect(() => {
    conquistas?.medalhas?.forEach(medalha => {
        if (medalha.desbloqueada) {
            trackEvent('medal_unlocked', {
                medalha_nome: medalha.nome,
                tipo: medalha.tipo,
                data: medalha.data_desbloqueio
            })
        }
    })
}, [conquistas])
```

---

## 14. Dark Mode Manual Toggle

```jsx
// hook/useTheme.js
import { useEffect, useState } from 'react'

export function useTheme() {
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('theme') || 'light'
    })

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('theme', theme)
    }, [theme])

    const toggle = () => setTheme(theme === 'light' ? 'dark' : 'light')

    return { theme, toggle }
}

// Uso em Header:
import { useTheme } from 'src/hooks/useTheme'

export default function Header() {
    const { theme, toggle } = useTheme()
    
    return (
        <button onClick={toggle}>
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
    )
}
```

---

## 15. Export as PDF (Certificado)

```jsx
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const exportarCertificado = async () => {
    const element = document.getElementById('conquistas-container')
    const canvas = await html2canvas(element)
    const image = canvas.toDataURL('image/png')
    
    const pdf = new jsPDF('portrait', 'mm', 'a4')
    pdf.addImage(image, 'PNG', 10, 10, 190, 277)
    pdf.save('minhas-conquistas.pdf')
}

// Botão:
<button onClick={exportarCertificado} className="btn-export">
    📄 Exportar como PDF
</button>
```

---

*Esses exemplos cobrem os casos de uso mais comuns. Adapte conforme suas necessidades!*
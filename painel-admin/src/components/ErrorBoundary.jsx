/**
 * ErrorBoundary — captura erros de render e chunk loading.
 * Envolve DefaultLayout e views críticas (Quiz, GestaoQuestoes).
 */
import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const isChunkError =
      this.state.error?.message?.includes('Failed to fetch dynamically imported module') ||
      this.state.error?.message?.includes('Loading chunk')

    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '32px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '3rem' }}>{isChunkError ? '🔄' : '⚠️'}</div>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
          {isChunkError ? 'Nova versão disponível' : 'Algo deu errado'}
        </h2>
        <p style={{ margin: 0, color: 'var(--color-text-secondary, #6b7280)', maxWidth: 400 }}>
          {isChunkError
            ? 'O app foi atualizado. Recarregue para continuar.'
            : 'Um erro inesperado ocorreu nesta tela.'}
        </p>
        <button
          onClick={this.handleReload}
          style={{
            padding: '10px 24px',
            borderRadius: '8px',
            border: 'none',
            background: '#3b82f6',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          Recarregar página
        </button>
        {!isChunkError && this.state.error && (
          <details style={{ marginTop: 8, fontSize: '0.75rem', color: '#9ca3af', maxWidth: 500 }}>
            <summary style={{ cursor: 'pointer' }}>Detalhes do erro</summary>
            <pre style={{ textAlign: 'left', whiteSpace: 'pre-wrap', marginTop: 8 }}>
              {this.state.error.toString()}
            </pre>
          </details>
        )}
      </div>
    )
  }
}

export default ErrorBoundary

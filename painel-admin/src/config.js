// Utiliza variável do Vite
const apiUrlFromEnv = import.meta.env.VITE_API_URL

// Fallback inteligente para produção e desenvolvimento
let fallbackApiUrl
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  fallbackApiUrl = `${window.location.protocol}//${window.location.hostname}:8000`
} else if (window.location.hostname.includes('vercel.app')) {
  // Em produção na Vercel, usar o domínio da API no Render
  fallbackApiUrl = 'https://contabilidade-facil.onrender.com'
} else {
  // Outros ambientes de produção
  fallbackApiUrl = `${window.location.protocol}//${window.location.hostname}:8000`
}

export const API_URL = apiUrlFromEnv || fallbackApiUrl

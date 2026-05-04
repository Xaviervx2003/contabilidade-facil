// Alterado para compatibilidade com Create React App e Vercel
const apiUrlFromEnv = process.env.REACT_APP_API_URL

const fallbackApiUrl = `${window.location.protocol}//${window.location.hostname}:8000`

export const API_URL = apiUrlFromEnv || fallbackApiUrl

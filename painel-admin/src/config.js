const apiUrlFromEnv = import.meta.env.VITE_API_URL

const fallbackApiUrl = `${window.location.protocol}//${window.location.hostname}:8000`

export const API_URL = apiUrlFromEnv || fallbackApiUrl

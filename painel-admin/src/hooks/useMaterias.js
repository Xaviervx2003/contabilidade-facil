/**
 * useMaterias — Cache compartilhado de matérias.
 * Ponto 9: Evita 4+ chamadas GET /api/admin/materias por sessão.
 * Fetch único, resultado armazenado em módulo singleton.
 */
import { useEffect, useState } from 'react'
import { API_URL } from '../config'

let _cache = null
let _promise = null

const fetchMaterias = () => {
  if (_cache) return Promise.resolve(_cache)
  if (_promise) return _promise

  _promise = fetch(`${API_URL}/api/admin/materias`)
    .then(r => r.json())
    .then(data => {
      const arr = Array.isArray(data) ? data : []
      _cache = arr
      _promise = null
      return arr
    })
    .catch(() => {
      _promise = null
      return []
    })

  return _promise
}

const useMaterias = () => {
  const [materias, setMaterias] = useState(_cache || [])
  const [loading, setLoading] = useState(!_cache)

  useEffect(() => {
    let cancelled = false
    fetchMaterias().then(data => {
      if (!cancelled) {
        setMaterias(data)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [])

  const invalidate = () => {
    _cache = null
    _promise = null
  }

  return { materias, loading, invalidate }
}

export default useMaterias

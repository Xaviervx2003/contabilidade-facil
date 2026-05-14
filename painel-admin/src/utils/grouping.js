/**
 * Utilitários de agrupamento de dados para o Portal Contabilidade Fácil.
 */

/**
 * Agrupa itens (vídeos/questões) por matéria para exibição em pastas.
 * @param {Array} items - Lista de itens brutos.
 * @param {Array} assistidos - IDs dos vídeos já assistidos.
 * @returns {Array} - Lista de pastas formatada.
 */
export const agruparPorMateria = (items, assistidos = []) => {
  const map = {}
  
  items.forEach(q => {
    const nome = q.materia_nome || q.assunto || 'Geral'
    const mid = q.materia_id || q.materia_ids?.[0] || 0
    
    if (!map[mid]) {
      map[mid] = { 
        id: mid, 
        title: nome, 
        count: 0, 
        items: [], 
        completed: 0,
        icon: obterIconePorMateria(nome)
      }
    }
    
    map[mid].count++
    map[mid].items.push(q)
    if (assistidos.includes(q.id)) map[mid].completed++
  })

  return Object.values(map).map(f => ({
    ...f,
    progress: Math.round((f.completed / f.count) * 100)
  }))
}

/**
 * Retorna um ícone da Solar Duotone baseado no nome da matéria.
 */
export const obterIconePorMateria = (nome) => {
  const n = nome.toLowerCase()
  if (n.includes('matemática') || n.includes('estatística') || n.includes('financeira')) return 'solar:calculator-bold-duotone'
  if (n.includes('direito') || n.includes('legislação') || n.includes('societária')) return 'solar:scale-bold-duotone'
  if (n.includes('contabilidade') || n.includes('balanço') || n.includes('custos')) return 'solar:notebook-bold-duotone'
  if (n.includes('administração') || n.includes('gestão')) return 'solar:case-round-bold-duotone'
  if (n.includes('economia')) return 'solar:graph-up-bold-duotone'
  if (n.includes('trabalhista') || n.includes('humano')) return 'solar:users-group-rounded-bold-duotone'
  return 'solar:folder-2-bold-duotone'
}

export const dateFormatter = new Intl.DateTimeFormat('pt-BR')

export const dateShortFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
})

export const dateMonthYearFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
})

export const formatIsoToDateString = (isoString) => {
  if (!isoString) return ''
  try {
    return dateFormatter.format(new Date(isoString))
  } catch (e) {
    return ''
  }
}

export const formatIsoToShortDate = (isoString) => {
  if (!isoString) return ''
  try {
    return dateShortFormatter.format(new Date(isoString))
  } catch (e) {
    return ''
  }
}

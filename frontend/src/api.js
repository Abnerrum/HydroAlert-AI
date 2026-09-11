const headers = import.meta.env.VITE_API_TOKEN ? { 'X-API-Key': import.meta.env.VITE_API_TOKEN } : {}

export async function api(path) {
  const response = await fetch(path, { headers })
  if (!response.ok) throw new Error(`Falha na API (${response.status})`)
  return response.json()
}

export async function municipiosPorUf(uf) {
  if (!uf) return []
  const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`)
  if (!response.ok) throw new Error('Não foi possível consultar os municípios no IBGE')
  return response.json()
}

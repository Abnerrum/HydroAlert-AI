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

export async function buscarCep(cep) {
  const limpo = cep.replace(/\D/g, '')
  if (limpo.length !== 8) throw new Error('Digite um CEP válido com 8 números')
  const endereco = await fetch(`https://viacep.com.br/ws/${limpo}/json/`).then(r => r.json())
  if (endereco.erro) throw new Error('CEP não encontrado')
  const termo = encodeURIComponent(`${endereco.logradouro || ''}, ${endereco.localidade}, ${endereco.uf}, Brasil`)
  const locais = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${termo}`, { headers: { 'Accept-Language': 'pt-BR' } }).then(r => r.json())
  if (!locais.length) throw new Error('Endereço encontrado, mas sem coordenadas disponíveis')
  return { lat:Number(locais[0].lat), lng:Number(locais[0].lon), uf:endereco.uf, cidade:endereco.localidade, rotulo:`${endereco.logradouro || 'CEP'} — ${endereco.localidade}/${endereco.uf}` }
}

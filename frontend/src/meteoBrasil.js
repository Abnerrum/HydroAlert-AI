import CAPITAIS from '../../services/capitais_brasil.json' with { type: 'json' }

export { CAPITAIS }

const PREVISAO = 'https://api.open-meteo.com/v1/forecast'
const GEOCODE = 'https://geocoding-api.open-meteo.com/v1/search'
const VARIAVEIS = 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m'
let cache = null

export const normalizar = (texto) => String(texto || '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

export function numero(valor) {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null
}

export function parsearTempo(ponto, resposta) {
  const atual = resposta?.current || {}
  const medicao = {
    temperatura_c: numero(atual.temperature_2m),
    umidade_pct: numero(atual.relative_humidity_2m),
    precipitacao_mm: numero(atual.precipitation),
    vento_kmh: numero(atual.wind_speed_10m),
  }
  const disponivel = Boolean(typeof atual.time === 'string' && Object.values(medicao).some(v => v !== null))
  return {
    ...ponto, tipo: 'meteorologia_modelada', disponivel,
    timestamp_utc: disponivel ? atual.time + 'Z' : null,
    ...(disponivel ? medicao : Object.fromEntries(Object.keys(medicao).map(k => [k, null]))),
  }
}

async function buscarJSON(url) {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 12000)
  try {
    const resposta = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } })
    if (!resposta.ok) throw new Error('Serviço meteorológico indisponível (' + resposta.status + ').')
    return await resposta.json()
  } finally { clearTimeout(t) }
}

async function buscarLote(pontos) {
  const params = new URLSearchParams({
    latitude: pontos.map(p => p.latitude).join(','),
    longitude: pontos.map(p => p.longitude).join(','),
    current: VARIAVEIS, timezone: 'GMT',
  })
  const resposta = await buscarJSON(PREVISAO + '?' + params.toString())
  const itens = Array.isArray(resposta) ? resposta : [resposta]
  if (itens.length !== pontos.length) throw new Error('Resposta incompleta do provedor.')
  return pontos.map((p, i) => parsearTempo(p, itens[i]))
}

export async function consultarClimaBrasil({ forcar = false } = {}) {
  if (!forcar && cache && cache.expira > Date.now()) return cache.dados
  const grupos = Array.from({ length: 3 }, (_, n) => CAPITAIS.slice(n * 9, n * 9 + 9))
  const respostas = await Promise.allSettled(grupos.map(buscarLote))
  const pontos = respostas.flatMap((r, i) => r.status === 'fulfilled'
    ? r.value : grupos[i].map(p => parsearTempo(p, null)))
  const dados = {
    fonte: 'Open-Meteo', tipo: 'meteorologia_modelada',
    unidades_federativas: 27, localidades: 'capitais (1 ponto de referência por UF)',
    capital_total: 27,
    com_dados: pontos.filter(p => p.disponivel).length,
    pontos,
    aviso: 'Estimativas de modelos meteorológicos. Não são medições de rios ou sensores hidrológicos; um ponto por capital não representa o estado inteiro.',
  }
  if (dados.com_dados) cache = { expira: Date.now() + 10 * 60 * 1000, dados }
  return dados
}

export async function consultarMunicipio(uf, nomeMunicipio, estados = []) {
  const estado = estados.find(e => e.uf === uf)
  if (!estado || !nomeMunicipio || nomeMunicipio.length < 2)
    throw new Error('Selecione uma UF e um município.')
  const capital = CAPITAIS.find(c => c.uf === uf && normalizar(c.capital) === normalizar(nomeMunicipio))
  let ponto = capital
  if (!ponto) {
    const params = new URLSearchParams({
      name: nomeMunicipio + ', ' + estado.nome,
      count: '10', language: 'pt', countryCode: 'BR',
    })
    const resposta = await buscarJSON(GEOCODE + '?' + params.toString())
    const encontrado = (resposta.results || []).find(p => p.country_code === 'BR'
      && normalizar(p.name) === normalizar(nomeMunicipio)
      && normalizar(p.admin1) === normalizar(estado.nome))
    if (!encontrado) throw new Error('Município não localizado no provedor meteorológico. Não há dados para exibir.')
    ponto = { uf, capital: nomeMunicipio, latitude: encontrado.latitude, longitude: encontrado.longitude }
  }
  const [resposta] = await buscarLote([ponto])
  return { ...resposta, capital: nomeMunicipio, municipio_consultado: true }
}

/** Fonte: INPE Programa Queimadas, CSV público a cada ~10 minutos.
 * Sem credenciais; detecções satelitais NÃO significam incêndios confirmados.
 */
const BASE = 'https://dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/10min/'
const ESTADOS = {
  ACRE:'AC', ALAGOAS:'AL', AMAPA:'AP', AMAZONAS:'AM', BAHIA:'BA',
  CEARA:'CE', 'DISTRITO FEDERAL':'DF', 'ESPIRITO SANTO':'ES',
  GOIAS:'GO', MARANHAO:'MA', 'MATO GROSSO':'MT',
  'MATO GROSSO DO SUL':'MS', 'MINAS GERAIS':'MG', PARA:'PA',
  PARAIBA:'PB', PARANA:'PR', PERNAMBUCO:'PE', PIAUI:'PI',
  'RIO DE JANEIRO':'RJ', 'RIO GRANDE DO NORTE':'RN',
  'RIO GRANDE DO SUL':'RS', RONDONIA:'RO', RORAIMA:'RR',
  'SANTA CATARINA':'SC', 'SAO PAULO':'SP', SERGIPE:'SE', TOCANTINS:'TO',
}
const NORMALIZAR = (v) => String(v ?? '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').trim().toUpperCase()
const UF_VALIDAS = new Set(Object.values(ESTADOS))
const nomeCol = (v) => NORMALIZAR(v).replace(/[^A-Z0-9]/g, '')
const INPE_CSV = /^focos_10min_(\d{8})_(\d{4})\.csv$/

export function localizarArquivos(html) {
  return [...new Set([...String(html).matchAll(/focos_10min_\d{8}_\d{4}\.csv/g)].map(x => x[0]))]
    .filter(nome => INPE_CSV.test(nome)).sort().slice(-6)
}

export function colunasCSV(linha, separador = ',') {
  const saida = []
  let valor = '', aspas = false
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i]
    if (c === '"') {
      if (aspas && linha[i + 1] === '"') { valor += '"'; i++ }
      else aspas = !aspas
    } else if (c === separador && !aspas) { saida.push(valor); valor = '' }
    else valor += c
  }
  saida.push(valor)
  return saida
}

const campo = (row, inds, ...names) => {
  for (const name of names) {
    const idx = inds.get(nomeCol(name))
    if (idx !== undefined) return row[idx]
  }
  return null
}
const numero = (v) => {
  if (v == null || String(v).trim() === '') return null
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
const horarioGMT = (texto) => {
  const match = String(texto || '').match(/^(\d{4})[/-](\d\d)[/-](\d\d)[ T](\d\d):(\d\d)(?::(\d\d))?/)
  return match ? match[1] + '-' + match[2] + '-' + match[3] + 'T' + match[4] + ':' + match[5] + ':' + (match[6] || '00') + 'Z' : null
}

export function interpretarCSV(csv) {
  const linhas = String(csv).replace(/^\uFEFF/, '').split(/\r?\n/).filter(x => x.trim())
  if (linhas.length === 0) return { valido: false, focos: [] }
  const sep = linhas[0].includes(';') ? ';' : ','
  const cab = colunasCSV(linhas[0], sep).map(nomeCol)
  const inds = new Map(cab.map((nome, i) => [nome, i]))
  if (!(inds.has('LATITUDE') || inds.has('LAT')) || !(inds.has('LONGITUDE') || inds.has('LON'))) {
    return { valido: false, focos: [] }
  }
  const focos = []
  for (const linha of linhas.slice(1)) {
    const r = colunasCSV(linha, sep)
    const lat = numero(campo(r, inds, 'latitude', 'lat'))
    const lon = numero(campo(r, inds, 'longitude', 'lon'))
    if (lat == null || lon == null || lat < -34 || lat > 6 || lon < -74.5 || lon > -33) continue
    const pais = NORMALIZAR(campo(r, inds, 'pais', 'country'))
    if (pais && !['BRASIL','BRAZIL','BR'].includes(pais)) continue
    const estado = NORMALIZAR(campo(r, inds, 'estado', 'state', 'uf'))
    const uf = UF_VALIDAS.has(estado) ? estado : ESTADOS[estado]
    if (!uf) continue // não classificar pontos de países vizinhos como Brasil
    const momento = horarioGMT(campo(r, inds, 'datahora', 'data_hora_gmt', 'acq_datetime', 'data_hora'))
    focos.push({
      latitude: lat, longitude: lon, uf,
      municipio: String(campo(r, inds, 'municipio', 'city') || '').trim().slice(0, 100),
      satelite: String(campo(r, inds, 'satelite', 'satellite') || '').trim().slice(0, 40),
      timestamp_utc: momento,
      bioma: String(campo(r, inds, 'bioma') || '').trim().slice(0, 50),
      frp: numero(campo(r, inds, 'frp')),
    })
  }
  return { valido: true, focos }
}

const ler = async (url, ms = 7800) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ms)
  try {
    const r = await fetch(url, { signal: controller.signal, headers: { Accept: 'text/plain, text/csv, text/html' } })
    if (!r.ok) throw new Error('HTTP ' + r.status)
    return await r.text()
  } finally { clearTimeout(timeout) }
}

export async function carregarINPE(obter = ler, uf = '') {
  const html = await obter(BASE)
  const nomes = localizarArquivos(html)
  if (nomes.length === 0) throw new Error('O INPE não disponibilizou arquivos recentes.')
  const r = await Promise.allSettled(nomes.map(n => obter(BASE + n)))
  const focos = []
  let arquivosValidos = 0
  for (const item of r) {
    if (item.status !== 'fulfilled') continue
    const parsed = interpretarCSV(item.value)
    if (!parsed.valido) continue
    arquivosValidos++
    focos.push(...parsed.focos)
  }
  if (arquivosValidos === 0) throw new Error('Os CSVs não puderam ser validados.')
  const unicos = new Map()
  for (const foco of focos) {
    const key = [foco.latitude, foco.longitude, foco.timestamp_utc, foco.satelite].join('|')
    if (!unicos.has(key)) unicos.set(key, foco)
  }
  const resultados = [...unicos.values()].sort((a,b) => (b.timestamp_utc || '').localeCompare(a.timestamp_utc || ''))
  const por_uf = {}
  for (const foco of resultados) por_uf[foco.uf] = (por_uf[foco.uf] || 0) + 1
  const ultimoNome = nomes[nomes.length - 1].match(INPE_CSV)
  const stamp = ultimoNome[1] + 'T' + ultimoNome[2].slice(0,2) + ':' + ultimoNome[2].slice(2) + ':00Z'
  const atrasoMinutos = Math.max(0, Math.round((Date.now()-Date.parse(stamp))/60000))
  return {
    fonte:'INPE / Programa Queimadas', status: atrasoMinutos > 90 ? 'desatualizado' : 'recente',
    tipo:'deteccoes_satelitais', periodo:'6 edições de ~10 minutos (não acumulado nacional 24h)',
    arquivos_consultados: nomes.length, arquivos_validos: arquivosValidos,
    parcial: arquivosValidos < nomes.length,
    ultimo_arquivo_utc: stamp, consulta_em_utc: new Date().toISOString(),
    atraso_minutos: atrasoMinutos, total_deteccoes: resultados.length, por_uf,
    focos: resultados.filter(x => !uf || x.uf === uf).slice(0, 600),
    total_exibido: Math.min(600, uf ? (por_uf[uf] || 0) : resultados.length),
    filtro_uf: uf || null,
    url_fonte:BASE,
    aviso:'Focos de calor detectados por satélite, não incêndios confirmados. A fonte tem atraso e limitações de detecção. Não usar como alerta de emergência.',
  }
}

export default async function handler(request) {
  if (request.method !== 'GET') return new Response('Método não permitido.', { status:405 })
  try {
    const uf = new URL(request.url).searchParams.get('uf')?.toUpperCase() || ''
    if (uf && !UF_VALIDAS.has(uf)) return Response.json({ erro:'UF inválida' }, {status:400})
    const data = await carregarINPE(ler, uf)
    return Response.json(data, {
      headers:{ 'Cache-Control':'public, max-age=0, s-maxage=600, stale-while-revalidate=180' },
    })
  } catch {
    return Response.json({
      status:'indisponivel', fonte:'INPE / Programa Queimadas',
      erro:'Não foi possível consultar as detecções satelitais no INPE.',
      focos:[], total_deteccoes:null, consulta_em_utc:new Date().toISOString(),
    }, {status:503, headers:{'Cache-Control':'no-store'}})
  }
}

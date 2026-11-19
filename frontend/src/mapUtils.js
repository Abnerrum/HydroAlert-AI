export const CORES_RISCO = Object.freeze({
  CRITICO: '#ef5b70',
  ALTO: '#f59e63',
  MODERADO: '#e8c65c',
  BAIXO: '#31d5a7',
  SEM_DADOS: '#90a4b7',
})

export const RISCOS = [
  { valor: 'todos', nome: 'Todos' },
  { valor: 'CRITICO', nome: 'Crítico' },
  { valor: 'ALTO', nome: 'Alto' },
  { valor: 'MODERADO', nome: 'Moderado' },
  { valor: 'BAIXO', nome: 'Baixo' },
  { valor: 'SEM_DADOS', nome: 'Sem dados' },
]

const ORDEM = { CRITICO: 0, ALTO: 1, MODERADO: 2, BAIXO: 3, SEM_DADOS: 4 }
export const corRisco = (risco) => CORES_RISCO[risco] || CORES_RISCO.SEM_DADOS

export function prepararPontos(registros) {
  if (!Array.isArray(registros)) return []
  return registros
    .filter((p) => p && p.sensor_id
      && p.latitude !== null && p.latitude !== undefined && p.latitude !== ''
      && p.longitude !== null && p.longitude !== undefined && p.longitude !== '')
    .map((p) => ({ ...p, latitude: Number(p.latitude), longitude: Number(p.longitude) }))
    .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude)
      && Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180)
}

export function normalizarBusca(valor) {
  return String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

export function filtrarPontos(registros, busca = '', risco = 'todos') {
  const termo = normalizarBusca(busca)
  return registros.filter((p) => (
    (risco === 'todos' || (p.risco || 'SEM_DADOS') === risco)
    && (!termo || [p.sensor_id, p.nome, p.municipio, p.uf, p.regiao, p.bairro]
      .some((valor) => normalizarBusca(valor).includes(termo)))
  )).sort((a, b) => (ORDEM[a.risco] ?? 4) - (ORDEM[b.risco] ?? 4)
    || String(a.nome || a.sensor_id).localeCompare(String(b.nome || b.sensor_id), 'pt-BR'))
}

export function formatarMedida(valor, unidade, casas = 2) {
  if (valor === null || valor === undefined || valor === '') return 'Sem dados'
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero.toFixed(casas) + ' ' + unidade : 'Sem dados'
}

export function formatarData(valor) {
  if (!valor) return 'Sem leitura'
  const data = new Date(valor)
  return Number.isFinite(data.getTime()) ? data.toLocaleString('pt-BR') : 'Sem leitura'
}

/**
 * Apenas transforma respostas de fontes externas. NÃO gera estações, riscos,
 * níveis de rios ou medições sintéticas.
 */
export const LIMITE_ATUALIZACAO_CLIMA_HORAS = 4
const HORA = 60 * 60 * 1000
export function horarioValido(valor) {
  if (typeof valor !== 'string' || !valor) return null
  const t = new Date(valor).getTime()
  return Number.isFinite(t) ? t : null
}
export function fonteRecente(timestamp, agora = Date.now(), limiteHoras = LIMITE_ATUALIZACAO_CLIMA_HORAS) {
  const t = horarioValido(timestamp)
  return t !== null && t <= agora + HORA && t >= agora - limiteHoras * HORA
}
export function numeroDisponivel(valor) {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null
}
export function formatarValor(valor, unidade = '', casas = 1) {
  const n = numeroDisponivel(valor)
  return n === null ? 'Sem dados' : n.toLocaleString('pt-BR', {
    minimumFractionDigits: casas, maximumFractionDigits: casas,
  }) + unidade
}
/** Se houver município selecionado, usar apenas o ponto consultado para
 * esse município. Jamais herdar o clima da capital do mesmo estado.
 */
export function selecionarDadosMunicipais(dados, uf, municipio, local) {
  if (!municipio) return dados
  const valido = local && local.uf === uf && local.capital === municipio
  return { pontos: valido ? [local] : [] }
}
export function estatisticasMeteorologicas(dados, uf = '', agora = Date.now()) {
  const pontos = Array.isArray(dados?.pontos) ? dados.pontos.filter(p => (!uf || p.uf === uf)) : []
  const recentes = pontos.filter(p => p.disponivel && fonteRecente(p.timestamp_utc, agora))
  const comTemperatura = recentes.filter(p => numeroDisponivel(p.temperatura_c) !== null)
  const comChuva = recentes.filter(p => numeroDisponivel(p.precipitacao_mm) !== null)
  return {
    pontos,
    pontosRecentes: recentes,
    total: pontos.length,
    atualizados: recentes.length,
    tempMediaCapitais: comTemperatura.length
      ? comTemperatura.reduce((acc,p)=>acc + p.temperatura_c, 0) / comTemperatura.length
      : null,
    comChuva: comChuva.filter(p => p.precipitacao_mm > 0).length,
    comChuvaDada: comChuva.length,
    ultimaAtualizacao: recentes.map(p=>p.timestamp_utc).sort().at(-1) || null,
  }
}
export function estatisticasFocos(dados, uf = '') {
  if (!dados || dados.status === 'indisponivel'
    || typeof dados.total_deteccoes !== 'number'
    || dados.total_deteccoes < 0) return { total: null, disponivel: false, atrasado: false }
  return {
    total: uf ? (numeroDisponivel(dados.por_uf?.[uf]) ?? 0) : dados.total_deteccoes,
    disponivel: true,
    atrasado: dados.status === 'desatualizado',
    parcial: Boolean(dados.parcial),
    data: dados.ultimo_arquivo_utc ?? null,
    focos: Array.isArray(dados.focos) ? dados.focos : [],
  }
}
export function pontosMeteorologicosValidos(lista) {
  return (Array.isArray(lista) ? lista : [])
    .filter(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude)
      && p.latitude >= -35 && p.latitude <= 6
      && p.longitude >= -75 && p.longitude <= -32)
}

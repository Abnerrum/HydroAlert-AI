/**
 * REDE 100% VIRTUAL PARA DEMONSTRACAO ACADEMICA.
 * Coordenadas sao ilustrativas no entorno das capitais, sem vinculo com rios,
 * municipios monitorados, sensores fisicos ou fontes oficiais de alerta.
 */
import CAPITAIS from '../../services/capitais_brasil.json' with { type: 'json' }

export const SENSORES_VIRTUAIS_POR_UF = 100
export const SENSORES_VIRTUAIS_BRASIL = CAPITAIS.length * SENSORES_VIRTUAIS_POR_UF
export const AMOSTRA_NACIONAL_POR_UF = 4

export const normalizarLocalidade = valor => String(valor || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()

const mod = (a, n) => ((a % n) + n) % n
const arredondar = (n, casas = 2) => Number(n.toFixed(casas))

/** Gera registros deterministas por UF/nodo/janela de 30s; nenhuma medicao fisica. */
export function gerarSensorVirtual(capital, numero, instante = Date.now()) {
  if (numero < 1 || numero > SENSORES_VIRTUAIS_POR_UF) {
    throw new RangeError('Indice virtual deve estar entre 1 e 100')
  }
  const codigo = capital.uf.charCodeAt(0) + capital.uf.charCodeAt(1)
  const angulo = (numero * 2.399963229728653) + codigo / 10
  // Area ilustrativa de aproximadamente 2 a 12 km em torno da capital.
  // NAO indica posicao real de estacao/rio/pessoa.
  const raio = .018 + .074 * Math.sqrt(numero / SENSORES_VIRTUAIS_POR_UF)
  const cosLatitude = Math.max(.3, Math.cos(capital.latitude * Math.PI / 180))
  const latitude = arredondar(capital.latitude + raio * Math.sin(angulo), 6)
  const longitude = arredondar(capital.longitude + raio * Math.cos(angulo) / cosLatitude, 6)
  const ciclo = Math.floor(Number(instante) / 30_000)
  const fase = (codigo + numero * 13 + ciclo) / 17
  const nivel_m = arredondar(1.25 + 0.45 * Math.sin(fase) + (numero % 9) * .047)
  const chuva_acum_1h_mm = arredondar(Math.max(0, 8 + 6 * Math.cos(fase / 2) + numero % 11), 1)
  const risco = numero % 23 === 0 ? 'CRITICO'
    : numero % 11 === 0 ? 'ALTO'
    : numero % 4 === 0 ? 'MODERADO' : 'BAIXO'
  return {
    sensor_id: 'VIRT-' + capital.uf + '-' + String(numero).padStart(3, '0'),
    nome: 'Sensor virtual ' + String(numero).padStart(3, '0') + ' — ' + capital.capital,
    uf: capital.uf,
    municipio: capital.capital,
    regiao: 'Entorno ilustrativo da capital',
    latitude, longitude,
    nivel_m, chuva_acum_1h_mm,
    risco, risco_pico_previsto: risco,
    lead_time_estimado_h: null, // nao ha previsao fisica calculada
    timestamp: new Date(ciclo * 30_000).toISOString(),
    origem: 'SIMULACAO_ACADEMICA',
    tipo_sensor: 'VIRTUAL',
    fisico: false,
    posicao_aproximada: true,
  }
}

/** Em cada UF 100 pontos; no Brasil inteiro uma amostra cartografica de 108.
 *  O total 2700 e rotulado como configurado, nao como telemetria real recebida.
 */
export function gerarRedeVirtual({ uf = '', municipio = '', instante = Date.now() } = {}) {
  const selecionadas = uf ? CAPITAIS.filter(c => c.uf === uf) : CAPITAIS
  const totalConfigurado = selecionadas.length * SENSORES_VIRTUAIS_POR_UF
  const pontos = []
  for (const capital of selecionadas) {
    if (municipio && normalizarLocalidade(municipio) !== normalizarLocalidade(capital.capital)) continue
    const indices = uf ? Array.from({ length: 100 }, (_, idx) => idx + 1) : [1, 34, 67, 100]
    for (const indice of indices) pontos.push(gerarSensorVirtual(capital, indice, instante))
  }
  return {
    pontos,
    totalConfigurado,
    totalExibido: pontos.length,
    totalFisicos: 0,
    uf: uf || null,
    amostraNacional: !uf,
    fonte: 'SIMULACAO_ACADEMICA',
  }
}

export function montarPainelVirtual(url, instante = Date.now()) {
  const params = new URL(url, 'https://hydroalert.local').searchParams
  const uf = params.get('estado') || ''
  const municipio = params.get('municipio') || ''
  const rede = gerarRedeVirtual({ uf, municipio, instante })
  const { pontos } = rede
  // Amostra curta por nodo para evitar 2.700 x 24 pontos no navegador.
  const registros = pontos.slice(0, 32).flatMap((p, idx) =>
    Array.from({ length: 12 }, (_, i) => ({
      sensor_id: p.sensor_id,
      nivel_m: arredondar(p.nivel_m - (11-i)*.006),
      risco: p.risco,
      timestamp: new Date(Math.floor(instante/30_000)*30_000 - (11-i)*5*60_000).toISOString(),
      localizacao: { municipio: p.municipio, uf: p.uf },
      origem: 'SIMULACAO_ACADEMICA',
    }))
  ).sort((a,b) => b.timestamp.localeCompare(a.timestamp))
  const alertas = pontos.filter(p=>p.risco==='CRITICO'||p.risco==='ALTO'||p.risco==='MODERADO').map(p=>({
    alerta_id:'VIRTUAL-'+p.sensor_id,
    titulo:'Cenario simulado em '+p.municipio,
    tipo:'ALERTA_SIMULADO',
    municipio:p.municipio,
    sensor_id:p.sensor_id,
    severidade:p.risco,
    lead_time_h:null,
    requer_revisao_humana:false,
    status_revisao:'SIMULADO',
    origem:'SIMULACAO_ACADEMICA',
  }))
  const media = pontos.length ? pontos.reduce((sum,p)=>sum+p.nivel_m,0)/pontos.length : null
  const chuva = pontos.length ? pontos.reduce((sum,p)=>sum+p.chuva_acum_1h_mm,0) : null
  return {
    fonte:'SIMULACAO_ACADEMICA_NACIONAL',
    modo_dados:'simulado',
    simulacao:true,
    pontos, registros, alertas,
    resumo:{ nivel_medio_m:media, chuva_total_mm:chuva },
    territorio:{
      sensores_configurados:rede.totalConfigurado,
      sensores_com_dados:rede.totalExibido, // apenas leituras virtuais
      sensores_virtuais_exibidos:rede.totalExibido,
      sensores_fisicos_ativos:0,
      amostra_nacional:rede.amostraNacional,
    },
    metricas_alerta:{
      criticos_pendentes_revisao:0,
      total_simulados:alertas.length,
    },
    qualidade_dados:{
      score_qualidade:null, // score de qualidade fisica nao aplicavel
      total_registros:registros.length,
      registros_invalidos:0,
    },
    observacao:'Somente simulacao academica: 100 sensores VIRTUAIS por UF, '
      +'com coordenadas ilustrativas em torno da capital. '
      +'No Brasil, 108 marcadores representam uma amostra dos 2700 nos virtuais. '
      +'Nenhum equipamento fisico foi ativado nem nivel de rio medido.',
  }
}

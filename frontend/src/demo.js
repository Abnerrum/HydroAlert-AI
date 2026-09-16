const agora = () => new Date().toISOString()

const pontosBase = [
  { sensor_id:'GO-GYN-001', nome:'Rio Meia Ponte — Centro', municipio:'Goiânia', uf:'GO', latitude:-16.6869, longitude:-49.2648, nivel_m:2.18, chuva_acum_1h_mm:19.4, risco:'ALTO', risco_pico_previsto:'CRITICO', lead_time_estimado_h:3, timestamp:agora() },
  { sensor_id:'GO-APA-002', nome:'Córrego Santo Antônio', municipio:'Aparecida de Goiânia', uf:'GO', latitude:-16.8235, longitude:-49.2437, nivel_m:1.46, chuva_acum_1h_mm:11.7, risco:'MODERADO', risco_pico_previsto:'ALTO', lead_time_estimado_h:6, timestamp:agora() },
  { sensor_id:'GO-ANA-003', nome:'Rio das Antas', municipio:'Anápolis', uf:'GO', latitude:-16.3281, longitude:-48.9530, nivel_m:1.12, chuva_acum_1h_mm:6.8, risco:'BAIXO', risco_pico_previsto:'MODERADO', lead_time_estimado_h:6, timestamp:agora() },
  { sensor_id:'GO-TRI-004', nome:'Rio Paranaíba', municipio:'Trindade', uf:'GO', latitude:-16.6517, longitude:-49.4926, nivel_m:1.74, chuva_acum_1h_mm:14.1, risco:'ALTO', risco_pico_previsto:'ALTO', lead_time_estimado_h:3, timestamp:agora() },
]

function registrosDosPontos(pontos) {
  const saida = []
  for (let i = 0; i < 24; i++) {
    pontos.forEach((p, idx) => {
      const nivel = Math.max(0.4, p.nivel_m - (23 - i) * 0.018 + idx * 0.01)
      saida.push({
        sensor_id:p.sensor_id,
        nivel_m:Number(nivel.toFixed(2)),
        risco:p.risco,
        timestamp:new Date(Date.now() - (23 - i) * 10 * 60 * 1000).toISOString(),
        localizacao:{ municipio:p.municipio, uf:p.uf },
      })
    })
  }
  return saida.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp))
}

function painel(url) {
  const parsed = new URL(url, 'https://hydroalert.local')
  const estado = parsed.searchParams.get('estado') || ''
  const municipio = parsed.searchParams.get('municipio') || ''
  const pontos = pontosBase.filter(p => (!estado || p.uf === estado) && (!municipio || p.municipio === municipio))
  const registros = registrosDosPontos(pontos)
  const alertas = pontos.filter(p=>p.risco !== 'BAIXO').map((p, i)=>({
    alerta_id:`demo-${p.sensor_id}-${i}`,
    titulo:`Atenção hidrológica em ${p.municipio}`,
    tipo:'RISCO_HIDROLOGICO',
    municipio:p.municipio,
    sensor_id:p.sensor_id,
    severidade:p.risco,
    lead_time_h:p.lead_time_estimado_h,
    requer_revisao_humana:p.risco === 'ALTO' || p.risco === 'CRITICO',
    status_revisao:'PENDENTE',
  }))
  const media = pontos.length ? pontos.reduce((s,p)=>s+p.nivel_m,0)/pontos.length : 0
  const chuva = pontos.reduce((s,p)=>s+p.chuva_acum_1h_mm,0)
  return {
    fonte:'demo_netlify',
    pontos,
    alertas,
    registros,
    resumo:{ nivel_medio_m:media, chuva_total_mm:chuva },
    territorio:{ sensores_com_dados:pontos.length },
    metricas_alerta:{ criticos_pendentes_revisao:alertas.filter(a=>a.requer_revisao_humana).length },
    qualidade_dados:{ score_qualidade:96, total_registros:registros.length, registros_invalidos:0 },
  }
}

export function demoResponse(path) {
  if (path.startsWith('/api/localidades')) {
    return {
      estados_brasil:[
        {uf:'GO',nome:'Goiás'}, {uf:'DF',nome:'Distrito Federal'}, {uf:'MG',nome:'Minas Gerais'},
        {uf:'SP',nome:'São Paulo'}, {uf:'RJ',nome:'Rio de Janeiro'}, {uf:'BA',nome:'Bahia'},
      ],
    }
  }
  if (path.startsWith('/api/painel')) return painel(path)
  if (path.startsWith('/api/clima-publico')) return { disponivel:true, precipitacao_mm:3.2, precipitation:3.2, fonte:'demo' }
  if (path === '/health' || path.startsWith('/health?')) {
    return {
      status:'ok',
      api_version:'3.0.0-demo',
      modo_dados:'simulado',
      mongodb:{ conectado:false, modo:'demo_netlify' },
      machine_learning:{ disponivel:true, modo:'demo' },
      sensores_configurados:pontosBase.length,
    }
  }
  throw new Error(`Endpoint de demonstração não disponível: ${path}`)
}

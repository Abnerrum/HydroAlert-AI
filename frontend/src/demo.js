import { consultarClimaBrasil } from './meteoBrasil'
import { ESTADOS_BRASIL } from './estadosBrasil'
import { montarPainelVirtual, SENSORES_VIRTUAIS_BRASIL } from './simuladorNacional'

/** A demo nao representa dados de aparelhos reais. */
export function demoResponse(path) {
  if (path.startsWith('/api/localidades')) {
    return { pais:'Brasil', estados_brasil:ESTADOS_BRASIL }
  }
  if (path.startsWith('/api/painel')) return montarPainelVirtual(path)
  if (path.startsWith('/api/meteorologia/brasil')) {
    return consultarClimaBrasil({ forcar:path.includes('forcar=true') })
  }
  if (path.startsWith('/api/esp32/leituras')) return {
    fonte:'ESP32_FISICO_USB',status:'sem_leituras',quantidade:0,
    ultima_leitura:null,leituras:[],tem_nivel_calibrado:false,
    observacao:'Site demonstrativo sem API/ESP32 conectado. Nenhum dado fisico recebido.',
  }
  if (path.startsWith('/api/clima-publico')) {
    return {disponivel:false,precipitacao_mm:null,fonte:'indisponivel_na_demo'}
  }
  if (path === '/health' || path.startsWith('/health?')) {
    return {
      status:'ok', api_version:'3.0.0-demo', modo_dados:'simulado',
      mongodb:{conectado:false,modo:'demo_netlify'},
      machine_learning:{disponivel:false,modo:'simulacao'},
      sensores_configurados:SENSORES_VIRTUAIS_BRASIL,
      sensores_virtuais_configurados:SENSORES_VIRTUAIS_BRASIL,
      sensores_fisicos_ativos:0,
    }
  }
  throw new Error('Endpoint de demonstracao nao disponivel: '+path)
}

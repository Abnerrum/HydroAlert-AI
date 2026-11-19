import { consultarClimaBrasil } from './meteoBrasil'
import { ESTADOS_BRASIL } from './estadosBrasil'

/**
 * O nome do módulo é legado: na hospedagem estática há fontes PÚBLICAS,
 * sem substituir falhas de rede por valores artificiais.
 */
export function demoResponse(path) {
  if (path.startsWith('/api/localidades')) return {pais:'Brasil',estados_brasil:ESTADOS_BRASIL}
  if (path.startsWith('/api/meteorologia/brasil')) {
    return consultarClimaBrasil({forcar:path.includes('forcar=true')})
  }
  if (path.startsWith('/api/painel')) {
    return {
      fonte:'SEM_ESTACOES_HIDROLOGICAS_INTEGRADAS',
      modo_dados:'fontes_publicas',
      simulacao:false,
      pontos:[],alertas:[],registros:[],
      resumo:{nivel_medio_m:null,chuva_total_mm:null},
      territorio:{sensores_configurados:0,sensores_com_dados:0,sensores_fisicos_ativos:0},
      metricas_alerta:{criticos_pendentes_revisao:0},
      qualidade_dados:{score_qualidade:null,total_registros:0,registros_invalidos:null},
      observacao:'Somente fontes meteorológicas e focos de calor públicos. Sem séries reais de nível dos rios, sem sensores físicos conectados ou alertas oficiais.',
    }
  }
  if (path.startsWith('/api/esp32/leituras')) return {
    fonte:'ESP32_FISICO_USB',status:'sem_leituras',quantidade:0,
    ultima_leitura:null,leituras:[],tem_nivel_calibrado:false,
    observacao:'Sem backend de USB conectado à hospedagem. Nenhuma medição física foi recebida.',
  }
  if (path.startsWith('/api/clima-publico')) return {
    disponivel:false,precipitacao_mm:null,fonte:'indisponivel_na_hospedagem',
  }
  if (path==='/health'||path.startsWith('/health?')) return {
    status:'ok',api_version:'3.0.0-web',modo_dados:'fontes_publicas',
    mongodb:{conectado:false,modo:'somente_site_estatico'},
    machine_learning:{disponivel:false,modo:'sem_modelo_producao'},
    sensores_configurados:0,sensores_fisicos_ativos:0,
  }
  throw new Error('Endpoint sem integração validada: '+path)
}

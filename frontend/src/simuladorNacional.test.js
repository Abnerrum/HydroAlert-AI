import test from 'node:test'
import assert from 'node:assert/strict'
import { ESTADOS_BRASIL } from './estadosBrasil.js'
import {
  SENSORES_VIRTUAIS_BRASIL, gerarRedeVirtual,
  gerarSensorVirtual, montarPainelVirtual,
} from './simuladorNacional.js'
import CAPITAIS from '../../services/capitais_brasil.json' with { type: 'json' }

test('cada uma das 27 UFs tem no minimo 100 sensores virtuais (inclusive Mato Grosso)', () => {
  assert.equal(SENSORES_VIRTUAIS_BRASIL, 2700)
  const estados = new Set(ESTADOS_BRASIL.map(x=>x.uf))
  assert.deepEqual(new Set(CAPITAIS.map(x=>x.uf)), estados)
  for (const uf of estados) {
    const rede = gerarRedeVirtual({ uf, instante: Date.parse('2026-11-19T20:00:00Z') })
    assert.equal(rede.pontos.length, 100, uf)
    assert.equal(rede.totalConfigurado, 100, uf)
    assert.equal(new Set(rede.pontos.map(x=>x.sensor_id)).size, 100, uf)
    assert.ok(rede.pontos.every(x=>x.uf===uf && x.fisico===false && x.tipo_sensor==='VIRTUAL'))
  }
})

test('Mato Grosso exibe 100 virtuais, mas nenhum fisico como ativo', () => {
  const response = montarPainelVirtual('/api/painel?estado=MT',Date.parse('2026-11-19T20:00:00Z'))
  assert.equal(response.territorio.sensores_configurados,100)
  assert.equal(response.territorio.sensores_com_dados,100)
  assert.equal(response.territorio.sensores_fisicos_ativos,0)
  assert.equal(response.simulacao,true)
  assert.equal(response.modo_dados,'simulado')
  assert.ok(response.pontos.every(p=>p.origem==='SIMULACAO_ACADEMICA'))
  assert.ok(response.alertas.every(a=>a.tipo==='ALERTA_SIMULADO'))
})

test('modo Brasil mostra 108 marcadores para nao sobrecarregar o mapa', () => {
  const response = montarPainelVirtual('/api/painel')
  assert.equal(response.pontos.length,108)
  assert.equal(response.territorio.sensores_configurados,2700)
  assert.equal(response.territorio.amostra_nacional,true)
  assert.equal(response.registros.length,384)
})

test('geolocalizacao e serie sao ilustrativas e deterministicas', () => {
  const capital = CAPITAIS.find(x=>x.uf==='MT')
  const date = Date.parse('2026-11-19T20:00:00Z')
  const p = gerarSensorVirtual(capital,7,date)
  assert.deepEqual(p,gerarSensorVirtual(capital,7,date))
  assert.ok(Math.abs(p.latitude-capital.latitude)<.11)
  assert.ok(Math.abs(p.longitude-capital.longitude)<.15)
  assert.equal(p.lead_time_estimado_h,null)
  assert.equal(p.posicao_aproximada,true)
})

test('municipio fora da capital nao recebe sensores virtuais inventados', () => {
  const painel = montarPainelVirtual('/api/painel?estado=MT&municipio=Sinop')
  assert.equal(painel.pontos.length,0)
  assert.equal(painel.resumo.nivel_medio_m,null)
  assert.equal(painel.territorio.sensores_configurados,100)
  const capital = montarPainelVirtual('/api/painel?estado=MT&municipio=Cuiab%C3%A1')
  assert.equal(capital.pontos.length,100)
})

test('IDs, valores e tempo da simulacao nao se apresentam como dados oficiais', () => {
  const p=montarPainelVirtual('/api/painel?estado=DF').pontos[0]
  assert.match(p.sensor_id,/^VIRT-DF-/)
  assert.ok(Number.isFinite(p.nivel_m))
  assert.equal(p.fisico,false)
  assert.notEqual(p.origem,'ESP32_FISICO')
})

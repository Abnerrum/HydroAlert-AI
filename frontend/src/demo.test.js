import test from 'node:test'
import assert from 'node:assert/strict'
import { demoResponse } from './demo.js'

test('Mato Grosso não recebe sensores virtuais ou alertas fictícios na versão hospedada',()=>{
  const painel=demoResponse('/api/painel?estado=MT')
  assert.equal(painel.modo_dados,'fontes_publicas')
  assert.equal(painel.simulacao,false)
  assert.equal(painel.pontos.length,0)
  assert.equal(painel.alertas.length,0)
  assert.equal(painel.territorio.sensores_configurados,0)
  assert.equal(painel.resumo.nivel_medio_m,null)
  assert.equal(painel.resumo.chuva_total_mm,null)
})

test('Brasil inteiro mantém sensores hidrológicos físicos em zero até integração real',()=>{
  const pais=demoResponse('/api/painel')
  const health=demoResponse('/health')
  assert.equal(pais.pontos.length,0)
  assert.equal(health.sensores_fisicos_ativos,0)
  assert.equal(health.sensores_configurados,0)
  assert.equal(health.machine_learning.disponivel,false)
})

test('não gera precipitação falsa para CEP na versão estática',()=>{
  const resposta=demoResponse('/api/clima-publico')
  assert.equal(resposta.disponivel,false)
  assert.equal(resposta.precipitacao_mm,null)
})

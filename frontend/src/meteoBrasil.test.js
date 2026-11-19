import test from 'node:test'
import assert from 'node:assert/strict'
import { CAPITAIS, normalizar, parsearTempo } from './meteoBrasil.js'

test('catálogo cobre as 27 UFs sem pontos repetidos', () => {
  assert.equal(CAPITAIS.length, 27)
  assert.equal(new Set(CAPITAIS.map(p => p.uf)).size, 27)
  assert.ok(CAPITAIS.some(p => p.uf === 'DF' && p.capital === 'Brasília'))
  assert.ok(CAPITAIS.every(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude)))
})

test('não inventa medições quando o provedor falha', () => {
  const valor = parsearTempo(CAPITAIS[0], null)
  assert.equal(valor.disponivel, false)
  assert.equal(valor.precipitacao_mm, null)
  assert.equal(valor.timestamp_utc, null)
})

test('preserva precipitação zero e marca origem modelada', () => {
  const valor = parsearTempo(CAPITAIS[0], { current: {
    time: '2026-11-19T21:00', temperature_2m: 30,
    relative_humidity_2m: 50, precipitation: 0,
  } })
  assert.equal(valor.precipitacao_mm, 0)
  assert.equal(valor.disponivel, true)
  assert.equal(valor.timestamp_utc, '2026-11-19T21:00Z')
  assert.equal(valor.tipo, 'meteorologia_modelada')
})

test('normalização de municípios aceita acentos', () => {
  assert.equal(normalizar('Goiânia'), normalizar('Goiania'))
})

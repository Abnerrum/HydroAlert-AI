import test from 'node:test'
import assert from 'node:assert/strict'
import { filtrarPontos, formatarMedida, prepararPontos } from './mapUtils.js'

const entrada = [
  { sensor_id: 'GO-1', nome: 'Rio das Antas', municipio: 'Anápolis', latitude: -16.3, longitude: -48.9, risco: 'BAIXO' },
  { sensor_id: 'GO-2', nome: 'Córrego da Onça', municipio: 'Goiânia', latitude: -16.7, longitude: -49.3, risco: 'ALTO' },
  { sensor_id: 'GO-3', nome: 'Inválido', latitude: null, longitude: -49.3, risco: 'ALTO' },
]

test('não inventa coordenadas para sensores ausentes ou inválidos', () => {
  assert.deepEqual(prepararPontos(entrada).map((p) => p.sensor_id), ['GO-1', 'GO-2'])
  assert.deepEqual(prepararPontos([]), [])
})

test('busca por município sem depender de acentos', () => {
  const pontos = prepararPontos(entrada)
  assert.equal(filtrarPontos(pontos, 'anapolis')[0].sensor_id, 'GO-1')
  assert.equal(filtrarPontos(pontos, 'onca')[0].sensor_id, 'GO-2')
})

test('filtro por risco também limita os marcadores', () => {
  const pontos = prepararPontos(entrada)
  assert.deepEqual(filtrarPontos(pontos, '', 'ALTO').map((p) => p.sensor_id), ['GO-2'])
  assert.deepEqual(filtrarPontos(pontos, '', 'todos').map((p) => p.sensor_id), ['GO-2', 'GO-1'])
})

test('medição ausente não vira zero', () => {
  assert.equal(formatarMedida(null, 'm'), 'Sem dados')
  assert.equal(formatarMedida(0, 'm'), '0.00 m')
  assert.equal(formatarMedida('2.456', 'm'), '2.46 m')
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { ESTADOS_BRASIL, REGIOES_BRASIL } from './estadosBrasil.js'

test('os 26 estados e o Distrito Federal ficam sempre disponíveis', () => {
  const ufs = ESTADOS_BRASIL.map(e => e.uf)
  assert.equal(ufs.length,27)
  assert.equal(new Set(ufs).size,27)
  assert.ok(ufs.includes('DF'))
  assert.deepEqual(
    [...ufs].sort(),
    ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'].sort()
  )
})

test('todos os estados têm uma das cinco macrorregiões oficiais', () => {
  const regioes = new Set(REGIOES_BRASIL)
  assert.deepEqual(new Set(ESTADOS_BRASIL.map(e=>e.regiao)),regioes)
  assert.equal(ESTADOS_BRASIL.find(e=>e.uf==='DF').regiao,'Centro-Oeste')
})

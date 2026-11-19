import test from 'node:test'
import assert from 'node:assert/strict'
import { localizarArquivos, interpretarCSV, carregarINPE } from '../netlify/functions/focos-inpe.mjs'

test('usa arquivos recentes em ordem e limita a 6 períodos', () => {
  const html = Array.from({length:8},(_,i)=>'<a href="focos_10min_20261119_1' + String(i).padStart(3,'0') + '.csv">arquivo</a>').join('')
  const arquivos = localizarArquivos(html)
  assert.equal(arquivos.length,6)
  assert.equal(arquivos[0],'focos_10min_20261119_1002.csv') // arquivos hipotéticos válidos para o parser
})

test('aceita CSV do INPE e exclui outro país', () => {
  const csv = 'DataHora,Satelite,Pais,Estado,Municipio,Bioma,Latitude,Longitude,FRP\n'
    + '2026/11/19 18:00:00,GOES-19,Brasil,GOIAS,Goiânia,Cerrado,-16.6,-49.2,18.5\n'
    + '2026/11/19 18:00:00,GOES-19,Bolivia,GOIAS,X,Cerrado,-16.6,-49.2,18.5\n'
  const r=interpretarCSV(csv)
  assert.equal(r.valido,true)
  assert.equal(r.focos.length,1)
  assert.equal(r.focos[0].uf,'GO')
  assert.equal(r.focos[0].timestamp_utc,'2026-11-19T18:00:00Z')
})
test('não interpreta cabeçalho vazio como focos', () => {
  assert.equal(interpretarCSV('DataHora,Latitude,Longitude\n').focos.length,0)
  assert.equal(interpretarCSV('erro inesperado').valido,false)
})
test('falhas de todos os arquivos não viram zero focos', async () => {
  const arquivos=['focos_10min_20261119_1820.csv','focos_10min_20261119_1830.csv']
  const get=async url => url.endsWith('/10min/') ? arquivos.join('\n') : Promise.reject(new Error('off'))
  await assert.rejects(()=>carregarINPE(get),/validados/)
})

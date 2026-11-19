import test from 'node:test'
import assert from 'node:assert/strict'
import {
  estatisticasMeteorologicas, estatisticasFocos, formatarValor,
  fonteRecente, pontosMeteorologicosValidos, selecionarDadosMunicipais,
} from './indicadoresFontes.js'

const agora = Date.parse('2026-11-19T20:00:00Z')
const dados = { pontos: [
  {uf:'MT',capital:'Cuiabá',disponivel:true, timestamp_utc:'2026-11-19T19:45:00Z', temperatura_c:30,precipitacao_mm:0, latitude:-15.6,longitude:-56.1},
  {uf:'GO',capital:'Goiânia',disponivel:true, timestamp_utc:'2026-11-19T19:45:00Z', temperatura_c:26,precipitacao_mm:2, latitude:-16.6,longitude:-49.2},
  {uf:'DF',capital:'Brasília',disponivel:true, timestamp_utc:'2026-11-18T05:00:00Z', temperatura_c:24,precipitacao_mm:5, latitude:-15.7,longitude:-47.9},
  {uf:'SP',capital:'São Paulo',disponivel:false,timestamp_utc:null,temperatura_c:null,precipitacao_mm:null,latitude:-23.5,longitude:-46.6},
] }
test('estatísticas usam somente dados recebidos e recentes', () => {
 const s=estatisticasMeteorologicas(dados,'',agora)
 assert.equal(s.total,4)
 assert.equal(s.atualizados,2)
 assert.equal(s.tempMediaCapitais,28)
 assert.equal(s.comChuva,1)
 assert.equal(s.comChuvaDada,2)
 assert.equal(estatisticasMeteorologicas(dados,'MT',agora).comChuva,0)
})
test('chuva zero é dado, enquanto ausencia não vira zero', () => {
 assert.equal(formatarValor(0,' mm'), '0,0 mm')
 assert.equal(formatarValor(null,' mm'), 'Sem dados')
 assert.equal(estatisticasMeteorologicas({pontos:[]}).tempMediaCapitais,null)
})
test('não interpreta dados velhos como atualizados', () => {
 assert.equal(fonteRecente('2026-11-18T15:00:00Z',agora),false)
 assert.equal(fonteRecente('2026-11-19T19:30:00Z',agora),true)
 assert.equal(fonteRecente(null,agora),false)
})
test('sem resposta INPE exibe indisponível, não zero focos', () => {
 assert.equal(estatisticasFocos(null).total,null)
 assert.equal(estatisticasFocos({status:'indisponivel',total_deteccoes:null}).total,null)
 assert.equal(estatisticasFocos({status:'recente',total_deteccoes:7,por_uf:{GO:3,MT:0}},'MT').total,0)
 assert.equal(estatisticasFocos({status:'recente',total_deteccoes:7,por_uf:{GO:3}},'GO').total,3)
})
test('coordenadas inexistentes são descartadas, não inventadas',()=>{
 assert.equal(pontosMeteorologicosValidos([{latitude:-15,longitude:-55},{latitude:null,longitude:-55},{latitude:999,longitude:0}]).length,1)
})

test('município não herda leitura de outra cidade ou capital do estado',()=>{
 const mt={pontos:[{uf:'MT',capital:'Cuiabá',disponivel:true,temperatura_c:40}]}
 const sinop={uf:'MT',capital:'Sinop',disponivel:true,temperatura_c:25}
 assert.deepEqual(selecionarDadosMunicipais(mt,'MT','Sinop',null).pontos,[])
 assert.equal(selecionarDadosMunicipais(mt,'MT','Sinop',sinop).pontos[0].temperatura_c,25)
 assert.deepEqual(selecionarDadosMunicipais(mt,'MT','Sinop',{uf:'MT',capital:'Cuiabá'}).pontos,[])
 assert.equal(selecionarDadosMunicipais(mt,'MT','',null),mt)
})

import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'
import { CloudRain, Droplets, Globe2, RefreshCw, Thermometer, Wind } from 'lucide-react'
import { consultarMunicipio } from './meteoBrasil'
import { api } from './api'
import './brasil.css'

const CENTRO = [-14.2, -51.9]

function AjustarBrasil({ foco, resetar }) {
  const mapa = useMap()
  useEffect(() => {
    if (foco && Number.isFinite(foco.latitude) && Number.isFinite(foco.longitude))
      mapa.flyTo([foco.latitude, foco.longitude], 9, { duration: 0.6 })
    else mapa.setView(CENTRO, 4)
  }, [mapa, foco?.uf, foco?.capital, foco?.latitude, foco?.longitude, resetar])
  return null
}

const valor = (v, unidade = '', casas = 1) =>
  (v === null || v === undefined || !Number.isFinite(v))
    ? 'Sem dados' : v.toFixed(casas) + unidade

const dataFormatada = (utc) => {
  if (!utc) return 'Sem atualização'
  const data = new Date(utc)
  return Number.isFinite(data.getTime()) ? data.toLocaleString('pt-BR') : 'Sem atualização'
}

export default function BrasilMeteorologia({ uf, municipio, estados = [] }) {
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [selecao, setSelecao] = useState('')
  const [cidade, setCidade] = useState(null)
  const [erroCidade, setErroCidade] = useState('')
  const [buscandoCidade, setBuscandoCidade] = useState(false)
  const [resetar, setResetar] = useState(0)
  const [satelite, setSatelite] = useState(false)

  async function carregar(forcar = false) {
    setLoading(true)
    setErro('')
    try {
      const resposta = await api('/api/meteorologia/brasil' + (forcar ? '?forcar=true' : ''))
      setDados(resposta)
      if (!resposta.com_dados) setErro('Não foi possível acessar a meteorologia. Nenhum valor foi inventado.')
    } catch (error) {
      setErro(error.message || 'Serviço meteorológico indisponível.')
      setDados(null)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    carregar()
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') carregar(true)
    }, 10 * 60 * 1000)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => {
    setCidade(null)
    setErroCidade('')
    setSelecao('')
  }, [uf])
  useEffect(() => {
    if (!uf || !municipio) {
      setCidade(null)
      setErroCidade('')
      setBuscandoCidade(false)
      return undefined
    }
    let ativo = true
    setBuscandoCidade(true)
    setErroCidade('')
    consultarMunicipio(uf, municipio, estados)
      .then(ponto => { if (ativo) setCidade(ponto) })
      .catch(error => { if (ativo) { setCidade(null); setErroCidade(error.message) } })
      .finally(() => { if (ativo) setBuscandoCidade(false) })
    return () => { ativo = false }
  }, [uf, municipio, estados])

  const todos = dados?.pontos || []
  const pontos = useMemo(() => uf ? todos.filter(p => p.uf === uf) : todos, [todos, uf])
  const selecionado = cidade || pontos.find(p => p.uf === selecao) || (uf ? pontos[0] : null)
  const capitaisDisponiveis = pontos.filter(p => p.disponivel).length
  const comChuva = pontos.filter(p => p.disponivel && p.precipitacao_mm != null && p.precipitacao_mm > 0).length
  const temperaturas = pontos.filter(p => p.disponivel && Number.isFinite(p.temperatura_c))
  const temperaturaMedia = temperaturas.length
    ? temperaturas.reduce((soma, p) => soma + p.temperatura_c, 0) / temperaturas.length
    : null

  return <section className="national">
    <div className="national-head">
      <div><span className="national-kicker"><Globe2 size={15}/> METEOROLOGIA NACIONAL</span>
        <h2>Brasil em dados meteorológicos</h2>
        <p>Capitais das 27 unidades federativas. Atualização automática a cada 10 min enquanto a página está aberta. Saídas de modelos, não sensores de rios.</p>
      </div>
      <button className="national-refresh" type="button" disabled={loading} onClick={() => carregar(true)}>
        <RefreshCw size={16}/> {loading ? 'Consultando…' : 'Atualizar clima'}
      </button>
    </div>
    <div className="national-stats">
      <div><span>Unidades federativas</span><strong>27</strong><small>26 estados + Distrito Federal</small></div>
      <div><span>Capitais com dados</span><strong>{dados ? String(dados.com_dados) + '/27' : '—'}</strong><small>Fonte: Open-Meteo</small></div>
      <div><span>{uf ? 'Capitais com dados nesta UF' : 'Capitais com chuva modelada'}</span>
        <strong>{uf ? String(capitaisDisponiveis) + '/1' : dados ? comChuva : '—'}</strong>
        <small>{uf ? 'Ponto de referência, não toda a UF' : 'No intervalo atual do modelo'}</small></div>
      <div><span>Temperatura média</span><strong>{valor(temperaturaMedia, ' °C')}</strong>
        <small>Das capitais com leitura disponível</small></div>
    </div>
    {erro && <div className="national-error" role="status">{erro}</div>}
    {erroCidade && <div className="national-error" role="status">{erroCidade}</div>}
    <div className="national-grid">
      <article className="panel national-map-panel">
        <div className="national-panel-title"><strong>Mapa das capitais</strong><div>
          <button onClick={() => { setSelecao(''); setCidade(null); setResetar(n => n + 1) }}>Ver Brasil</button>
          <button onClick={() => setSatelite(s => !s)}>{satelite ? 'Ruas' : 'Satélite'}</button>
        </div></div>
        <MapContainer center={CENTRO} zoom={4} className="national-map" scrollWheelZoom>
          <TileLayer key={satelite ? 's' : 'r'}
            url={satelite
              ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
              : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
            attribution={satelite ? 'Tiles &copy; Esri' : '&copy; OpenStreetMap contributors'}
            maxZoom={19}/>
          <AjustarBrasil foco={selecionado} resetar={resetar}/>
          {pontos.map(p => <CircleMarker key={p.uf} center={[p.latitude,p.longitude]}
            radius={selecionado?.uf === p.uf ? 12 : 8}
            pathOptions={{color:'#ffffff',weight:2,fillOpacity:0.96,
              fillColor:p.disponivel ? '#31c7dd' : '#77889a'}}
            eventHandlers={{click:()=>{setSelecao(p.uf);setCidade(null) }}}>
            <Popup><strong>{p.capital} / {p.uf}</strong>
              <div>Temperatura: {valor(p.temperatura_c,' °C')}</div>
              <div>Precipitação modelada: {valor(p.precipitacao_mm,' mm')}</div>
              <small>Não é medição de rio nem aviso de inundação.</small>
            </Popup>
          </CircleMarker>)}
          {cidade && <CircleMarker center={[cidade.latitude,cidade.longitude]} radius={12}
            pathOptions={{color:'#ffffff',weight:2,fillColor:'#ffd16b',fillOpacity:1}}>
            <Popup>{cidade.capital} / {cidade.uf} — meteorologia modelada</Popup>
          </CircleMarker>}
        </MapContainer>
        <div className="national-map-legend">Azul: modelo disponível · Cinza: indisponível · Amarelo: município consultado</div>
      </article>
      <article className="panel national-cities-panel">
        <div className="national-panel-title"><strong>Capitais e leituras</strong><span>{pontos.length} UF(s)</span></div>
        {buscandoCidade && <p className="national-feedback">Buscando meteorologia do município...</p>}
        <div className="national-cities-scroll">
          {pontos.map(p=><button key={p.uf} type="button"
            className={selecionado?.uf === p.uf && !cidade ? 'active' : ''}
            onClick={() => {setSelecao(p.uf);setCidade(null)}}>
            <span><b>{p.capital}</b><small>{estados.find(e=>e.uf===p.uf)?.nome || p.uf} · {p.uf}</small></span>
            <span className="national-city-number">{valor(p.temperatura_c,' °C')}</span>
          </button>)}
        </div>
        <div className="national-detail">
          <span className="national-kicker">PONTO CONSULTADO</span>
          <h3>{selecionado ? selecionado.capital + ' / ' + selecionado.uf : 'Selecione uma capital'}</h3>
          <div className="national-metrics">
            <div><Thermometer size={17}/><span>Temperatura</span><strong>{valor(selecionado?.temperatura_c,' °C')}</strong></div>
            <div><CloudRain size={17}/><span>Precipitação</span><strong>{valor(selecionado?.precipitacao_mm,' mm')}</strong></div>
            <div><Droplets size={17}/><span>Umidade</span><strong>{valor(selecionado?.umidade_pct,' %',0)}</strong></div>
            <div><Wind size={17}/><span>Vento</span><strong>{valor(selecionado?.vento_kmh,' km/h')}</strong></div>
          </div>
          <p>Atualizado: {dataFormatada(selecionado?.timestamp_utc)}</p>
          <small>Open-Meteo: meteorologia modelada. Nível de rios não disponível nesta consulta.</small>
        </div>
      </article>
    </div>
    <p className="national-footnote">Cobertura nacional nas capitais; não é monitoramento hidrológico completo. Selecione UF e município nos filtros acima para consultar outra localidade. A disponibilidade depende do provedor e não garante dados de cada cidade.</p>
  </section>
}

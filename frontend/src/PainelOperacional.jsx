import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, ArrowRight, CloudRain, Droplets, MapPinned, Radio, RefreshCw, ShieldAlert, Thermometer, Waves } from 'lucide-react'
import { CAPITAIS, consultarMunicipio } from './meteoBrasil'
import './painel-operacional.css'

const GOIANIA = { uf: 'GO', capital: 'Goiânia', latitude: -16.6864, longitude: -49.2643 }
const RISCOS = { CRITICO: '#ef4665', ALTO: '#ff9258', MODERADO: '#ffc657', BAIXO: '#31d39d', SEM_DADOS: '#6d89a4' }

function MoverMapa({ local }) {
  const mapa = useMap()
  useEffect(() => {
    if (Number.isFinite(local?.latitude) && Number.isFinite(local?.longitude)) {
      mapa.flyTo([local.latitude, local.longitude], 9, { duration: 0.55 })
    }
  }, [mapa, local?.latitude, local?.longitude])
  return null
}

function Indicador({ icon: Icon, label, value, detail, tone = 'blue' }) {
  return <article className={'op-kpi op-' + tone}>
    <div className="op-kpi-icon"><Icon size={23}/></div>
    <div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
  </article>
}

const num = v => typeof v === 'number' && Number.isFinite(v) ? v : null
const formatar = (valor, unidade, casas = 1) =>
  num(valor) === null ? 'Sem dados' : valor.toFixed(casas) + unidade

export default function PainelOperacional({
  uf = '', municipio = '', estados = [], painel, modoFontesPublicas, modoSimulado, onNavigate,
}) {
  const [local, setLocal] = useState(GOIANIA)
  const [clima, setClima] = useState(null)
  const [erroClima, setErroClima] = useState('')
  const [carregandoClima, setCarregandoClima] = useState(true)
  const [versaoClima, setVersaoClima] = useState(0)
  const [satelite, setSatelite] = useState(true)

  useEffect(() => {
    let ativo = true
    const capital = CAPITAIS.find(c => c.uf === (uf || 'GO')) || GOIANIA
    setLocal(capital)
    if (uf && municipio) {
      consultarMunicipio(uf, municipio, estados).then(c => {
        if (ativo) setLocal(c)
      }).catch(() => {
        if (ativo) setLocal(capital)
      })
    }
    return () => { ativo = false }
  }, [uf, municipio, estados])

  useEffect(() => {
    let ativo = true
    const controlador = new AbortController()
    const timeout = setTimeout(() => controlador.abort(), 15000)
    setCarregandoClima(true)
    setErroClima('')
    setClima(null)
    const parametros = new URLSearchParams({
      latitude: String(local.latitude),
      longitude: String(local.longitude),
      current: 'temperature_2m,precipitation,relative_humidity_2m',
      hourly: 'precipitation',
      forecast_days: '2',
      timezone: 'America/Sao_Paulo',
    })
    fetch('https://api.open-meteo.com/v1/forecast?' + parametros, {
      headers: { Accept: 'application/json' }, signal: controlador.signal, cache: 'no-store',
    }).then(async resposta => {
      if (!resposta.ok) throw new Error('Open-Meteo indisponível')
      const dados = await resposta.json()
      if (!dados?.current?.time || num(dados?.current?.precipitation) === null)
        throw new Error('A fonte meteorológica não retornou dados verificáveis')
      if (ativo) setClima(dados)
    }).catch(() => {
      if (ativo) setErroClima('Consulta meteorológica indisponível. Nenhum valor foi estimado pelo painel.')
    }).finally(() => {
      clearTimeout(timeout)
      if (ativo) setCarregandoClima(false)
    })
    return () => { ativo = false; clearTimeout(timeout); controlador.abort() }
  }, [local.latitude, local.longitude, versaoClima])

  const pontos = painel?.pontos || []
  const alertas = painel?.alertas || []
  const fisicos = Number(painel?.territorio?.sensores_fisicos_ativos || 0)
  const comTelemetria = !modoFontesPublicas && !modoSimulado &&
    painel?.resumo?.nivel_medio_m != null
  const riscoAvaliado = comTelemetria && fisicos > 0
  const nivel = comTelemetria ? formatar(Number(painel.resumo.nivel_medio_m), ' m', 2) : 'Sem leitura'
  const risco = riscoAvaliado
    ? (alertas.some(a => a.severidade === 'CRITICO') ? 'Crítico' :
      alertas.some(a => a.severidade === 'ALTO') ? 'Alto' : 'Verificar')
    : 'Não avaliado'

  const serieChuva = useMemo(() => {
    const horas = clima?.hourly?.time
    const valores = clima?.hourly?.precipitation
    if (!Array.isArray(horas) || !Array.isArray(valores)) return []
    const horario = clima.current?.time?.slice(0, 13) + ':00'
    const indice = horas.findIndex(h => h >= horario)
    if (indice < 0) return []
    return horas.slice(indice, indice + 7).map((h, i) => ({
      hora: h.slice(11, 16), chuva: num(valores[indice + i]),
    }))
  }, [clima])

  const visiveis = pontos.filter(p =>
    p.uf === (uf || 'GO') && Number.isFinite(Number(p.latitude)) &&
    Number.isFinite(Number(p.longitude))
  ).slice(0, 90)
  const cidade = local.capital || municipio || 'Goiânia'
  const fonte = clima ? 'Open-Meteo · modelo meteorológico' :
    carregandoClima ? 'Consultando Open-Meteo…' : 'Fonte meteorológica indisponível'
  const mostrarAlertas = !modoFontesPublicas && alertas.length > 0

  return <section className="op-dashboard" aria-label="Dashboard operacional HydroAlert-AI">
    <div className="op-intro">
      <div>
        <span className="op-eyebrow"><Waves size={16}/> HYDROALERT-AI · CENTRO DE MONITORAMENTO</span>
        <h2>Painel de monitoramento</h2>
        <p>Mapa, meteorologia e informações hidrológicas da região selecionada.</p>
      </div>
      <div className="op-intro-actions">
        <span className="op-health"><i/> Site em funcionamento</span>
        <button type="button" onClick={() => setVersaoClima(v => v + 1)} disabled={carregandoClima}>
          <RefreshCw size={15}/> {carregandoClima ? 'Consultando' : 'Atualizar clima'}
        </button>
      </div>
    </div>

    <div className="op-kpis">
      <Indicador icon={Radio} label="Sensores físicos ativos" value={fisicos.toLocaleString('pt-BR')}
        detail={fisicos ? 'Informados pela API integrada' : 'Nenhum confirmado na hospedagem'} tone="blue"/>
      <Indicador icon={Waves} label="Nível dos rios" value={nivel}
        detail={comTelemetria ? 'Telemetria da API · verificar fonte' : 'Sem estação hidrológica integrada'} tone="green"/>
      <Indicador icon={CloudRain} label="Chuva atual" value={formatar(num(clima?.current?.precipitation), ' mm')}
        detail="Open-Meteo · estimativa de modelo" tone="gold"/>
      <Indicador icon={ShieldAlert} label="Risco hidrológico" value={risco}
        detail={riscoAvaliado ? 'Classificação experimental da API' : 'Sem avaliação validada'} tone="red"/>
    </div>

    <div className="op-content">
      <article className="op-panel op-map-panel">
        <div className="op-panel-heading">
          <div><span>MAPA INTERATIVO</span><h3>Monitoramento — {uf || 'GO'} / {cidade}</h3></div>
          <button type="button" className="op-plain-button" onClick={() => setSatelite(v => !v)}>
            <MapPinned size={15}/> {satelite ? 'Ruas' : 'Satélite'}
          </button>
        </div>
        <div className="op-map-wrapper">
          <MapContainer center={[GOIANIA.latitude, GOIANIA.longitude]} zoom={9}
            className="op-map" scrollWheelZoom={false}>
            <TileLayer key={satelite ? 'satelite' : 'ruas'}
              url={satelite
                ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
              attribution={satelite ? 'Tiles &copy; Esri' : '&copy; OpenStreetMap contributors'}/>
            <MoverMapa local={local}/>
            {visiveis.length ? visiveis.map((p, i) =>
              <CircleMarker key={(p.sensor_id || 'ponto') + '-' + i}
                center={[Number(p.latitude), Number(p.longitude)]}
                radius={8}
                pathOptions={{
                  color: '#ffffff', weight: 1.5, fillOpacity: 0.94,
                  fillColor: RISCOS[p.risco] || RISCOS.SEM_DADOS,
                }}>
                <Popup>
                  <strong>{p.nome || p.sensor_id}</strong>
                  <div>{p.municipio}/{p.uf}</div>
                  <div>Origem: {p.fisico === false || modoSimulado ? 'simulação acadêmica' : 'API · verificar origem'}</div>
                  <div>Nível: {p.nivel_m == null ? 'não informado' : formatar(Number(p.nivel_m), ' m', 2)}</div>
                  <small>Não é alerta oficial.</small>
                </Popup>
              </CircleMarker>
            ) : <CircleMarker center={[local.latitude, local.longitude]} radius={9}
              pathOptions={{color:'#e6f6ff',fillColor:'#37bafa',fillOpacity:.92,weight:2}}>
              <Popup><strong>{cidade} / {local.uf}</strong>
                <div>Ponto de referência geográfica, não um sensor.</div>
                <small>Sem risco hidrológico verificado nesta localidade.</small>
              </Popup>
            </CircleMarker>}
          </MapContainer>
          <div className="op-map-overlay">
            <span><i className="op-dot op-blue"/> Localização consultada</span>
            {visiveis.length > 0 && <span><i className="op-dot op-orange"/> Pontos da API: {visiveis.length}</span>}
          </div>
        </div>
        <div className="op-map-footer">
          <span>Mapa geográfico real · pontos de risco somente quando fornecidos pela API, com origem identificada.</span>
          <button type="button" onClick={() => onNavigate('mapa')}>Explorar mapa <ArrowRight size={14}/></button>
        </div>
      </article>

      <div className="op-side">
        <article className="op-panel op-forecast">
          <div className="op-panel-heading">
            <div><span>PREVISÃO METEOROLÓGICA</span><h3>Chuva nas próximas 6 horas</h3></div>
            <CloudRain size={21} className="op-heading-icon"/>
          </div>
          <div className="op-forecast-body">
            {serieChuva.length ? <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={serieChuva} margin={{top:8,right:8,left:-26,bottom:0}}>
                <defs><linearGradient id="opChuvaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#27a6fc" stopOpacity={0.36}/>
                  <stop offset="95%" stopColor="#27a6fc" stopOpacity={0.01}/>
                </linearGradient></defs>
                <CartesianGrid stroke="#24374d" vertical={false} strokeDasharray="3 4"/>
                <XAxis dataKey="hora" stroke="#90a7bd" fontSize={10} tickLine={false} axisLine={false}/>
                <YAxis stroke="#90a7bd" fontSize={10} tickLine={false} axisLine={false}/>
                <Tooltip contentStyle={{background:'#102338',border:'1px solid #31506a',color:'#eff8ff'}}
                  formatter={v => [v == null ? 'Sem dados' : v + ' mm', 'Chuva modelada']}/>
                <Area type="monotone" dataKey="chuva" stroke="#2cbbff" strokeWidth={3}
                  fill="url(#opChuvaGradient)" connectNulls={false}/>
              </AreaChart>
            </ResponsiveContainer> : <div className="op-forecast-empty">
              <CloudRain size={30}/><b>{carregandoClima ? 'Consultando a previsão…' : 'Previsão indisponível'}</b>
              <span>{erroClima || 'Aguardando dados meteorológicos.'}</span>
            </div>}
            <div className="op-forecast-footer">
              <div><span><Thermometer size={14}/> Temperatura</span>
                <b>{formatar(num(clima?.current?.temperature_2m), ' °C')}</b></div>
              <div><span><Droplets size={14}/> Umidade</span>
                <b>{formatar(num(clima?.current?.relative_humidity_2m), '%', 0)}</b></div>
            </div>
            <p>{fonte}. Chuva prevista não é previsão validada do nível de um rio.</p>
          </div>
        </article>

        <article className="op-panel op-alerts">
          <div className="op-panel-heading">
            <div><span>CENTRAL DE ALERTAS</span><h3>{mostrarAlertas ? 'Cenários e registros da API' : 'Situação hidrológica'}</h3></div>
            <AlertTriangle size={21} className="op-heading-icon op-warning"/>
          </div>
          <div className="op-alerts-body">
            {mostrarAlertas ? alertas.slice(0, 3).map((a, i) =>
              <div className="op-alert-entry" key={a.alerta_id || i}>
                <AlertTriangle size={18}/>
                <div><b>{a.titulo || a.tipo || 'Alerta registrado'}</b>
                  <span>{a.municipio || a.sensor_id || 'Sem localidade'} · {a.severidade || 'Sem classificação'}</span>
                  <small>{modoSimulado ? 'Cenário fictício acadêmico' : 'Registro experimental da API · não oficial'}</small>
                </div>
              </div>
            ) : <div className="op-no-alerts">
              <ShieldAlert size={24}/>
              <div><b>Risco não avaliado nesta hospedagem</b>
                <span>Sem dados hidrológicos físicos suficientes para emitir alertas. Isso não significa ausência de perigo.</span>
              </div>
            </div>}
            <button type="button" className="op-alerts-link" onClick={() => onNavigate('alertas')}>
              Ver painel de alertas <ArrowRight size={15}/>
            </button>
          </div>
        </article>
      </div>
    </div>

    <p className="op-disclaimer"><AlertTriangle size={15}/>
      Protótipo acadêmico: as estimativas de chuva vêm do Open-Meteo; dados de sensores e previsões de enchente dependem de integração e validação. Este painel não substitui a Defesa Civil nem avisos oficiais.
    </p>
  </section>
}

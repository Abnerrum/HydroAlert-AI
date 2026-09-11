import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'
import { Activity, AlertTriangle, CloudRain, Database, MapPin, Radio, RefreshCw, ShieldCheck, Waves } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api, municipiosPorUf } from './api'

const BRASIL = [-14.235, -51.9253]
const riscoCor = { CRITICO: '#fb3f5c', ALTO: '#ff9f43', MODERADO: '#f8d45c', BAIXO: '#2bd9a8', SEM_DADOS: '#8494a9' }

function AjustarMapa({ pontos }) {
  const map = useMap()
  useEffect(() => {
    if (!pontos.length) map.setView(BRASIL, 4)
    else if (pontos.length === 1) map.setView([pontos[0].latitude, pontos[0].longitude], 12)
    else map.fitBounds(pontos.map(p => [p.latitude, p.longitude]), { padding: [40, 40] })
  }, [map, pontos])
  return null
}

function Kpi({ icon: Icon, label, value, detail, tone = 'blue' }) {
  return <article className={`kpi ${tone}`}><div className="kpi-icon"><Icon size={21}/></div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>
}

export default function App() {
  const [catalogo, setCatalogo] = useState({ estados_brasil: [], sensores: [], cobertura: {} })
  const [painel, setPainel] = useState(null)
  const [health, setHealth] = useState(null)
  const [uf, setUf] = useState('')
  const [municipio, setMunicipio] = useState('')
  const [municipios, setMunicipios] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [atualizado, setAtualizado] = useState(null)

  async function carregarPainel(proximaUf = uf, proximoMunicipio = municipio) {
    setLoading(true); setErro('')
    try {
      const params = new URLSearchParams()
      if (proximaUf) params.set('estado', proximaUf)
      if (proximoMunicipio) params.set('municipio', proximoMunicipio)
      const [dados, saude] = await Promise.all([api(`/api/painel?${params}`), api('/health')])
      setPainel(dados); setHealth(saude); setAtualizado(new Date())
    } catch (e) { setErro(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    api('/api/localidades').then(d => { setCatalogo(d); return carregarPainel('', '') }).catch(e => { setErro(e.message); setLoading(false) })
  }, [])

  useEffect(() => {
    setMunicipio('')
    if (!uf) { setMunicipios([]); carregarPainel('', ''); return }
    municipiosPorUf(uf).then(setMunicipios).catch(e => setErro(e.message))
    carregarPainel(uf, '')
  }, [uf])

  const pontos = painel?.pontos || []
  const alertas = painel?.alertas || []
  const resumo = painel?.resumo || {}
  const serie = useMemo(() => (painel?.registros || []).slice(0, 36).reverse().map(r => ({
    hora: r.timestamp ? new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--',
    nivel: Number(r.nivel_m || 0), chuva: Number(r.chuva_acum_1h_mm || 0),
  })), [painel])
  const estadoAtual = catalogo.estados_brasil.find(e => e.uf === uf)
  const monitorada = !uf || pontos.length > 0

  return <div className="app-shell">
    <aside>
      <div className="brand"><div className="brand-mark"><Waves/></div><div><b>HydroAlert</b><span>AI BRASIL</span></div></div>
      <nav><a className="active"><Activity/>Visão nacional</a><a><MapPin/>Mapa de risco</a><a><AlertTriangle/>Alertas</a><a><Radio/>Sensores IoT</a><a><Database/>Qualidade dos dados</a></nav>
      <div className="academic"><ShieldCheck/><div><b>Protótipo acadêmico</b><p>Dados simulados. Não substitui alertas da Defesa Civil.</p></div></div>
    </aside>

    <main>
      <header><div><p className="eyebrow">CENTRO NACIONAL DE OPERAÇÕES</p><h1>Monitoramento hidrológico</h1></div><div className="status"><i></i> Sistema operacional <button onClick={() => carregarPainel()} title="Atualizar"><RefreshCw size={17}/></button></div></header>

      <section className="filters">
        <label>Estado<select value={uf} onChange={e => setUf(e.target.value)}><option value="">Brasil — todos os estados</option>{catalogo.estados_brasil.map(e => <option key={e.uf} value={e.uf}>{e.nome} ({e.uf})</option>)}</select></label>
        <label>Município<select value={municipio} disabled={!uf} onChange={e => { setMunicipio(e.target.value); carregarPainel(uf, e.target.value) }}><option value="">Todos os municípios</option>{municipios.map(m => <option key={m.id}>{m.nome}</option>)}</select></label>
        <div className="coverage"><span>Área selecionada</span><b>{municipio || estadoAtual?.nome || 'Brasil'}</b><small>{monitorada ? `${pontos.length} ponto(s) configurado(s)` : 'Expansão de sensores pendente'}</small></div>
      </section>

      {erro && <div className="error">{erro}</div>}
      {!monitorada && <div className="notice"><AlertTriangle/><div><b>Cobertura nacional preparada</b><span>A interface já permite consultar todas as UFs e municípios do Brasil. Esta localidade ainda não possui sensores cadastrados; os pontos atuais são acadêmicos e ficam em Goiás.</span></div></div>}

      <section className="kpis">
        <Kpi icon={Radio} label="Sensores ativos" value={`${painel?.territorio?.sensores_com_dados || 0}/${pontos.length}`} detail="com telemetria recente"/>
        <Kpi icon={AlertTriangle} label="Alertas abertos" value={alertas.length} detail={`${painel?.metricas_alerta?.criticos_pendentes_revisao || 0} críticos para revisar`} tone="red"/>
        <Kpi icon={Waves} label="Nível médio" value={`${Number(resumo.nivel_medio_m || 0).toFixed(2)} m`} detail={`máximo ${Number(resumo.nivel_maximo_m || 0).toFixed(2)} m`} tone="cyan"/>
        <Kpi icon={CloudRain} label="Chuva acumulada" value={`${Number(resumo.chuva_total_mm || 0).toFixed(1)} mm`} detail="na seleção atual" tone="purple"/>
      </section>

      <section className="grid">
        <article className="panel map-panel"><div className="panel-title"><div><span>MAPA OPERACIONAL</span><h2>Risco por ponto monitorado</h2></div><small>{loading ? 'Atualizando...' : atualizado?.toLocaleTimeString('pt-BR')}</small></div>
          <MapContainer center={BRASIL} zoom={4} scrollWheelZoom className="map"><TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/><AjustarMapa pontos={pontos}/>{pontos.map(p => <CircleMarker key={p.sensor_id} center={[p.latitude,p.longitude]} radius={11} pathOptions={{ color: riscoCor[p.risco] || riscoCor.SEM_DADOS, fillColor: riscoCor[p.risco] || riscoCor.SEM_DADOS, fillOpacity:.85 }}><Popup><b>{p.nome}</b><br/>{p.municipio} — {p.uf}<br/>Risco: {p.risco}<br/>Nível: {Number(p.nivel_m).toFixed(2)} m</Popup></CircleMarker>)}</MapContainer>
          <div className="legend">{Object.entries(riscoCor).slice(0,4).map(([r,c]) => <span key={r}><i style={{background:c}}></i>{r}</span>)}</div>
        </article>

        <article className="panel alerts-panel"><div className="panel-title"><div><span>PRIORIZAÇÃO</span><h2>Alertas recentes</h2></div><b>{alertas.length}</b></div><div className="alert-list">{alertas.length ? alertas.slice(0,5).map((a,i) => <div className="alert-item" key={a.alerta_id || i}><i style={{background:riscoCor[a.severidade]}}></i><div><b>{a.titulo || a.tipo}</b><span>{a.municipio || a.sensor_id} · {a.severidade}</span></div><small>{a.lead_time_h != null ? `${a.lead_time_h}h` : 'atual'}</small></div>) : <div className="empty"><ShieldCheck/><b>Nenhum alerta na seleção</b><span>O painel continua monitorando os dados disponíveis.</span></div>}</div></article>

        <article className="panel chart-panel"><div className="panel-title"><div><span>TELEMETRIA</span><h2>Evolução recente do nível</h2></div><small>metros</small></div><ResponsiveContainer width="100%" height={230}><AreaChart data={serie}><defs><linearGradient id="nivel" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#21b8ff" stopOpacity={.4}/><stop offset="95%" stopColor="#21b8ff" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#1a2b40" vertical={false}/><XAxis dataKey="hora" stroke="#71839a" fontSize={11}/><YAxis stroke="#71839a" fontSize={11}/><Tooltip contentStyle={{background:'#0d1b2b',border:'1px solid #243a52'}}/><Area type="monotone" dataKey="nivel" stroke="#21b8ff" fill="url(#nivel)" strokeWidth={2}/></AreaChart></ResponsiveContainer></article>
      </section>
      <footer>HydroAlert AI · Cobertura geográfica nacional preparada · Dados operacionais disponíveis conforme sensores integrados · Fonte territorial: IBGE</footer>
    </main>
  </div>
}

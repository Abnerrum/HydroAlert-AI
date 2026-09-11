import { useEffect, useMemo, useState } from 'react'
import { Circle, CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, AlertTriangle, Bell, BrainCircuit, Building2, CloudRain, History, LocateFixed, LogIn, MapPin, Navigation, Radio, RefreshCw, Route, Search, ShieldCheck, Smartphone, Waves } from 'lucide-react'
import { api, buscarCep, municipiosPorUf } from './api'

const BRASIL = [-14.235, -51.9253]
const cores = { CRITICO:'#fb3f5c', ALTO:'#ff9f43', MODERADO:'#f8d45c', BAIXO:'#2bd9a8', SEM_DADOS:'#8494a9' }
const abrigos = [
  {nome:'Centro de apoio — Região Central',lat:-16.679,lng:-49.255,cidade:'Goiânia'},
  {nome:'Ponto seguro — Região Sul',lat:-16.716,lng:-49.264,cidade:'Goiânia'},
  {nome:'Centro comunitário — Aparecida',lat:-16.819,lng:-49.238,cidade:'Aparecida de Goiânia'},
]

function Ajustar({pontos,busca}) {
  const map=useMap()
  useEffect(()=>{
    if(busca) map.setView([busca.lat,busca.lng],12)
    else if(!pontos.length) map.setView(BRASIL,4)
    else if(pontos.length===1) map.setView([pontos[0].latitude,pontos[0].longitude],12)
    else map.fitBounds(pontos.map(p=>[p.latitude,p.longitude]),{padding:[40,40]})
  },[map,pontos,busca])
  return null
}
function Titulo({tag,titulo,extra}) { return <div className="panel-title"><div><span>{tag}</span><h2>{titulo}</h2></div>{extra!==undefined&&<small>{extra}</small>}</div> }
function Kpi({icon:Icon,label,value,detail,tone='blue'}) { return <article className={`kpi ${tone}`}><div className="kpi-icon"><Icon size={21}/></div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article> }
function Vazio({texto='Nenhum dado encontrado'}) { return <div className="empty"><ShieldCheck/><b>{texto}</b><span>Atualize os filtros ou aguarde novas leituras.</span></div> }
function Alertas({itens}) { return <div className="alert-list">{itens.length?itens.slice(0,8).map((a,i)=><div className="alert-item" key={a.alerta_id||i}><i style={{background:cores[a.severidade]}}></i><div><b>{a.titulo||a.tipo}</b><span>{a.municipio||a.sensor_id} · {a.severidade}</span></div><small>{a.lead_time_h!=null?`${a.lead_time_h}h`:'atual'}</small></div>):<Vazio texto="Nenhum alerta na seleção"/>}</div> }

function Mapa({pontos,busca,camada,setCamada,abrigo}) {
  return <article className="panel map-panel"><Titulo tag="MAPA OPERACIONAL" titulo="Risco, calor e rotas" extra={<select value={camada} onChange={e=>setCamada(e.target.value)}><option value="risco">Pontos de risco</option><option value="calor">Mapa de calor</option><option value="abrigos">Abrigos e rotas</option></select>}/>
    <MapContainer center={BRASIL} zoom={4} scrollWheelZoom className="map"><TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/><Ajustar pontos={pontos} busca={busca}/>
      {pontos.map(p=>camada==='calor'?<Circle key={p.sensor_id} center={[p.latitude,p.longitude]} radius={Math.max(1800,Number(p.chuva_acum_1h_mm||1)*350)} pathOptions={{color:cores[p.risco],fillColor:cores[p.risco],fillOpacity:.25,weight:1}}/>:<CircleMarker key={p.sensor_id} center={[p.latitude,p.longitude]} radius={11} pathOptions={{color:cores[p.risco]||cores.SEM_DADOS,fillColor:cores[p.risco]||cores.SEM_DADOS,fillOpacity:.85}}><Popup><b>{p.nome}</b><br/>{p.municipio} — {p.uf}<br/>Risco: {p.risco}<br/>Nível: {Number(p.nivel_m).toFixed(2)} m</Popup></CircleMarker>)}
      {camada==='abrigos'&&abrigos.map(a=><CircleMarker key={a.nome} center={[a.lat,a.lng]} radius={9} pathOptions={{color:'#25dba6',fillOpacity:.8}}><Popup><b>{a.nome}</b><br/>Ponto demonstrativo; confirme com a Defesa Civil.</Popup></CircleMarker>)}
      {busca&&<Marker position={[busca.lat,busca.lng]}><Popup>{busca.rotulo}</Popup></Marker>}
      {busca&&abrigo&&camada==='abrigos'&&<Polyline positions={[[busca.lat,busca.lng],[abrigo.lat,abrigo.lng]]} pathOptions={{color:'#30c9ff',dashArray:'8 8'}}/>}
    </MapContainer><div className="legend">{Object.entries(cores).slice(0,4).map(([r,c])=><span key={r}><i style={{background:c}}></i>{r}</span>)}</div></article>
}

export default function App() {
  const [catalogo,setCatalogo]=useState({estados_brasil:[]}), [painel,setPainel]=useState(null), [health,setHealth]=useState(null)
  const [uf,setUf]=useState(''), [municipio,setMunicipio]=useState(''), [municipios,setMunicipios]=useState([])
  const [loading,setLoading]=useState(true), [erro,setErro]=useState(''), [aba,setAba]=useState('visao'), [camada,setCamada]=useState('risco')
  const [cep,setCep]=useState(''), [busca,setBusca]=useState(null), [clima,setClima]=useState(null)
  const [assinatura,setAssinatura]=useState(()=>localStorage.getItem('hydroalert-assinatura')||''), [operador,setOperador]=useState(false)

  async function carregar(proximaUf=uf,proximoMunicipio=municipio) {
    setLoading(true);setErro('')
    try {
      const q=new URLSearchParams();if(proximaUf)q.set('estado',proximaUf);if(proximoMunicipio)q.set('municipio',proximoMunicipio)
      const [p,h]=await Promise.all([api(`/api/painel?${q}`),api('/health')]);setPainel(p);setHealth(h)
    } catch(e){setErro(e.message)} finally{setLoading(false)}
  }
  useEffect(()=>{api('/api/localidades').then(d=>{setCatalogo(d);carregar('','')}).catch(e=>setErro(e.message))},[])
  useEffect(()=>{setMunicipio('');if(!uf){setMunicipios([]);carregar('','');return}municipiosPorUf(uf).then(setMunicipios).catch(e=>setErro(e.message));carregar(uf,'')},[uf])

  async function localizarCep(){
    try{const l=await buscarCep(cep);setBusca(l);setUf(l.uf);setMunicipio(l.cidade);setClima(await api(`/api/clima-publico?latitude=${l.lat}&longitude=${l.lng}`));setCamada('abrigos')}catch(e){setErro(e.message)}
  }
  function minhaLocalizacao(){navigator.geolocation?.getCurrentPosition(async p=>{const l={lat:p.coords.latitude,lng:p.coords.longitude,rotulo:'Minha localização'};setBusca(l);setCamada('abrigos');try{setClima(await api(`/api/clima-publico?latitude=${l.lat}&longitude=${l.lng}`))}catch(e){setErro(e.message)}},()=>setErro('Permita o acesso à localização no navegador.'))}
  async function ativar(){if('Notification'in window)await Notification.requestPermission();const a=municipio||uf||'Brasil';localStorage.setItem('hydroalert-assinatura',a);setAssinatura(a)}

  const pontos=painel?.pontos||[], alertas=painel?.alertas||[], resumo=painel?.resumo||{}
  const serie=useMemo(()=>(painel?.registros||[]).slice(0,36).reverse().map(r=>({hora:r.timestamp?new Date(r.timestamp).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'--',nivel:Number(r.nivel_m||0)})),[painel])
  const ranking=Object.entries(pontos.reduce((a,p)=>{a[p.municipio]=(a[p.municipio]||0)+(p.risco==='CRITICO'?4:p.risco==='ALTO'?3:p.risco==='MODERADO'?2:1);return a},{})).map(([nome,risco])=>({nome,risco})).sort((a,b)=>b.risco-a.risco).slice(0,6)
  const estado=catalogo.estados_brasil.find(e=>e.uf===uf), monitorada=!uf||pontos.length>0
  const abrigo=busca?abrigos.reduce((a,b)=>Math.hypot(a.lat-busca.lat,a.lng-busca.lng)<Math.hypot(b.lat-busca.lat,b.lng-busca.lng)?a:b):null
  const nav=[['visao',Activity,'Visão nacional'],['mapa',MapPin,'Mapa e rotas'],['alertas',Bell,'Alertas'],['historico',History,'Histórico'],['ia',BrainCircuit,'IA preditiva'],['defesa',Building2,'Defesa Civil']]

  return <div className="app-shell"><aside><div className="brand"><div className="brand-mark"><Waves/></div><div><b>HydroAlert</b><span>AI BRASIL</span></div></div><nav>{nav.map(([id,Icon,nome])=><button key={id} className={aba===id?'active':''} onClick={()=>setAba(id)}><Icon/>{nome}</button>)}</nav><div className="academic"><ShieldCheck/><div><b>Protótipo acadêmico</b><p>Dados simulados. Não substitui alertas oficiais.</p></div></div></aside>
    <main><header><div><p className="eyebrow">CENTRO NACIONAL DE OPERAÇÕES</p><h1>{nav.find(n=>n[0]===aba)?.[2]}</h1></div><div className="status"><i></i>{health?.status==='ok'?'Sistema operacional':'Conectando'}<button onClick={()=>carregar()}><RefreshCw size={17}/></button></div></header>
    <section className="filters"><label>Estado<select value={uf} onChange={e=>setUf(e.target.value)}><option value="">Brasil — todos os estados</option>{catalogo.estados_brasil.map(e=><option key={e.uf} value={e.uf}>{e.nome} ({e.uf})</option>)}</select></label><label>Município<select value={municipio} disabled={!uf} onChange={e=>{setMunicipio(e.target.value);carregar(uf,e.target.value)}}><option value="">Todos os municípios</option>{municipios.map(m=><option key={m.id}>{m.nome}</option>)}</select></label><div className="coverage"><span>Área selecionada</span><b>{municipio||estado?.nome||'Brasil'}</b><small>{monitorada?`${pontos.length} ponto(s) configurado(s)`:'Expansão de sensores pendente'}</small></div></section>
    {erro&&<div className="error">{erro}</div>}{!monitorada&&<div className="notice"><AlertTriangle/><div><b>Cobertura nacional preparada</b><span>A localidade ainda não possui sensores integrados. Nenhum risco é inventado.</span></div></div>}

    {aba==='visao'&&<><section className="kpis"><Kpi icon={Radio} label="Sensores ativos" value={`${painel?.territorio?.sensores_com_dados||0}/${pontos.length}`} detail="com telemetria recente"/><Kpi icon={AlertTriangle} label="Alertas abertos" value={alertas.length} detail={`${painel?.metricas_alerta?.criticos_pendentes_revisao||0} aguardando revisão`} tone="red"/><Kpi icon={Waves} label="Nível médio" value={`${Number(resumo.nivel_medio_m||0).toFixed(2)} m`} detail="na seleção atual" tone="cyan"/><Kpi icon={CloudRain} label="Chuva acumulada" value={`${Number(resumo.chuva_total_mm||0).toFixed(1)} mm`} detail="na seleção atual" tone="purple"/></section><section className="grid"><Mapa pontos={pontos} busca={busca} camada={camada} setCamada={setCamada} abrigo={abrigo}/><article className="panel"><Titulo tag="PRIORIZAÇÃO" titulo="Alertas recentes" extra={alertas.length}/><Alertas itens={alertas}/></article><article className="panel chart-panel"><Titulo tag="TELEMETRIA" titulo="Evolução recente do nível"/><ResponsiveContainer width="100%" height={230}><AreaChart data={serie}><CartesianGrid stroke="#1a2b40" vertical={false}/><XAxis dataKey="hora" stroke="#71839a" fontSize={11}/><YAxis stroke="#71839a" fontSize={11}/><Tooltip/><Area type="monotone" dataKey="nivel" stroke="#21b8ff" fill="#21b8ff33"/></AreaChart></ResponsiveContainer></article><article className="panel ranking"><Titulo tag="VISÃO MUNICIPAL" titulo="Ranking de atenção"/><ResponsiveContainer width="100%" height={230}><BarChart data={ranking} layout="vertical"><XAxis type="number" hide/><YAxis type="category" dataKey="nome" width={125} stroke="#8194aa" fontSize={10}/><Tooltip/><Bar dataKey="risco" fill="#ff9f43" radius={[0,5,5,0]}/></BarChart></ResponsiveContainer></article></section></>}

    {aba==='mapa'&&<section className="feature-grid"><article className="panel"><Titulo tag="LOCALIZAÇÃO" titulo="Consultar risco próximo"/><div className="form-body"><label>Digite o CEP<input value={cep} onChange={e=>setCep(e.target.value)} placeholder="74000-000"/></label><button className="primary" onClick={localizarCep}><Search/>Buscar CEP</button><button className="secondary" onClick={minhaLocalizacao}><LocateFixed/>Usar minha localização</button>{busca&&<div className="result"><Navigation/><div><b>{busca.rotulo}</b><span>{clima?`Precipitação atual: ${clima.precipitacao_mm??clima.precipitation??0} mm`:'Consultando clima...'}</span></div></div>}{abrigo&&<div className="result safe"><Route/><div><b>{abrigo.nome}</b><span>Rota demonstrativa; confirme o abrigo com a Defesa Civil.</span></div></div>}</div></article><Mapa pontos={pontos} busca={busca} camada={camada} setCamada={setCamada} abrigo={abrigo}/></section>}

    {aba==='alertas'&&<section className="feature-grid"><article className="panel"><Titulo tag="NOTIFICAÇÕES" titulo="Receber avisos da região"/><div className="form-body"><p>Ative notificações deste navegador para <b>{municipio||estado?.nome||'todo o Brasil'}</b>.</p><button className="primary" onClick={ativar}><Bell/>Ativar alertas</button>{assinatura&&<div className="success">Alertas locais ativados para: {assinatura}</div>}<small>WhatsApp, SMS e e-mail exigem provedor e credenciais em produção.</small></div></article><article className="panel"><Titulo tag="ALERTAS OPERACIONAIS" titulo="Fila atual" extra={alertas.length}/><Alertas itens={alertas}/></article></section>}
    {aba==='historico'&&<section className="panel"><Titulo tag="HISTÓRICO" titulo="Eventos e leituras registradas"/><div className="history-list">{(painel?.registros||[]).slice(0,15).map((r,i)=><div key={i}><i style={{background:cores[r.risco]}}></i><b>{r.sensor_id}</b><span>{r.localizacao?.municipio||'--'}</span><span>{Number(r.nivel_m||0).toFixed(2)} m</span><span>{r.risco}</span><time>{r.timestamp?new Date(r.timestamp).toLocaleString('pt-BR'):'--'}</time></div>)}{!painel?.registros?.length&&<Vazio texto="Nenhum evento encontrado"/>}</div></section>}
    {aba==='ia'&&<section className="feature-grid"><article className="panel"><Titulo tag="MODELO PREDITIVO" titulo="Previsões de 1h, 3h e 6h"/><div className="prediction-list">{pontos.slice(0,8).map(p=><div key={p.sensor_id}><div><b>{p.nome}</b><span>{p.municipio} · risco previsto {p.risco_pico_previsto}</span></div><strong>{p.lead_time_estimado_h?`${p.lead_time_estimado_h}h`:'--'}</strong></div>)}{!pontos.length&&<Vazio texto="Sem sensores para previsão"/>}</div></article><article className="panel"><Titulo tag="IA EXPLICÁVEL" titulo="Por que este risco?"/><div className="explanation"><BrainCircuit/><h3>Fatores analisados</h3><p>Nível atual, velocidade de subida, chuva acumulada em 15 min, 1h, 3h, 6h e 24h, intensidade e distância para as cotas de atenção e crítica.</p>{['Nível e distância da cota','Chuva acumulada','Tendência temporal'].map((f,i)=><div className="factor" key={f}><span>{f}</span><b>{i?'Média':'Alta'} influência</b></div>)}<small>Explicação geral do modelo acadêmico, não um diagnóstico oficial.</small></div></article></section>}
    {aba==='defesa'&&<section className="feature-grid"><article className="panel"><Titulo tag="ACESSO RESTRITO" titulo="Área da Defesa Civil"/><div className="login-box">{!operador?<><LogIn/><p>Demonstração de controle de acesso para operadores.</p><button className="primary" onClick={()=>setOperador(true)}>Entrar no modo demonstração</button></>:<><ShieldCheck/><h3>Operador demonstrativo</h3><p>Revisão humana e decisões auditáveis habilitadas.</p><button className="secondary" onClick={()=>setOperador(false)}>Encerrar sessão</button></>}</div></article><article className="panel"><Titulo tag="REVISÃO HUMANA" titulo="Alertas aguardando decisão"/><div className="review-list">{alertas.filter(a=>a.requer_revisao_humana).map((a,i)=><div key={a.alerta_id||i}><b>{a.titulo||a.sensor_id}</b><span>{a.severidade} · {a.status_revisao}</span><div><button disabled={!operador}>Aprovar</button><button disabled={!operador}>Rejeitar</button></div></div>)}{!alertas.some(a=>a.requer_revisao_humana)&&<Vazio texto="Nenhuma revisão pendente"/>}</div></article></section>}
    <footer><Smartphone size={12}/> HydroAlert AI · PWA instalável · IBGE · Open-Meteo · Dados de demonstração {loading&&'· atualizando'}</footer></main></div>
}

import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'
import {
  AlertTriangle, CloudRain, ExternalLink, Flame, Globe2, MapPin, RefreshCw,
  Satellite, Thermometer, Waves,
} from 'lucide-react'
import { consultarClimaBrasil, consultarMunicipio } from './meteoBrasil'
import {
  estatisticasMeteorologicas, estatisticasFocos, formatarValor,
  fonteRecente, pontosMeteorologicosValidos,
} from './indicadoresFontes'
import './visao-fontes-publicas.css'

const CENTRO_BRASIL = [-14.235, -51.9253]
const LIMITES_BRASIL = [[-33.75,-73.99],[5.27,-34.79]]
const REFRESH_MS = 10 * 60 * 1000
const FONTE_QUEIMADAS = 'https://data.inpe.br/queimadas/portal/dados-abertos/'

function AtualizarVista({ foco, uf }) {
  const mapa=useMap()
  useEffect(() => {
    if (foco?.latitude != null && foco?.longitude != null) {
      mapa.flyTo([foco.latitude, foco.longitude], uf ? 9 : 7, {duration:.6})
    } else {
      mapa.fitBounds(LIMITES_BRASIL,{padding:[24,24]})
    }
  }, [mapa, foco?.latitude, foco?.longitude, uf])
  return null
}
const hora = (value) => {
  if (!value) return 'Sem registro'
  const t = new Date(value)
  return Number.isFinite(t.getTime()) ? t.toLocaleString('pt-BR') : 'Sem registro'
}

function Card({ icone: Icon, nome, valor, detalhe, tom='' }) {
  return <article className={'fonte-card '+tom}>
    <div className="fonte-card-icon"><Icon size={21}/></div>
    <div><span>{nome}</span><strong>{valor}</strong><small>{detalhe}</small></div>
  </article>
}

/** Visão nacional default na hospedagem estática.
 * Sem geração de sensores virtuais nem valores falsos.
 * O INPE é observação satelital e Open-Meteo é saída de modelo meteorológico.
 */
export default function VisaoFontesPublicas({ uf='', municipio='', estados=[] }) {
  const [clima,setClima] = useState(null)
  const [incendios,setIncendios] = useState(null)
  const [local,setLocal] = useState(null)
  const [erroLocal,setErroLocal] = useState('')
  const [erroClima,setErroClima] = useState('')
  const [erroINPE,setErroINPE] = useState('')
  const [carregando,setCarregando] = useState(false)
  const [ultimaConsulta,setUltimaConsulta] = useState(null)
  const [versao,setVersao] = useState(0)
  const [camada,setCamada] = useState('meteorologia')
  const [satelite,setSatelite] = useState(false)
  const [selecionada,setSelecionada] = useState('')

  useEffect(()=>{
    let ativo=true
    const localizar=async()=>{
      setErroLocal('')
      setLocal(null)
      if (!uf||!municipio) return
      try {
        const ponto=await consultarMunicipio(uf,municipio,estados)
        if(ativo) setLocal(ponto)
      } catch (erro) {
        if(ativo) setErroLocal(erro.message || 'Município sem dados meteorológicos.')
      }
    }
    localizar()
    return ()=>{ativo=false}
  },[uf,municipio,estados])

  useEffect(()=>{
    let ativo=true
    let ocupado=false
    const carregar=async(forcar=false)=>{
      if(ocupado) return
      ocupado=true
      if(ativo) {
        setCarregando(true)
        setErroClima('')
        setErroINPE('')
        setIncendios(null)
      }
      const caminho= '/.netlify/functions/focos-inpe'+(uf?'?uf='+encodeURIComponent(uf):'')
      const [c,f]=await Promise.allSettled([
        consultarClimaBrasil({forcar}),
        fetch(caminho, {cache:'no-store',headers:{Accept:'application/json'}}).then(async r=>{
          if(!r.ok) throw new Error('Consulta ao INPE indisponível na hospedagem.')
          const dados=await r.json()
          if(dados?.status==='indisponivel'||typeof dados?.total_deteccoes!=='number')
            throw new Error('INPE não retornou detecções verificáveis.')
          return dados
        }),
      ])
      if(ativo){
        setClima(c.status==='fulfilled'?c.value:null)
        setErroClima(c.status==='rejected'
          ? 'Open-Meteo indisponível. Não foi gerada meteorologia fictícia.'
          : c.value?.com_dados ? '' : 'Nenhum ponto meteorológico disponível na fonte.')
        setIncendios(f.status==='fulfilled'?f.value:null)
        setErroINPE(f.status==='rejected' ? 'Dados do INPE indisponíveis nesta consulta.' : '')
        setUltimaConsulta(new Date().toISOString())
        setCarregando(false)
      }
      ocupado=false
    }
    carregar(versao>0)
    const timer=window.setInterval(()=>{
      if(document.visibilityState==='visible') carregar(true)
    },REFRESH_MS)
    return ()=>{ativo=false;window.clearInterval(timer)}
  },[uf,versao])

  useEffect(()=>setSelecionada(''),[uf,municipio])
  const agora=Date.now()
  const estat=useMemo(()=>estatisticasMeteorologicas(clima,uf,agora),[clima,uf,ultimaConsulta])
  const fo=useMemo(()=>estatisticasFocos(incendios,uf),[incendios,uf])
  const todosPontos=pontosMeteorologicosValidos(estat.pontos)
  const locais=pontosMeteorologicosValidos(local ? [local] : todosPontos)
  const marcado=local||locais.find(p=>p.uf===selecionada)|| (uf?locais[0]:null)
  const focosValidos=pontosMeteorologicosValidos(fo.focos)
  const estacoesReais=0 // nenhuma estação hidrológica autenticada/validada está conectada

  const urlClima='https://open-meteo.com/en/docs'
  return <section className="fonte-real">
    <div className="fonte-real-intro">
      <div>
        <span className="fonte-real-kicker"><Globe2 size={15}/> CONSULTA A FONTES PÚBLICAS</span>
        <h2>Brasil em monitoramento</h2>
        <p>Dados externos consultados na abertura e a cada 10 minutos. Meteorologia de modelos Open-Meteo; focos de calor observados por satélites do INPE.</p>
      </div>
      <button disabled={carregando} onClick={()=>setVersao(v=>v+1)} className="fonte-atualizar">
        <RefreshCw size={16}/>{carregando?'Consultando…':'Atualizar fontes'}
      </button>
    </div>
    <div className="fonte-origem">
      <span><i className="fonte-ponto verde"/> Open-Meteo · dados modelados</span>
      <span><i className="fonte-ponto laranja"/> INPE · detecções satelitais</span>
      <span><i className="fonte-ponto cinza"/> ANA/Cemaden · estações não integradas</span>
    </div>
    <div className="fonte-cards">
      <Card icone={MapPin} nome="Capitais com clima recente"
        valor={clima?estat.atualizados+'/'+(uf?1:27):'Sem dados'}
        detalhe="Valores modelados, até 4h de idade"/>
      <Card icone={Thermometer} nome={uf?'Temperatura na capital':'Média das capitais'}
        valor={formatarValor(estat.tempMediaCapitais,' °C')}
        detalhe="Open-Meteo · média apenas onde disponível" tom="cyan"/>
      <Card icone={CloudRain} nome="Capitais com chuva"
        valor={clima?estat.comChuva+'/'+estat.comChuvaDada:'Sem dados'}
        detalhe="Precipitação modelada no intervalo da fonte" tom="purple"/>
      <Card icone={Flame} nome={uf?'Focos na UF':'Focos de calor recentes'}
        valor={fo.disponivel?fo.total.toLocaleString('pt-BR'):'Sem dados'}
        detalhe={fo.disponivel?'INPE · seis últimas edições consultadas':'INPE · consulta indisponível'} tom="red"/>
    </div>
    <div className="fonte-rio-nota" role="note">
      <Waves size={20}/>
      <div><b>Nível real dos rios: sem dados integrados</b>
        <span>0 estações hidrológicas conectadas ao HydroAlert. Não há risco oficial calculado nem 100 sensores físicos ativos. Para observações reais, consulte <a href="https://www.snirh.gov.br/hidroweb/" target="_blank" rel="noopener noreferrer">ANA/HidroWeb</a> e <a href="https://www2.cemaden.gov.br/mapainterativo/" target="_blank" rel="noopener noreferrer">Cemaden</a>.</span>
      </div>
    </div>
    {(erroClima||erroINPE||erroLocal||fo.atrasado||fo.parcial) &&
      <div className="fonte-errors" role="status">
        <AlertTriangle size={16}/>
        <div>{erroClima&&<p>{erroClima}</p>}{erroINPE&&<p>{erroINPE}</p>}{erroLocal&&<p>{erroLocal}</p>}
          {fo.atrasado&&<p>Último arquivo do INPE está desatualizado — não é informação ao vivo.</p>}
          {fo.parcial&&<p>Arquivos do INPE foram recebidos parcialmente; os totais podem estar incompletos.</p>}</div>
      </div>}
    <div className="fonte-real-grid">
      <article className="panel fonte-map-box">
        <div className="fonte-panel-title">
          <div><span>MAPA NACIONAL</span><h3>{camada==='meteorologia'?'Temperatura e precipitação':'Focos de calor INPE'}</h3></div>
          <div className="fonte-map-actions">
            <select aria-label="Visualização do mapa" value={camada} onChange={e=>setCamada(e.target.value)}>
              <option value="meteorologia">Meteorologia</option>
              <option value="queimadas">Queimadas</option>
            </select>
            <button aria-label="Alternar satélite" onClick={()=>setSatelite(s=>!s)}>
              <Satellite size={14}/>{satelite?'Ruas':'Satélite'}
            </button>
          </div>
        </div>
        <MapContainer center={CENTRO_BRASIL} zoom={4} scrollWheelZoom className="fonte-mapa">
          <TileLayer key={satelite?'s':'m'}
            url={satelite?'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}':'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
            attribution={satelite?'Tiles &copy; Esri':'&copy; OpenStreetMap contributors'} maxZoom={18}/>
          <AtualizarVista foco={marcado} uf={uf}/>
          {camada==='meteorologia'&&locais.map((p,i)=><CircleMarker
            key={(p.uf||'LOCAL')+'-'+(p.capital||i)}
            center={[p.latitude,p.longitude]} radius={marcado===p?12:8}
            eventHandlers={{click:()=>setSelecionada(p.uf)}}
            pathOptions={{color:'#fff',fillColor:fonteRecente(p.timestamp_utc,agora)?'#269bd6':'#879aaa',fillOpacity:.95,weight:2}}>
            <Popup><strong>{p.capital} / {p.uf}</strong>
              <div>Temperatura modelada: {formatarValor(p.temperatura_c,' °C')}</div>
              <div>Chuva modelada: {formatarValor(p.precipitacao_mm,' mm')}</div>
              <div>Atualizado: {hora(p.timestamp_utc)}</div>
              <small>Open-Meteo · Não é sensor de rio nem aviso de enchente.</small>
            </Popup>
          </CircleMarker>)}
          {camada==='queimadas'&&focosValidos.map((p,i)=><CircleMarker
            key={'foco-'+i} center={[p.latitude,p.longitude]} radius={4}
            pathOptions={{color:'#ffc17e',fillColor:'#f06e2f',weight:1,fillOpacity:.85}}>
            <Popup><b>Detecção de calor — {p.uf}</b>
              <div>{p.municipio||'Município não informado'}</div>
              <div>Satélite: {p.satelite||'Não informado'}</div>
              <div>Horário: {hora(p.timestamp_utc)}</div>
              <small>Foco térmico, não incêndio confirmado.</small>
            </Popup>
          </CircleMarker>)}
        </MapContainer>
        <div className="fonte-map-footer">
          {camada==='meteorologia'?'Pontos geográficos reais das capitais; valores meteorológicos de modelo, não estações físicas.':
            'Detecções recentes em satélites; até 600 marcadores enviados pela fonte. Não são incêndios únicos.'}
        </div>
      </article>
      <article className="panel fonte-feed">
        <div className="fonte-panel-title"><div><span>FONTE EXTERNA</span><h3>{uf?'Capital e focos desta UF':'Capitais brasileiras'}</h3></div></div>
        <div className="fonte-feed-scroll">
          {locais.length ? locais.map((p,i)=><button key={(p.uf||'LOCAL')+i}
            className={marcado===p?'ativo':''} onClick={()=>{setSelecionada(p.uf);setCamada('meteorologia')}}>
            <span><strong>{p.capital} / {p.uf}</strong><small>{fonteRecente(p.timestamp_utc,agora)?'Atualização recente':'Dado atrasado ou indisponível'} · Open-Meteo</small></span>
            <b>{formatarValor(p.temperatura_c,' °C')}</b>
          </button>) : <p className="fonte-sem-dados">Nenhum ponto meteorológico na seleção. Não serão exibidos sensores inventados.</p>}
        </div>
        <div className="fonte-info-feed">
          <h4>Últimas consultas</h4>
          <p><b>Open-Meteo:</b> {hora(estat.ultimaAtualizacao)} · {estat.atualizados} ponto(s) recente(s).</p>
          <p><b>INPE:</b> {hora(fo.data)} · {fo.disponivel?fo.atrasado?'Arquivo atrasado':'Arquivo recebido':'Sem confirmação'}</p>
          <p><b>Consulta do site:</b> {hora(ultimaConsulta)}.</p>
          <div className="fonte-links">
            <a href={urlClima} target="_blank" rel="noopener noreferrer">Documentação Open-Meteo <ExternalLink size={12}/></a>
            <a href={FONTE_QUEIMADAS} target="_blank" rel="noopener noreferrer">Portal INPE <ExternalLink size={12}/></a>
          </div>
        </div>
      </article>
    </div>
    <p className="fonte-legal"><AlertTriangle size={15}/> Dados públicos com intervalos e atrasos próprios. Meteorologia é estimativa de modelo e queimadas são detecções por satélite. O HydroAlert não emite avisos oficiais de risco; em emergências, consulte as autoridades competentes. {estacoesReais} estação(ões) hidrológica(s) conectada(s).</p>
  </section>
}

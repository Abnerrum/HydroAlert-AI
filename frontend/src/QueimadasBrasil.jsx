import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'
import { AlertTriangle, Flame, RefreshCw, Satellite, MapPin } from 'lucide-react'
import { api } from './api'
import './queimadas.css'

const CENTRAL = [-14.2, -51.9]
const TEMPO_REFRESH_MS = 10 * 60 * 1000
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'

function Reposicionar({ pontos, uf }) {
  const map = useMap()
  const chave = pontos.map(p => p.uf).join('|')
  useEffect(() => {
    if (!uf || pontos.length === 0) map.setView(CENTRAL, 4)
    else if (pontos.length === 1) map.setView([pontos[0].latitude, pontos[0].longitude], 7)
    else map.fitBounds(pontos.map(p => [p.latitude,p.longitude]), { padding: [30,30], maxZoom: 9 })
  }, [map, uf, chave])
  return null
}

function horario(iso) {
  if (!iso) return 'Horário indisponível'
  const dt = new Date(iso)
  return Number.isFinite(dt.getTime()) ? dt.toLocaleString('pt-BR') : 'Horário indisponível'
}

export default function QueimadasBrasil({ uf = '' }) {
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [satelite, setSatelite] = useState(false)
  const [ultimoRefresh, setUltimoRefresh] = useState(null)

  useEffect(() => {
    let ativo = true
    let emCurso = false
    const carregar = async () => {
      if (emCurso) return
      emCurso = true
      if (ativo) { setCarregando(true); setErro('') }
      const url = DEMO_MODE
        ? '/.netlify/functions/focos-inpe' + (uf ? '?uf=' + encodeURIComponent(uf) : '')
        : '/api/queimadas' + (uf ? '?uf=' + encodeURIComponent(uf) : '')
      try {
        let recebido
        if (DEMO_MODE) {
          const response = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } })
          if (!response.ok) throw new Error('Os focos do INPE não estão disponíveis nesta consulta.')
          recebido = await response.json()
        } else {
          recebido = await api(url)
        }
        if (recebido.status === 'indisponivel') throw new Error(recebido.erro)
        if (ativo) {
          setDados(recebido)
          setUltimoRefresh(new Date().toISOString())
        }
      } catch (e) {
        if (ativo) {
          setErro(e.message || 'Consulta indisponível.')
          setDados(null)
        }
      } finally {
        emCurso = false
        if (ativo) setCarregando(false)
      }
    }
    carregar()
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') carregar()
    }, TEMPO_REFRESH_MS)
    const onRecarregar = () => { carregar() }
    window.addEventListener('hydroalert-recarregar-focos', onRecarregar)
    return () => {
      ativo = false
      window.clearInterval(timer)
      window.removeEventListener('hydroalert-recarregar-focos', onRecarregar)
    }
  }, [uf])

  const focos = dados?.focos || []
  const ranking = useMemo(() => Object.entries(dados?.por_uf || {})
    .sort((a,b) => b[1] - a[1]).slice(0,10), [dados])
  const totalLocal = uf ? dados?.por_uf?.[uf] || 0 : dados?.total_deteccoes
  const fonteAtrasada = dados?.status === 'desatualizado'
  const exibeParcial = Boolean(dados?.parcial || (totalLocal || 0) > focos.length)

  return <section className="fires">
    <div className="fires-hero">
      <div>
        <span className="fires-kicker"><Flame size={15}/> FOCOS DE CALOR / MONITORAMENTO NACIONAL</span>
        <h2>Queimadas detectadas por satélite</h2>
        <p>INPE — últimos arquivos públicos de 10 minutos. Atualização automática a cada 10 minutos enquanto a página está aberta e visível.</p>
      </div>
      <button type="button" className="fires-refresh" disabled={carregando}
        onClick={() => window.dispatchEvent(new Event('hydroalert-recarregar-focos'))}>
        <RefreshCw size={17}/> {carregando ? 'Consultando…' : 'Atualizar agora'}
      </button>
    </div>
    <div className="fires-stats">
      <div><small>{uf ? 'Detecções na UF' : 'Detecções nos arquivos'}</small><strong>{dados ? Number(totalLocal).toLocaleString('pt-BR') : '—'}</strong><span>Não é quantidade de incêndios únicos</span></div>
      <div><small>Arquivos validados</small><strong>{dados ? String(dados.arquivos_validos) + ' / ' + dados.arquivos_consultados : '—'}</strong><span>Até seis edições (~1 hora)</span></div>
      <div><small>Pontos mostrados no mapa</small><strong>{dados ? focos.length.toLocaleString('pt-BR') : '—'}</strong><span>Limite visual de 600 marcadores</span></div>
      <div><small>Última edição publicada</small><strong className="fires-time">{dados ? horario(dados.ultimo_arquivo_utc) : '—'}</strong>
        <span>{dados ? String(dados.atraso_minutos) + ' min desde a edição' : 'Fonte ainda não consultada'}</span></div>
    </div>
    {fonteAtrasada && <div className="fires-warning" role="status"><AlertTriangle size={17}/> Os dados publicados pelo INPE estão atrasados. Não representam uma situação ao vivo.</div>}
    {dados?.parcial && <div className="fires-warning" role="status">Alguns arquivos do INPE não puderam ser consultados. Os totais são parciais.</div>}
    {erro && <div className="fires-warning" role="alert"><AlertTriangle size={17}/> {erro} Sem valores simulados como substituição. <a href="https://data.inpe.br/queimadas/portal/dados-abertos/" target="_blank" rel="noopener noreferrer">Consultar fonte oficial</a></div>}
    <div className="fires-body">
      <article className="panel fires-map-panel">
        <div className="fires-panel-title"><span><MapPin size={16}/> Localização das detecções</span>
          <button type="button" onClick={() => setSatelite(v => !v)}><Satellite size={15}/>{satelite ? 'Ruas' : 'Satélite'}</button></div>
        <MapContainer center={CENTRAL} zoom={4} className="fires-map" scrollWheelZoom>
          <TileLayer key={satelite ? 's' : 'r'}
            url={satelite
              ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
              : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
            attribution={satelite ? 'Tiles &copy; Esri' : '&copy; OpenStreetMap contributors'} maxZoom={19}/>
          <Reposicionar pontos={focos} uf={uf}/>
          {focos.map((p,i) => <CircleMarker key={p.uf + ':' + p.latitude + ':' + p.longitude + ':' + i}
            center={[p.latitude,p.longitude]} radius={5}
            pathOptions={{color:'#ffdfae',fillColor:'#ef7e31',fillOpacity:.9,weight:1}}
          >
            <Popup>
              <b>Foco de calor — {p.uf}</b>
              <div>{p.municipio || 'Município não informado'}</div>
              <div>Satélite: {p.satelite || 'Não informado'}</div>
              <div>Detecção: {horario(p.timestamp_utc)}</div>
              <div>FRP: {p.frp == null ? 'Não informado' : p.frp + ' MW'}</div>
              <small>Detecção térmica, não confirmação de incêndio.</small>
            </Popup>
          </CircleMarker>)}
        </MapContainer>
        <p className="fires-legend"><span/> Pontos laranja: detecções por satélite. {exibeParcial && 'Amostra limitada no mapa; consulte os totais para o conjunto dos arquivos.'}</p>
      </article>
      <article className="panel fires-side">
        <div className="fires-panel-title"><span>Distribuição por estado</span><span>INPE</span></div>
        <div className="fires-rank">
          {ranking.length ? ranking.map(([sigla,quantidade]) => <div key={sigla}>
            <span>{sigla}</span>
            <div className="fires-bar"><i style={{width:(100 * quantidade / ranking[0][1]) + '%'}}/></div>
            <strong>{quantidade.toLocaleString('pt-BR')}</strong>
          </div>) : <p>{carregando ? 'Buscando dados…' : 'Nenhuma detecção disponível nos arquivos consultados.'}</p>}
        </div>
        <div className="fires-source">
          <strong>Origem verificável</strong>
          <p>INPE — arquivos CSV de focos de calor. A detecção depende da passagem dos satélites, do processamento e da publicação.</p>
          <p>Última consulta: {ultimoRefresh ? horario(ultimoRefresh) : 'Ainda não consultado'}</p>
          <a href="https://data.inpe.br/queimadas/portal/dados-abertos/" target="_blank" rel="noopener noreferrer">Acessar dados oficiais do INPE</a>
        </div>
      </article>
    </div>
    <div className="fires-warning"><AlertTriangle size={17}/> Focos não equivalem a incêndios confirmados, área queimada ou risco individual. Não utilize este painel para decisões de emergência. Em situações de risco, consulte a Defesa Civil e o Corpo de Bombeiros.</div>
  </section>
}

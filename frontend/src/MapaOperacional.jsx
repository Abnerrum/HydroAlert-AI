import { useEffect, useMemo, useRef, useState } from 'react'
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'
import {
  ChevronRight, Compass, Expand, Layers3, MapPin, Maximize2, Minimize2,
  Minus, Plus, Search, SlidersHorizontal, Waves, X,
} from 'lucide-react'
import {
  CORES_RISCO, RISCOS, corRisco, filtrarPontos, formatarData,
  formatarMedida, prepararPontos,
} from './mapUtils'
import './mapa-operacional.css'

const BRASIL = [-14.235, -51.9253]
const CAMADAS = {
  neutro: {
    nome: 'Neutro',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  },
  ruas: {
    nome: 'Ruas',
    attribution: '&copy; OpenStreetMap contributors',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  },
  satelite: {
    nome: 'Satélite',
    attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  },
}

function Coordenadas({ pontos, selecionado, busca, atualizarVisao }) {
  const mapa = useMap()
  const chave = pontos.map((p) => p.sensor_id + ':' + p.latitude + ':' + p.longitude).join('|')

  useEffect(() => {
    if (selecionado || busca) return
    if (!pontos.length) mapa.setView(BRASIL, 4)
    else if (pontos.length === 1) mapa.setView([pontos[0].latitude, pontos[0].longitude], 12)
    else mapa.fitBounds(pontos.map((p) => [p.latitude, p.longitude]), { padding: [32, 32], maxZoom: 12 })
  }, [mapa, chave, atualizarVisao, Boolean(selecionado), Boolean(busca)])

  useEffect(() => {
    if (selecionado) mapa.flyTo([selecionado.latitude, selecionado.longitude], Math.max(12, mapa.getZoom()), { duration: 0.7 })
    else if (busca && Number.isFinite(Number(busca.lat)) && Number.isFinite(Number(busca.lng))) {
      mapa.flyTo([Number(busca.lat), Number(busca.lng)], 12, { duration: 0.7 })
    }
  }, [mapa, selecionado?.sensor_id, busca?.lat, busca?.lng])

  return null
}

function Indicador({ cor, filhos }) {
  return <span className="geo-indicador"><span style={{ backgroundColor: cor }} />{filhos}</span>
}

export default function MapaOperacional({
  pontos = [], busca, camada = 'risco', setCamada, abrigos = [],
}) {
  const [mapaBase, setMapaBase] = useState('neutro')
  const [texto, setTexto] = useState('')
  const [risco, setRisco] = useState('todos')
  const [selecionadoId, setSelecionadoId] = useState(null)
  const [expandido, setExpandido] = useState(false)
  const [reajustar, setReajustar] = useState(0)
  const mapaRef = useRef(null)

  const validos = useMemo(() => prepararPontos(pontos), [pontos])
  const filtrados = useMemo(() => filtrarPontos(validos, texto, risco), [validos, texto, risco])
  const selecionado = filtrados.find((p) => p.sensor_id === selecionadoId) || null
  const resumo = useMemo(() => validos.reduce((acc, p) => {
    acc[p.risco] = (acc[p.risco] || 0) + 1
    return acc
  }, {}), [validos])

  useEffect(() => { setSelecionadoId(null) }, [busca?.lat, busca?.lng])
  useEffect(() => {
    if (!expandido) return undefined
    const fechar = (event) => { if (event.key === 'Escape') setExpandido(false) }
    window.addEventListener('keydown', fechar)
    return () => window.removeEventListener('keydown', fechar)
  }, [expandido])
  useEffect(() => {
    const id = window.setTimeout(() => mapaRef.current?.invalidateSize(), 80)
    return () => window.clearTimeout(id)
  }, [expandido])

  const verTodos = () => {
    setSelecionadoId(null)
    setReajustar((valor) => valor + 1)
  }

  return <article className={'panel map-panel geo-panel' + (expandido ? ' geo-expanded' : '')}>
    <div className="geo-header">
      <div>
        <span className="geo-overline"><span className="geo-live-dot" /> PAINEL CARTOGRÁFICO / DEMONSTRAÇÃO</span>
        <h2>Mapa interativo <span className="geo-head-count">{validos.length} pontos</span></h2>
        <p>Selecione um ponto para consultar detalhes do cenário hidrológico.</p>
      </div>
      <div className="geo-header-actions">
        <button type="button" className="geo-quiet-button" onClick={verTodos} title="Mostrar todos os pontos">
          <Compass size={16} /> <span>Enquadrar pontos</span>
        </button>
        <button type="button" className="geo-square-button" onClick={() => setExpandido((valor) => !valor)}
          aria-label={expandido ? 'Reduzir mapa' : 'Expandir mapa'} title={expandido ? 'Reduzir mapa' : 'Expandir mapa'}>
          {expandido ? <Minimize2 size={19} /> : <Maximize2 size={19} />}
        </button>
      </div>
    </div>
    <div className="geo-workspace">
      <div className="geo-mapstage">
        <MapContainer center={BRASIL} zoom={5} scrollWheelZoom={true} zoomControl={false}
          className="geo-map" ref={mapaRef}>
          <TileLayer key={mapaBase} url={CAMADAS[mapaBase].url}
            attribution={CAMADAS[mapaBase].attribution} maxZoom={19} />
          <Coordenadas pontos={filtrados} selecionado={selecionado} busca={busca} atualizarVisao={reajustar} />
          {camada === 'calor' && filtrados.map((p) => <Circle
            key={'chuva-' + p.sensor_id} center={[p.latitude, p.longitude]}
            radius={Math.max(500, Math.min(12000, Number(p.chuva_acum_1h_mm || 0) * 250))}
            interactive={false}
            pathOptions={{ color: corRisco(p.risco), fillColor: corRisco(p.risco), fillOpacity: .19, weight: 1 }} />)}
          {filtrados.map((p) => <CircleMarker
            key={p.sensor_id} center={[p.latitude, p.longitude]}
            radius={selecionadoId === p.sensor_id ? 14 : 10}
            pathOptions={{
              color: '#ffffff', weight: selecionadoId === p.sensor_id ? 3 : 2,
              fillColor: corRisco(p.risco), fillOpacity: .95,
            }}
            eventHandlers={{ click: () => setSelecionadoId(p.sensor_id) }}>
            <Popup>
              <div className="geo-popup">
                <strong>{p.nome || p.sensor_id}</strong>
                <span>{p.municipio || 'Localidade não informada'}{p.uf ? ' / ' + p.uf : ''}</span>
                <span>Risco demonstrativo: <b>{p.risco || 'SEM_DADOS'}</b></span>
                <span>Nível: {formatarMedida(p.nivel_m, 'm')}</span>
                <small>Coordenadas e leitura do protótipo — verificar fonte antes de uso real.</small>
              </div>
            </Popup>
          </CircleMarker>)}
          {camada === 'abrigos' && abrigos.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
            .map((p) => <CircleMarker key={p.nome} center={[p.lat, p.lng]} radius={8}
              pathOptions={{ color: '#ffffff', fillColor: '#409ff3', fillOpacity: 1, weight: 2 }}>
              <Popup><b>{p.nome}</b><p>Ponto demonstrativo, não é abrigo verificado ou rota oficial.</p></Popup>
            </CircleMarker>)}
          {busca && Number.isFinite(Number(busca.lat)) && Number.isFinite(Number(busca.lng)) &&
            <CircleMarker center={[Number(busca.lat), Number(busca.lng)]} radius={11}
              pathOptions={{ color: '#ffffff', fillColor: '#218ce4', fillOpacity: 1, weight: 3 }}>
              <Popup><strong>{busca.rotulo || 'Local pesquisado'}</strong></Popup>
            </CircleMarker>}
        </MapContainer>
        <div className="geo-map-tools" role="group" aria-label="Ferramentas do mapa">
          <select aria-label="Tipo do mapa" value={mapaBase} onChange={(e) => setMapaBase(e.target.value)}>
            {Object.entries(CAMADAS).map(([valor, tipo]) => <option key={valor} value={valor}>{tipo.nome}</option>)}
          </select>
          <select aria-label="Camada de pontos" value={camada}
            onChange={(e) => setCamada(e.target.value)}>
            <option value="risco">Risco</option>
            <option value="calor">Chuva ilustrativa</option>
            <option value="abrigos">Pontos de apoio fictícios</option>
          </select>
        </div>
        <div className="geo-zoom" role="group" aria-label="Zoom do mapa">
          <button type="button" title="Aumentar zoom" aria-label="Aumentar zoom" onClick={() => mapaRef.current?.zoomIn()}><Plus size={17} /></button>
          <button type="button" title="Diminuir zoom" aria-label="Diminuir zoom" onClick={() => mapaRef.current?.zoomOut()}><Minus size={17} /></button>
          <button type="button" title="Enquadrar todos" aria-label="Enquadrar todos" onClick={verTodos}><Expand size={17} /></button>
        </div>
        <div className="geo-map-tag"><Layers3 size={13}/> Mapa interativo · dados ilustrativos</div>
      </div>
      <aside className="geo-points-panel" aria-label="Lista dos pontos de monitoramento">
        <div className="geo-rail-head">
          <div><h3>Pontos monitorados</h3><span>{filtrados.length} de {validos.length} exibidos</span></div>
          <SlidersHorizontal size={17}/>
        </div>
        <label className="geo-search">
          <Search size={17}/>
          <input value={texto} onChange={(e) => setTexto(e.target.value)}
            aria-label="Buscar sensor ou município" placeholder="Buscar sensor ou município"/>
          {texto && <button type="button" onClick={() => setTexto('')} aria-label="Limpar busca"><X size={15}/></button>}
        </label>
        <div className="geo-risk-tabs" role="group" aria-label="Filtrar pontos por risco">
          {RISCOS.map((opcao) => <button type="button" key={opcao.valor}
            aria-pressed={risco === opcao.valor}
            className={risco === opcao.valor ? 'geo-risk-active' : ''}
            onClick={() => { setRisco(opcao.valor); setSelecionadoId(null) }}>
            {opcao.nome}{opcao.valor !== 'todos' && <small>{resumo[opcao.valor] || 0}</small>}
          </button>)}
        </div>
        <div className="geo-points-scroll">
          {filtrados.map((p) => <button key={p.sensor_id} type="button"
            className={'geo-point-row' + (p.sensor_id === selecionadoId ? ' geo-point-selected' : '')}
            aria-pressed={p.sensor_id === selecionadoId}
            onClick={() => setSelecionadoId(p.sensor_id)}>
            <span className="geo-point-marker" style={{ background: corRisco(p.risco) }}><MapPin size={15}/></span>
            <span className="geo-point-copy">
              <strong>{p.nome || p.sensor_id}</strong>
              <small>{p.municipio || 'Local não definido'} {p.uf ? '/ ' + p.uf : ''}</small>
              <span className="geo-point-sub">{p.sensor_id}</span>
            </span>
            <span className="geo-point-status" style={{ color: corRisco(p.risco) }}>{p.risco || 'SEM_DADOS'}</span>
            <ChevronRight size={14} className="geo-point-arrow"/>
          </button>)}
          {!filtrados.length && <div className="geo-list-empty"><Search size={24}/><strong>Nenhum ponto encontrado</strong><p>Altere a busca ou os filtros. Não criamos localizações artificiais.</p></div>}
        </div>
        <div className="geo-details">
          {selecionado ? <>
            <div className="geo-details-title"><span>DETALHES DO PONTO</span><button type="button" onClick={() => setSelecionadoId(null)} aria-label="Fechar detalhes"><X size={16}/></button></div>
            <strong className="geo-details-name">{selecionado.nome || selecionado.sensor_id}</strong>
            <Indicador cor={corRisco(selecionado.risco)} filhos={'Risco demonstrativo: ' + (selecionado.risco || 'SEM_DADOS')}/>
            <div className="geo-reading-grid">
              <div><small>Nível da água</small><b>{formatarMedida(selecionado.nivel_m, 'm')}</b></div>
              <div><small>Chuva 1 hora</small><b>{formatarMedida(selecionado.chuva_acum_1h_mm, 'mm', 1)}</b></div>
            </div>
            <p>Última leitura informada: {formatarData(selecionado.timestamp)}</p>
            <p className="geo-coordinates">Lat. {selecionado.latitude.toFixed(4)} / Long. {selecionado.longitude.toFixed(4)}</p>
          </> : <>
            <Waves size={19}/><strong>Selecione um ponto no mapa</strong>
            <p>Clique em um marcador ou em um sensor da lista para visualizar suas leituras e localização.</p>
          </>}
        </div>
      </aside>
    </div>
    <div className="geo-disclaimer">
      <span><span className="geo-demo-light"/> CENÁRIO ACADÊMICO · Os pontos do painel e os valores de risco podem ser simulados.</span>
      <span>{camada === 'calor' ? 'Bolhas ilustrativas baseadas na chuva; não é heatmap validado.' : camada === 'abrigos' ? 'Pontos de apoio fictícios, sem rotas ou abrigos oficiais.' : 'Não constitui monitoramento público em tempo real.'}</span>
    </div>
  </article>
}

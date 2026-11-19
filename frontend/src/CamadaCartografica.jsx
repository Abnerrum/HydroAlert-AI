import { useEffect, useRef, useState } from 'react'
import { TileLayer, useMap } from 'react-leaflet'
import { maplibreGL } from '@maplibre/maplibre-gl-leaflet'
import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'

// O mapa básico é OpenFreeMap + MapLibre: tiles vetoriais sem chave de API.
// O fallback OSM evita tela em branco quando o navegador bloqueia WebGL ou CDN.
setWorkerUrl(workerUrl)

const ESTILOS = {
  ruas: 'https://tiles.openfreemap.org/styles/bright',
  claro: 'https://tiles.openfreemap.org/styles/liberty',
}

const IMAGENS_SATELITE =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const RUAS_RESERVA = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const CREDITOS_OSM = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'

export default function CamadaCartografica({ tipo = 'ruas' }) {
  const mapa = useMap()
  const [falha, setFalha] = useState(false)
  const [aviso, setAviso] = useState(false)
  const ultimoTipo = useRef(tipo)

  useEffect(() => {
    ultimoTipo.current = tipo
    setFalha(false)
    setAviso(false)
    if (tipo === 'satelite') return undefined

    let removido = false
    let camada = null
    let inicializado = false
    let observador = null

    const remover = () => {
      if (camada && mapa.hasLayer(camada)) {
        try { mapa.removeLayer(camada) } catch { /* camada já removida */ }
      }
    }
    const usarReserva = () => {
      if (removido || ultimoTipo.current !== tipo) return
      remover()
      setFalha(true)
      setAviso(true)
    }

    try {
      camada = maplibreGL({ style: ESTILOS[tipo] || ESTILOS.ruas, attribution: CREDITOS_OSM })
      camada.addTo(mapa)
      const gl = camada.getMaplibreMap?.()
      if (!gl) usarReserva()
      else {
        observador = (evento) => {
          const msg = String(evento?.error?.message || '')
          // Falhas de obtenção de tiles/fontes: não deixar mapa branco com "API KEY REQUIRED".
          if (/(\b401\b|\b403\b|\b429\b|access denied|failed to fetch|networkerror|unauthorized|forbidden|api.key)/i.test(msg)) {
            usarReserva()
          }
        }
        gl.on('error', observador)
        gl.once('load', () => { inicializado = true })
      }
    } catch {
      usarReserva()
    }

    // Navegadores sem WebGL ou com conexão lenta exibem o mapa OSM padrão.
    const temporizador = window.setTimeout(() => {
      if (!inicializado) usarReserva()
    }, 10000)

    return () => {
      removido = true
      window.clearTimeout(temporizador)
      const gl = camada?.getMaplibreMap?.()
      if (gl && observador) gl.off('error', observador)
      remover()
    }
  }, [mapa, tipo])

  if (tipo === 'satelite') return <TileLayer key="satellite-esri"
    url={IMAGENS_SATELITE}
    attribution='Tiles &copy; Esri, Maxar, Earthstar Geographics'
    maxZoom={19} />

  return <>
    {falha && <TileLayer key={'fallback-' + tipo} url={RUAS_RESERVA}
      attribution={CREDITOS_OSM} maxZoom={19} />}
    {aviso && <div className="geo-fallback-note" role="status">Mapa alternativo ativado. As ruas continuam disponíveis.</div>}
  </>
}

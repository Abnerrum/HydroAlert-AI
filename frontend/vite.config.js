import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isNetlify = process.env.NETLIFY === 'true'

function brazilMapViewPlugin() {
  const originalAdjust = `function Ajustar({pontos,busca}) {
  const map=useMap()
  useEffect(()=>{
    if(busca) map.setView([busca.lat,busca.lng],12)
    else if(!pontos.length) map.setView(BRASIL,4)
    else if(pontos.length===1) map.setView([pontos[0].latitude,pontos[0].longitude],12)
    else map.fitBounds(pontos.map(p=>[p.latitude,p.longitude]),{padding:[40,40]})
  },[map,pontos,busca])
  return null
}`

  const nationalAdjust = `function Ajustar({busca}) {
  const map=useMap()
  useEffect(()=>{
    if(busca) map.setView([busca.lat,busca.lng],12)
    else map.fitBounds(BRASIL_BOUNDS,{padding:[20,20]})
  },[map,busca])
  return null
}`

  return {
    name: 'hydroalert-brazil-map-view',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').endsWith('/src/App.jsx')) return null

      let updated = code.replace(
        'const BRASIL = [-14.235, -51.9253]',
        'const BRASIL = [-14.235, -51.9253]\\nconst BRASIL_BOUNDS = [[-33.75, -73.99], [5.27, -34.79]]',
      )
      updated = updated.replace(originalAdjust, nationalAdjust)
      updated = updated.replace('<Ajustar pontos={pontos} busca={busca}/>', '<Ajustar busca={busca}/>')

      return updated === code ? null : { code: updated, map: null }
    },
  }
}

export default defineConfig({
  plugins: [react(), brazilMapViewPlugin()],
  build: {
    outDir: isNetlify ? 'dist' : '../dashboard',
    emptyOutDir: true,
  },
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': process.env.VITE_API_PROXY || 'http://localhost:8000',
      '/health': process.env.VITE_API_PROXY || 'http://localhost:8000',
    },
  },
})

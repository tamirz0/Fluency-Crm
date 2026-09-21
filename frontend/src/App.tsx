import { useEffect, useState } from 'react'
import './App.css'

type Oportunidad = {
  id: number
  titulo: string
  empresaRazonSocial: string | null
  contactoNombre: string | null
  contactoApellido: string | null
  usuarioNombre: string
  usuarioApellido: string
  fechaEstimadaCierre: string | null
}

type Etapa = {
  idEtapa: number
  nombre: string
  orden: number
  oportunidades: Oportunidad[]
}

function App() {
  const [etapas, setEtapas] = useState<Etapa[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/Oportunidades/OportunidadesPorEtapa')
      .then((respuesta) => {
        if (!respuesta.ok) {
          throw new Error(`La API respondió con estado ${respuesta.status}`)
        }
        return respuesta.json() as Promise<Etapa[]>
      })
      .then(setEtapas)
      .catch((error: Error) => setError(error.message))
      .finally(() => setCargando(false))
  }, [])

  if (cargando) return <p className="mensaje">Cargando embudo…</p>
  if (error) return <p className="mensaje error">Error al cargar: {error}</p>

  return (
    <main className="pagina">
      <h1>Embudo de oportunidades</h1>

      <div className="embudo">
        {etapas.map((etapa) => (
          <section className="columna" key={etapa.idEtapa}>
            <h2>{etapa.nombre}</h2>
            <p className="contador">
              {etapa.oportunidades.length} oportunidades
            </p>

            {etapa.oportunidades.length === 0 ? (
              <p className="vacio">No hay oportunidades en esta etapa.</p>
            ) : (
              etapa.oportunidades.map((oportunidad) => (
                <article className="tarjeta" key={oportunidad.id}>
                  <h3>{oportunidad.titulo}</h3>
                  <p>
                    {oportunidad.empresaRazonSocial ??
                      [oportunidad.contactoNombre, oportunidad.contactoApellido]
                        .filter(Boolean)
                        .join(' ') ??
                      'Sin empresa ni contacto'}
                  </p>
                  <p className="detalle">
                    Responsable: {oportunidad.usuarioNombre}{' '}
                    {oportunidad.usuarioApellido}
                  </p>
                  {oportunidad.fechaEstimadaCierre && (
                    <p className="detalle">
                      Cierre estimado:{' '}
                      {new Date(
                        oportunidad.fechaEstimadaCierre,
                      ).toLocaleDateString()}
                    </p>
                  )}
                </article>
              ))
            )}
          </section>
        ))}
      </div>
    </main>
  )
}

export default App

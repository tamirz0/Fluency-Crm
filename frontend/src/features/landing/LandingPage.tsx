import { ExpandMore } from '@mui/icons-material'
import { Accordion, AccordionDetails, AccordionSummary, Alert, Button, Snackbar } from '@mui/material'
import { useState } from 'react'
import { Link as RouterLink, Navigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import './landing.css'

const features = [
  { id: '01', title: 'Clientes ordenados', text: 'Empresas y contactos en un solo lugar, con su responsable y el historial de relaciones. Cambiar a una persona de empresa no pierde lo que ya negociaste.' },
  { id: '02', title: 'Un embudo que se entiende', text: 'Cada oportunidad avanza por las etapas de su proceso. Ves de un vistazo qué está abierto, qué se ganó y qué se perdió, y por qué.' },
  { id: '03', title: 'Todo el equipo, sin pisarse', text: 'Cada vendedor trabaja su cartera; el equipo comercial ve el panorama completo. Los permisos los resuelve el sistema, no la memoria de cada uno.' },
]

const steps = [
  { title: 'Registrá la consulta', text: 'Desde la ficha de una empresa o un contacto creás la oportunidad en pocos clics: el sistema completa la etapa inicial, el responsable y el valor.' },
  { title: 'Avanzá por etapas', text: 'Movés la oportunidad por el embudo y cada cambio queda en su historial, con quién lo hizo y cuándo.' },
  { title: 'Cerrá con contexto', text: 'Al ganar o perder dejás el valor, la fecha y el motivo. Si hay que retomar la conversación, un superior puede reabrirla sin perder el cierre anterior.' },
]

const questions = [
  { q: '¿Quién puede usar Fluency CRM?', a: 'El equipo comercial de la academia: vendedores, responsables comerciales y administradores, cada uno con los permisos de su rol.' },
  { q: '¿Cómo obtengo una cuenta?', a: 'Las cuentas las crea un administrador. Si todavía no tenés una, pedísela a quien administra el sistema en tu academia.' },
  { q: '¿Se pueden ver las oportunidades de otros vendedores?', a: 'Sí, la consulta es compartida para que el equipo se coordine. Cada vendedor solo modifica las suyas y su tablero muestra su propia cartera.' },
  { q: '¿Qué pasa con los datos si una persona cambia de empresa?', a: 'Se conservan las oportunidades anteriores con la empresa con la que se negociaron. Solo cambia la asociación actual de la persona.' },
]

/** Maqueta decorativa del tablero: ilustra el producto sin datos reales. */
function BoardMock() {
  const columns = [
    { name: 'Consulta', tone: 1, cards: ['Estudio Ríos', 'Ana López'] },
    { name: 'Propuesta', tone: 2, cards: ['Colegio San Martín'] },
    { name: 'Matrícula', tone: 3, cards: ['Laura Pérez', 'Textil Norte · M. Gil'] },
  ]
  return <div className="landing-mock" aria-hidden="true">
    <div className="landing-mock-bar"><span /><span /><span /></div>
    <div className="landing-mock-board">
      {columns.map(column => <div className={`landing-mock-column landing-mock-column--${column.tone}`} key={column.name}>
        <p>{column.name}<span>{column.cards.length}</span></p>
        {column.cards.map(card => <div className="landing-mock-card" key={card}><strong>{card}</strong><i /><i /></div>)}
      </div>)}
    </div>
  </div>
}

export function LandingPage() {
  const { isAuthenticated } = useAuth()
  const [registerNotice, setRegisterNotice] = useState(false)
  if (isAuthenticated) return <Navigate to="/inicio" replace />
  const register = <Button variant="outlined" size="large" onClick={() => setRegisterNotice(true)}>Registrarse</Button>
  return <div className="landing">
    <header className="landing-nav">
      <a className="landing-brand" href="#inicio"><span aria-hidden="true">F</span>Fluency CRM</a>
      <nav aria-label="Secciones de la página"><a href="#funciones">Funciones</a><a href="#como-funciona">Cómo funciona</a><a href="#preguntas">Preguntas</a></nav>
      <div className="landing-nav-actions">
        <Button component={RouterLink} to="/login" color="inherit">Iniciar sesión</Button>
        <Button variant="contained" onClick={() => setRegisterNotice(true)}>Registrarse</Button>
      </div>
    </header>

    <main>
      <section className="landing-hero" id="inicio" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <p className="landing-tag">CRM para academias de inglés</p>
          <h1 id="landing-title">Cada consulta, a un paso de convertirse en alumno.</h1>
          <p className="landing-lead">Fluency CRM reúne a tus empresas, contactos y oportunidades en un embudo claro, para que tu equipo sepa siempre qué sigue y quién lo hace.</p>
          <div className="landing-cta">
            <Button component={RouterLink} to="/login" variant="contained" size="large">Iniciar sesión</Button>
            {register}
            <a className="landing-more" href="#funciones">Conocé más ↓</a>
          </div>
        </div>
        <BoardMock />
      </section>

      <section className="landing-strip" aria-label="Qué incluye"><ul><li>Empresas</li><li>Contactos</li><li>Oportunidades</li><li>Embudos por etapas</li><li>Historial de etapas</li><li>Roles y permisos</li></ul></section>

      <section className="landing-section" id="funciones" aria-labelledby="landing-features">
        <p className="landing-tag">Por qué Fluency CRM</p>
        <h2 id="landing-features">Menos planillas, más conversaciones.</h2>
        <div className="landing-features">
          {features.map(feature => <article key={feature.id}><span className="landing-number">{feature.id}</span><h3>{feature.title}</h3><p>{feature.text}</p></article>)}
        </div>
      </section>

      <section className="landing-section landing-section--alt" id="como-funciona" aria-labelledby="landing-steps">
        <p className="landing-tag">Cómo funciona</p>
        <h2 id="landing-steps">De la primera consulta al cierre, en tres pasos.</h2>
        <ol className="landing-steps">
          {steps.map(step => <li key={step.title}><h3>{step.title}</h3><p>{step.text}</p></li>)}
        </ol>
      </section>

      <section className="landing-section" id="preguntas" aria-labelledby="landing-faq">
        <p className="landing-tag">Preguntas frecuentes</p>
        <h2 id="landing-faq">Lo que suelen preguntar.</h2>
        <div className="landing-faq">
          {questions.map(item => <Accordion key={item.q} disableGutters square><AccordionSummary expandIcon={<ExpandMore />}><h3>{item.q}</h3></AccordionSummary><AccordionDetails>{item.a}</AccordionDetails></Accordion>)}
        </div>
      </section>

      <section className="landing-final" aria-labelledby="landing-final-title">
        <h2 id="landing-final-title">Ordená tu seguimiento comercial hoy.</h2>
        <p>Ingresá con tu cuenta y retomá donde dejaste.</p>
        <div className="landing-cta landing-cta--center"><Button component={RouterLink} to="/login" variant="contained" size="large">Iniciar sesión</Button>{register}</div>
      </section>
    </main>

    <footer className="landing-footer"><span>Fluency CRM</span><span>Proyecto académico · Gestión de academia de inglés</span></footer>

    <Snackbar open={registerNotice} autoHideDuration={7000} onClose={() => setRegisterNotice(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
      <Alert severity="info" onClose={() => setRegisterNotice(false)}>El registro todavía no está habilitado. Las cuentas las crea un administrador.</Alert>
    </Snackbar>
  </div>
}

import { ArrowForward, CalendarMonthOutlined, SchoolOutlined, ViewKanbanOutlined } from '@mui/icons-material'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import './landing.css'

// Conserva el correo de ejemplo del proyecto cuando el build no tiene uno configurado.
const contactEmail = import.meta.env.VITE_CONTACT_EMAIL || 'contacto@fluency.example'
const contactHref = `mailto:${contactEmail}?subject=${encodeURIComponent('Quiero conocer Fluency CRM')}`
const navLinks = [['Plataforma', '#plataforma'], ['Funcionalidades', '#modulos'], ['Preguntas', '#preguntas']] as const

const stages = [
  { name: 'Consulta recibida', title: 'Inglés para atención al cliente', client: 'Estudio Norte', owner: 'Sofía Díaz', amount: 180000 },
  { name: 'Necesidad relevada', title: 'Curso grupal de inglés B1', client: 'Marina Costa', owner: 'Julián Ruiz', amount: 240000 },
  { name: 'Presupuesto enviado', title: 'Capacitación de inglés para equipos', client: 'Editorial Río', owner: 'Sofía Díaz', amount: 360000 },
]
const ars = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
const features = [
  { icon: ViewKanbanOutlined, label: 'CRM comercial', title: 'Seguí cada oportunidad', description: 'Registrá empresas y contactos, asigná responsables y mové oportunidades por etapas. Consultá las actividades y el historial desde cada ficha.' },
  { icon: SchoolOutlined, label: 'Alumnos y cursos', title: 'Organizá los cursos por nivel', description: 'Gestioná alumnos de A1 a C2, asignales un curso y coordiná los grupos con los profesores de cada nivel.' },
  { icon: CalendarMonthOutlined, label: 'Clases y talleres', title: 'Llevá el día a día del aula', description: 'Programá clases y talleres, registrá la asistencia a clases y cargá las notas de los exámenes.' },
]
const faqs = [
  ['¿Qué tipos de usuario existen?', 'Administrador, Responsable comercial, Vendedor y Profesor. Los permisos determinan qué puede consultar y gestionar cada perfil.'],
  ['¿Cómo paso de una oportunidad a un alumno?', 'Al ganar una oportunidad de un servicio de clases asociada a un contacto, Fluency lo registra como alumno del nivel del servicio si todavía no lo era. Después podés asignarle un curso.'],
  ['¿Cómo se configura la plataforma?', 'Un administrador crea las cuentas y configura los servicios, embudos y etapas. Después el equipo comercial puede registrar clientes y oportunidades.'],
] as const

function Brand() {
  return <a className="landing-brand" href="#inicio"><span aria-hidden="true">F</span>Fluency</a>
}

function ProductMockup() {
  return <figure className="landing-preview" id="plataforma" aria-labelledby="landing-preview-title landing-preview-example">
    <figcaption>
      <span className="landing-window-dots" aria-hidden="true"><i /><i /><i /></span>
      <span id="landing-preview-title">Embudo comercial</span>
      <span id="landing-preview-example" className="landing-example">Vista de ejemplo</span>
    </figcaption>
    <div className="landing-preview-summary">
      <span>Embudo <strong>Inglés</strong></span>
      <span><strong>{stages.length}</strong> oportunidades abiertas</span>
      <span>Total <strong>{ars.format(stages.reduce((total, stage) => total + stage.amount, 0))} ARS</strong></span>
    </div>
    <ol className="landing-stages">
      {stages.map(stage => <li key={stage.name} className="landing-stage">
        <div className="landing-stage-heading"><span>{stage.name}</span><span>1</span></div>
        <div className="landing-opportunity">
          <strong>{stage.title}</strong>
          <p>{stage.client}</p>
          <div><span>{stage.owner}</span><span>{ars.format(stage.amount)}</span></div>
        </div>
      </li>)}
    </ol>
  </figure>
}

export function LandingPage() {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) return <Navigate to="/inicio" replace />

  return <div className="fluency-landing">
    <div className="landing-shell" id="inicio">
      <header className="landing-header">
        <div className="landing-header-inner">
          <Brand />
          <nav aria-label="Secciones">{navLinks.map(([label, href]) => <a href={href} key={href}>{label}</a>)}</nav>
          <div className="landing-header-actions">
            <Link to="/login">Ingresar</Link>
            <a className="landing-button" href={contactHref}>Contacto <ArrowForward /></a>
          </div>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero" aria-labelledby="landing-title">
          <h1 id="landing-title">El CRM para academias de inglés</h1>
          <p>Gestioná oportunidades, alumnos y clases desde el primer contacto hasta el aula.</p>
          <a className="landing-button" href={contactHref}>Solicitar una demo <ArrowForward /></a>
        </section>

        <ProductMockup />

        <section id="modulos" className="landing-features" aria-label="Funcionalidades">
          {features.map(({ icon: Icon, label, title, description }) => <article key={label} className="landing-feature">
            <Icon className="landing-feature-icon" aria-hidden="true" />
            <div><h2>{title}</h2><p>{description}</p></div>
            <span className="landing-feature-label">{label}</span>
          </article>)}
        </section>

        <section id="preguntas" className="landing-faq" aria-labelledby="landing-faq-title">
          <h2 id="landing-faq-title">Preguntas frecuentes</h2>
          {faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}
        </section>

        <section className="landing-contact" aria-labelledby="landing-contact-title">
          <h2 id="landing-contact-title">Conocé Fluency en una demo</h2>
          <p>Escribinos para coordinar una demostración del embudo comercial y de la gestión de clases.</p>
          <a className="landing-button" href={contactHref}>Solicitar una demo <ArrowForward /></a>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <Brand />
          <nav aria-label="Secciones del pie de página">{navLinks.map(([label, href]) => <a href={href} key={href}>{label}</a>)}</nav>
          <span>Oh My GADS</span>
        </div>
      </footer>
    </div>
  </div>
}

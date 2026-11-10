import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Chip, Link, Stack, Typography } from '@mui/material'
import type { SxProps, Theme } from '@mui/material'
import { AutoStories, Business, CalendarMonth, ExpandMore, Groups, History, MenuBook, School, ViewKanban } from '@mui/icons-material'
import type { ReactNode } from 'react'
import { Link as RouterLink, Navigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'

// Correo de contacto configurable en el build; el valor por defecto es ficticio y debe reemplazarse antes de publicar.
const contactEmail = import.meta.env.VITE_CONTACT_EMAIL || 'contacto@fluency.example'
const contactHref = `mailto:${contactEmail}?subject=${encodeURIComponent('Quiero conocer Fluency CRM')}`
const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const navLinks = [['Problema', '#problema'], ['Cómo funciona', '#como-funciona'], ['Módulos', '#modulos'], ['Preguntas', '#preguntas']] as const

const pains = [
  ['Información descentralizada', 'Contactos en una planilla, alumnos en otra y horarios en el chat: nadie tiene la foto completa de la academia.'],
  ['Alumnos y grupos sin control', 'Saber quién cursa qué nivel, en qué grupo y cuánto asiste lleva horas de revisar archivos sueltos.'],
  ['Un desorden que cuesta', 'Sin un seguimiento claro, las consultas se enfrían y los alumnos que podrías haber sumado se pierden.'],
  ['Herramientas difíciles de usar', 'Los sistemas genéricos tienen demasiadas opciones y no hablan el idioma de una academia.'],
] as const
const steps = [
  ['Captá', 'Registrá empresas y personas interesadas y quién de tu equipo las atiende.'],
  ['Seguí', 'Mové cada oportunidad por el embudo del servicio, con actividades e historial a la vista.'],
  ['Convertí', 'Al ganar la venta de un servicio de clases, la persona pasa a ser alumno del nivel de ese servicio.'],
  ['Organizá', 'Armá cursos, programá clases y talleres y llevá la asistencia y las notas.'],
] as const
const modules: [string, string, ReactNode][] = [
  ['Clientes', 'Empresas y personas con su responsable y su historia.', <Business key="b" />],
  ['Embudos de venta', 'Un embudo por servicio, con etapas y vista de tablero.', <ViewKanban key="v" />],
  ['Actividades e historial', 'Llamadas, reuniones y mensajes en una cronología única.', <History key="h" />],
  ['Alumnos', 'Quiénes cursan, de qué nivel y en qué curso están.', <School key="s" />],
  ['Cursos', 'Grupos por nivel, a cargo de un profesor.', <MenuBook key="m" />],
  ['Clases y asistencia', 'Calendario de clases, presentes, ausentes y exámenes con nota.', <CalendarMonth key="c" />],
  ['Talleres', 'Encuentros de fecha única con la lista de anotados.', <AutoStories key="a" />],
  ['Profesores', 'Cada profesor con sus niveles, cursos y clases.', <Groups key="g" />],
]
const benefits = [
  ['Todo en un mismo lugar', 'De la primera consulta a la última clase: el equipo comercial y los profesores trabajan sobre la misma información, cada uno con lo que le corresponde ver.'],
  ['Fácil de usar desde el primer día', 'Pocas pantallas, pensadas para una academia de inglés: niveles de A1 a C2, cursos, clases y talleres. Sin configuraciones interminables.'],
  ['Estadísticas que crecen con tu academia', 'El inicio muestra tus alumnos, las oportunidades abiertas y las cerradas del mes, siempre calculadas con tus datos reales.'],
] as const
const faqs = [
  ['¿Cómo es el modelo de contratación?', 'Fluency se ofrece por suscripción, con un período de prueba para que tu equipo lo conozca antes de decidir. Escribinos desde Contacto y coordinamos los detalles.'],
  ['¿Qué tipos de usuario existen?', 'Administrador, Responsable comercial, Vendedor y Profesor. Cada uno ve solo lo suyo: los profesores trabajan con alumnos, cursos y clases, y no acceden a la parte comercial.'],
  ['¿Un profesor puede dar clases de cualquier nivel?', 'No. Cada profesor marca los niveles con los que trabaja y solo puede abrir cursos de esos niveles.'],
  ['¿Cómo empiezo a usarlo?', 'Una persona administradora crea las cuentas, configura los servicios y los embudos, y el equipo empieza a cargar contactos. Te acompañamos en el primer uso.'],
  ['¿Y si necesito ayuda?', 'Escribinos desde el botón Contacto y respondemos por correo.'],
] as const

const container: SxProps<Theme> = { width: '100%', maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 4 } }
const sectionSx: SxProps<Theme> = { py: { xs: 7, md: 11 }, scrollMarginTop: 72 }
const card: SxProps<Theme> = { p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }

function Eyebrow({ children }: { children: ReactNode }) {
  return <Typography sx={{ color: 'primary.light', fontSize: 15, fontWeight: 650, mb: 1.5 }}> {children}</Typography>
}
function SectionTitle({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return <Box sx={{ maxWidth: 720, mb: { xs: 4, md: 6 } }}><Eyebrow>{eyebrow}</Eyebrow><Typography component="h2" sx={{ fontSize: { xs: 28, md: 38 }, fontWeight: 750, lineHeight: 1.15, letterSpacing: '-.02em' }}>{title}</Typography>{subtitle && <Typography sx={{ mt: 2, color: 'text.secondary', fontSize: 18 }}>{subtitle}</Typography>}</Box>
}

/** Maqueta del producto armada con componentes; solo usa rótulos genéricos, nunca datos reales. */
function ProductMockup() {
  const column = (name: string, cards: string[]) => <Box sx={{ flex: 1, minWidth: 0, p: 1, borderRadius: 1.5, bgcolor: 'var(--canvas)' }}>
    <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', mb: 1 }}>{name}</Typography>
    <Stack spacing={1}>{cards.map((text) => <Box key={text} sx={{ p: 1, borderRadius: 1, bgcolor: 'var(--field)', fontSize: 12, borderLeft: '3px solid var(--accent)' }}>{text}</Box>)}</Stack>
  </Box>
  return <Box aria-hidden="true" sx={{ width: '100%', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3, bgcolor: 'background.paper', boxShadow: '0 24px 60px rgba(0,0,0,.45)' }}>
    <Stack direction="row" spacing={.75} sx={{ mb: 2 }}>{[0, 1, 2].map((i) => <Box key={i} sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: 'divider' }} />)}</Stack>
    <Stack direction="row" spacing={1.5}>{column('Consulta', ['Inglés B1 · Grupal', 'Inglés A2 · 1 a 1'])}{column('Reunión', ['Inglés B2 · In-company'])}{column('Ganada', ['Inglés C1 · Grupal'])}</Stack>
    <Box sx={{ mt: 2, p: 1.5, borderRadius: 1.5, bgcolor: 'var(--canvas)' }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}><Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary' }}>Asistencia de un alumno</Typography><Typography sx={{ fontSize: 22, fontWeight: 750, color: 'primary.light' }}>13/33</Typography></Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: .75, mt: 1 }}>{['L', 'M', 'M', 'J', 'V'].map((d, i) => <Box key={i} sx={{ p: .75, borderRadius: 1, bgcolor: 'var(--field)', textAlign: 'center', fontSize: 11, color: i % 2 ? 'text.secondary' : 'primary.light' }}>{d}<Box sx={{ mt: .5, height: 4, borderRadius: 2, bgcolor: i % 2 ? 'divider' : 'primary.light' }} /></Box>)}</Box>
    </Box>
  </Box>
}

export function LandingPage() {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) return <Navigate to="/inicio" replace />
  return <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary', overflowX: 'clip' }}>
    <Box component="header" sx={{ position: 'sticky', top: 0, zIndex: 10, bgcolor: 'rgba(21,22,25,.93)', backdropFilter: 'blur(10px)', borderBottom: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ ...container, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, minHeight: 64 }}>
        <Stack component="a" href="#inicio" direction="row" spacing={1} sx={{ alignItems: 'center', color: 'inherit', textDecoration: 'none' }}><School sx={{ color: 'primary.light' }} /><Typography sx={{ fontSize: 21, fontWeight: 750, letterSpacing: '-.02em' }}>Fluency</Typography></Stack>
        <Stack component="nav" aria-label="Secciones" direction="row" spacing={3} sx={{ display: { xs: 'none', md: 'flex' } }}>{navLinks.map(([label, href]) => <Link key={href} href={href} underline="none" sx={{ color: 'text.secondary', fontWeight: 600, '&:hover': { color: 'text.primary' } }}>{label}</Link>)}</Stack>
        <Stack direction="row" spacing={1}>
          <Button component="a" href={contactHref} variant="outlined" size="small" sx={{ minHeight: 40 }}>Contacto</Button>
          <Button component={RouterLink} to="/login" variant="contained" size="small" sx={{ minHeight: 40 }}>Ingresar</Button>
        </Stack>
      </Box>
    </Box>

    <Box component="main">
      <Box id="inicio" sx={{ ...sectionSx, pt: { xs: 6, md: 10 }, background: 'radial-gradient(circle at 80% 10%, rgba(69,117,178,.16), transparent 45%)' }}>
        <Box sx={{ ...container, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.05fr .95fr' }, gap: { xs: 5, md: 8 }, alignItems: 'center' }}>
          <Box>
            <Eyebrow>Gestión para academias de inglés</Eyebrow>
            <Typography component="h1" sx={{ fontSize: { xs: 36, md: 64 }, fontWeight: 760, lineHeight: 1.02, letterSpacing: '-.045em' }}>Gestioná tu academia de inglés desde <Box component="span" sx={{ color: 'primary.light' }}>un solo lugar</Box></Typography>
            <Typography sx={{ mt: 3, fontSize: { xs: 17, md: 20 }, color: 'text.secondary', maxWidth: 560 }}>Pasá de la desorganización y la información dispersa a una gestión clara: desde la primera consulta hasta la asistencia de cada alumno.</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4 }}>
              <Button component="a" href="#como-funciona" variant="contained" size="large">Conocé más</Button>
              <Button component="a" href={contactHref} variant="outlined" size="large">Agendá una reunión</Button>
            </Stack>
          </Box>
          <ProductMockup />
        </Box>
      </Box>

      <Box sx={{ borderTop: '1px solid', borderBottom: '1px solid', borderColor: 'divider', py: 4, bgcolor: 'background.paper' }}>
        <Box sx={{ ...container, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <Typography sx={{ color: 'text.secondary', fontWeight: 600, textAlign: 'center' }}>Pensado para academias: cada servicio, un nivel de inglés</Typography>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', justifyContent: 'center' }}>{levels.map((l) => <Chip key={l} label={l} variant="outlined" sx={{ fontWeight: 700, color: 'primary.light' }} />)}</Stack>
        </Box>
      </Box>

      <Box id="problema" sx={sectionSx}><Box sx={container}>
        <SectionTitle eyebrow="El problema" title="Gestionar una academia con planillas y chats sale caro" subtitle="Cuando la información está repartida, cada alumno nuevo y cada clase suman trabajo manual y errores." />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2.5 }}>{pains.map(([title, text]) => <Box key={title} sx={{ borderTop: '1px solid', borderColor: 'divider', py: 2 }}><Typography component="h3" sx={{ fontSize: 19, fontWeight: 700, mb: 1 }}>{title}</Typography><Typography sx={{ color: 'text.secondary' }}>{text}</Typography></Box>)}</Box>
      </Box></Box>

      <Box id="como-funciona" sx={{ ...sectionSx, bgcolor: 'background.paper' }}><Box sx={container}>
        <SectionTitle eyebrow="Cómo funciona" title="De la consulta al aula, en cuatro pasos" />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2.5 }}>{steps.map(([title, text], i) => <Box key={title} sx={{ borderTop: '2px solid', borderColor: 'primary.main', py: 2 }}><Typography sx={{ color: 'primary.light', fontSize: 40, fontWeight: 800, lineHeight: 1 }}>{String(i + 1).padStart(2, '0')}</Typography><Typography component="h3" sx={{ fontSize: 21, fontWeight: 700, my: 1 }}>{title}</Typography><Typography sx={{ color: 'text.secondary' }}>{text}</Typography></Box>)}</Box>
      </Box></Box>

      <Box id="modulos" sx={sectionSx}><Box sx={container}>
        <SectionTitle eyebrow="Módulos" title="Todo lo que una academia necesita" />
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mb: 4 }} aria-label="Ir a un módulo">{modules.map(([name]) => <Chip key={name} label={name} component="a" href={`#modulo-${name}`} clickable variant="outlined" />)}</Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2.5 }}>{modules.map(([name, text, icon]) => <Box key={name} id={`modulo-${name}`} sx={{ ...card, scrollMarginTop: 88 }}><Box sx={{ color: 'primary.light', mb: 1.5, display: 'flex' }}>{icon}</Box><Typography component="h3" sx={{ fontSize: 19, fontWeight: 700, mb: .5 }}>{name}</Typography><Typography sx={{ color: 'text.secondary' }}>{text}</Typography></Box>)}</Box>
      </Box></Box>

      <Box sx={{ ...sectionSx, bgcolor: 'background.paper' }}><Box sx={container}>
        <SectionTitle eyebrow="Por qué Fluency" title="Menos desorden, más tiempo para enseñar" />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          {benefits.map(([title, text]) => <Box key={title} sx={{ py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography component="h3" sx={{ fontSize: 24, fontWeight: 750, mb: 1 }}>{title}</Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: 18 }}>{text}</Typography>
          </Box>)}
        </Box>
      </Box></Box>

      <Box id="preguntas" sx={sectionSx}><Box sx={{ ...container, maxWidth: 860 }}>
        <SectionTitle eyebrow="Preguntas frecuentes" title="Antes de empezar" />
        {faqs.map(([q, a]) => <Accordion key={q} disableGutters sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', '&:not(:last-child)': { mb: 1.5 }, '&::before': { display: 'none' }, borderRadius: '8px !important' }}><AccordionSummary expandIcon={<ExpandMore />}><Typography component="h3" sx={{ fontWeight: 700 }}>{q}</Typography></AccordionSummary><AccordionDetails><Typography sx={{ color: 'text.secondary' }}>{a}</Typography></AccordionDetails></Accordion>)}
      </Box></Box>

      <Box id="contacto" sx={{ pb: { xs: 7, md: 11 } }}><Box sx={container}>
        <Box sx={{ p: { xs: 4, md: 7 }, textAlign: 'center', borderRadius: 4, border: '1px solid', borderColor: 'primary.light', background: 'linear-gradient(135deg, rgba(69,117,178,.16), rgba(32,34,38,.8))' }}>
          <Typography component="h2" sx={{ fontSize: { xs: 28, md: 38 }, fontWeight: 800, letterSpacing: '-.02em' }}>Agendá una reunión y conocé Fluency</Typography>
          <Typography sx={{ mt: 2, mb: 4, color: 'text.secondary', fontSize: 18, maxWidth: 560, mx: 'auto' }}>Te mostramos una demo con el día a día de una academia y respondemos tus dudas.</Typography>
          <Button component="a" href={contactHref} variant="contained" size="large">Escribinos</Button>
        </Box>
      </Box></Box>
    </Box>

    <Box component="footer" sx={{ borderTop: '1px solid', borderColor: 'divider', py: 4 }}>
      <Box sx={{ ...container, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: 'center', gap: 1.5 }}>
        <Typography sx={{ fontWeight: 700 }}>Fluency CRM · Oh My GADS</Typography>
        <Link href={contactHref} underline="hover" sx={{ color: 'text.secondary' }}>{contactEmail}</Link>
      </Box>
    </Box>
  </Box>
}

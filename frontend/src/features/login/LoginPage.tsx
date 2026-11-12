import { useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowForward, LockOutlined, PersonOutlined, Visibility, VisibilityOff, WifiOff } from '@mui/icons-material'
import { Alert, Box, Button, CircularProgress, IconButton, InputAdornment, TextField } from '@mui/material'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { ApiRequestError } from '../../api/client'
import unlamLogo from '../../assets/unlam.png'
import { useAuth } from '../../auth/useAuth'
import '../../App.css'

const loginSchema = z.object({ username: z.string().trim().min(1, 'Ingresá tu usuario.'), password: z.string().min(1, 'Ingresá tu contraseña.') })
type LoginFormValues = z.input<typeof loginSchema>
type LocationState = { from?: { pathname?: string; search?: string; hash?: string } }
function destinationFrom(state: unknown) { const from = (state as LocationState | null)?.from; return from?.pathname?.startsWith('/') ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}` : '/inicio' }

export function LoginPage() {
  const { isAuthenticated, isLoading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [apiError, setApiError] = useState<'credentials' | 'connection' | null>(null)
  const submissionRef = useRef(false)
  const { register, handleSubmit, resetField, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema), defaultValues: { username: '', password: '' } })
  if (isAuthenticated) return <Navigate to="/inicio" replace />
  const onSubmit = async (values: LoginFormValues) => {
    if (submissionRef.current || isLoading) return
    submissionRef.current = true
    setApiError(null)
    try { await login({ username: values.username.trim(), password: values.password }); navigate(destinationFrom(location.state), { replace: true }) }
    catch (error) { resetField('password'); setApiError(error instanceof ApiRequestError && error.status === 401 ? 'credentials' : 'connection') }
    finally { submissionRef.current = false }
  }
  const usernameField = register('username')
  const passwordField = register('password')
  return <main className="login-page">
    <section className="login-brand" aria-label="Fluency CRM">
      <div className="login-wordmark">
        <img src={unlamLogo} alt="UNLaM" width={40} height={40} />
        <div><strong>Fluency</strong><span>Academia y CRM Educativo</span></div>
      </div>
      <div className="login-brand-copy">
        <p className="login-headline">Las buenas oportunidades empiezan con una <span>conversación.</span></p>
        <p>Seguí cada consulta hasta convertirla en alumno y organizá cursos, clases y asistencia desde un solo lugar.</p>
      </div>
    </section>
    <section className="login-content" aria-labelledby="login-heading"><div className="login-form-wrap">
      <header><h1 id="login-heading">Ingresá a tu cuenta</h1><p>Accedé a tu panel comercial y académico en Fluency.</p></header>
      {apiError && !isLoading && (apiError === 'credentials'
        ? <Alert className="login-alert" severity="error">Usuario o contraseña incorrectos.</Alert>
        : <Alert className="login-alert" severity="warning" icon={<WifiOff fontSize="small" />}>No pudimos conectar con el servidor. Verificá que esté en ejecución e intentá de nuevo.</Alert>)}
      {/* The ref guards two submit events delivered in the same render before React updates isSubmitting. */}
      {/* oxlint-disable-next-line react/refs */}
      <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label htmlFor="login-username">Usuario</label>
          <TextField {...usernameField} id="login-username" autoComplete="username" disabled={isSubmitting || isLoading} error={Boolean(errors.username)} fullWidth helperText={errors.username?.message} placeholder="Tu nombre de usuario"
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><PersonOutlined fontSize="small" /></InputAdornment> } }} />
        </div>
        <div>
          <label htmlFor="login-password">Contraseña</label>
          <TextField {...passwordField} id="login-password" autoComplete="current-password" disabled={isSubmitting || isLoading} error={Boolean(errors.password)} fullWidth helperText={errors.password?.message} placeholder="••••••••••••" type={showPassword ? 'text' : 'password'}
            slotProps={{ input: {
              startAdornment: <InputAdornment position="start"><LockOutlined fontSize="small" /></InputAdornment>,
              endAdornment: <InputAdornment position="end"><IconButton type="button" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} edge="end" onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</IconButton></InputAdornment>,
            } }} />
        </div>
        <Button className="login-submit" disabled={isSubmitting || isLoading} fullWidth type="submit" variant="contained" endIcon={isSubmitting ? undefined : <ArrowForward />}>
          {isSubmitting ? <CircularProgress aria-label="Ingresando" color="inherit" size={22} /> : 'Ingresar a Fluency'}
        </Button>
      </Box>
      <footer>¿Problemas para ingresar? Contactá al administrador.</footer>
    </div></section>
  </main>
}

import { useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import { Box, Button, CircularProgress, IconButton, InputAdornment, TextField } from '@mui/material'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { ApiRequestError } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import '../../App.css'

const loginSchema = z.object({ username: z.string().trim().min(1, 'Ingresá tu usuario.'), password: z.string().min(1, 'Ingresá tu contraseña.') })
type LoginFormValues = z.input<typeof loginSchema>
type LocationState = { from?: { pathname?: string; search?: string; hash?: string } }
function destinationFrom(state: unknown) { const from = (state as LocationState | null)?.from; return from?.pathname?.startsWith('/') ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}` : '/inicio' }

export function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [apiError, setApiError] = useState('')
  const submissionRef = useRef(false)
  const { register, handleSubmit, resetField, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema), defaultValues: { username: '', password: '' } })
  if (isAuthenticated) return <Navigate to="/inicio" replace />
  const onSubmit = async (values: LoginFormValues) => {
    if (submissionRef.current) return
    submissionRef.current = true
    setApiError('')
    try { await login({ username: values.username.trim(), password: values.password }); navigate(destinationFrom(location.state), { replace: true }) }
    catch (error) { resetField('password'); setApiError(error instanceof ApiRequestError && error.status === 401 ? 'Usuario o contraseña incorrectos.' : 'No pudimos conectar con la API. Verificá que esté en ejecución e intentá de nuevo.') }
    finally { submissionRef.current = false }
  }
  const usernameField = register('username')
  const passwordField = register('password')
  return <main className="login-page">
    <section className="login-brand" aria-label="Fluency CRM"><p className="brand-name">Fluency CRM</p><div className="brand-copy"><h1>Las buenas oportunidades empiezan con una conversación.</h1><p>Reuní los vínculos comerciales de tu equipo para dar el siguiente paso con claridad.</p><div className="conversation-path" aria-hidden="true"><span /><span /><span /><span /><span /></div></div></section>
    <section className="login-content" aria-labelledby="login-heading"><div className="login-form-wrap"><h2 id="login-heading">Ingresá a tu espacio comercial</h2><p>Usá tus credenciales para continuar.</p>{apiError && <div className="form-error" role="alert">{apiError}</div>}
      {/* The ref guards two submit events delivered in the same render before React updates isSubmitting. */}
      {/* oxlint-disable-next-line react/refs */}
      <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
        <TextField {...usernameField} autoComplete="username" disabled={isSubmitting} error={Boolean(errors.username)} fullWidth helperText={errors.username?.message} label="Usuario" margin="normal" />
        <TextField {...passwordField} autoComplete="current-password" disabled={isSubmitting} error={Boolean(errors.password)} fullWidth helperText={errors.password?.message} label="Contraseña" margin="normal" type={showPassword ? 'text' : 'password'} slotProps={{ input: { endAdornment: <InputAdornment position="end"><IconButton aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} edge="end" onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> } }} />
        <Button disabled={isSubmitting} fullWidth sx={{ mt: 2.5 }} type="submit" variant="contained">{isSubmitting ? <CircularProgress aria-label="Ingresando" color="inherit" size={22} /> : 'Ingresar'}</Button>
      </Box>
    </div></section>
  </main>
}

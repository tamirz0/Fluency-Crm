import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { esES } from '@mui/x-date-pickers/locales'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import 'dayjs/locale/es'

// Los valores replican las variables de index.css (:root); cambiar la paleta en ambos lugares.
const palette = { bg: '#0A0F14', surface: '#111A23', surface2: '#162230', border: '#243342', borderStrong: '#35485B', text: '#EAF0F4', muted: '#9DB0BF', accent: '#4FD1C5', accentStrong: '#7FE3D9' }
export const theme = createTheme({
  palette: { mode: 'dark', primary: { main: palette.accent, contrastText: '#06201D' }, secondary: { main: palette.accentStrong, contrastText: '#06201D' }, error: { main: '#FF9B92' }, warning: { main: '#F0C674' }, background: { default: palette.bg, paper: palette.surface }, text: { primary: palette.text, secondary: palette.muted }, divider: palette.border },
  typography: { fontFamily: "'Source Sans 3 Variable', 'Source Sans 3', sans-serif", button: { fontWeight: 650, textTransform: 'none' } },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { minHeight: 44, borderRadius: 10, paddingInline: 18, transition: 'background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease' }, contained: { '&.MuiButton-colorPrimary:hover': { backgroundColor: palette.accentStrong } }, outlined: { borderColor: palette.borderStrong, '&:hover': { borderColor: palette.accent, backgroundColor: 'rgba(79, 209, 197, .08)' } } } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 10, backgroundColor: '#0E161E', transition: 'box-shadow 140ms ease', '& .MuiOutlinedInput-notchedOutline': { borderColor: palette.border }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: palette.borderStrong }, '&.Mui-focused': { boxShadow: '0 0 0 3px rgba(79, 209, 197, .18)' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: palette.accent, borderWidth: 1.5 } } } },
    MuiInputLabel: { styleOverrides: { root: { color: palette.muted, '&.Mui-focused': { color: palette.accentStrong } } } },
    MuiFormHelperText: { styleOverrides: { root: { color: palette.muted, '&.Mui-error': { color: '#FF9B92' } } } },
    MuiAlert: { styleOverrides: { root: { borderRadius: 12, '&.MuiAlert-standardError': { color: '#FFD8D3', backgroundColor: '#3A1D20' }, '&.MuiAlert-standardWarning': { color: '#F3DDA8', backgroundColor: '#382D17' } } } },
    MuiTableCell: { styleOverrides: { root: { borderColor: palette.border }, head: { color: palette.muted } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 16, border: `1px solid ${palette.border}`, backgroundColor: palette.surface } } },
    MuiMenu: { styleOverrides: { paper: { borderRadius: 12, border: `1px solid ${palette.border}`, backgroundColor: palette.surface2 } } },
    MuiPopover: { styleOverrides: { paper: { borderRadius: 12, border: `1px solid ${palette.border}`, backgroundColor: palette.surface2 } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 650 } } },
  },
})

export function AppProviders({ children, queryClient }: { children: ReactNode; queryClient: QueryClient }) {
  return <QueryClientProvider client={queryClient}><ThemeProvider theme={theme}><CssBaseline /><LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es" localeText={esES.components.MuiLocalizationProvider.defaultProps.localeText}>{children}</LocalizationProvider></ThemeProvider></QueryClientProvider>
}

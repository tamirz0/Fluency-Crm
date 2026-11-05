import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { esES } from '@mui/x-date-pickers/locales'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import 'dayjs/locale/es'

export const theme = createTheme({
  palette: { mode: 'dark', primary: { main: '#62BDB5', contrastText: '#0B1118' }, secondary: { main: '#9CCDC8', contrastText: '#0B1118' }, error: { main: '#FFB4AB' }, warning: { main: '#E8C578' }, background: { default: '#0B1118', paper: '#162631' }, text: { primary: '#E7EFF1', secondary: '#B7C6CB' }, divider: '#344A55' },
  typography: { fontFamily: "'Source Sans 3 Variable', 'Source Sans 3', sans-serif", button: { fontWeight: 650, textTransform: 'none' } },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: { styleOverrides: { root: { minHeight: 44, borderRadius: 6 } } },
    MuiOutlinedInput: { styleOverrides: { root: { backgroundColor: '#13232D', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#344A55' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#62BDB5' }, '&.Mui-focused': { boxShadow: '0 0 0 3px rgba(98, 189, 181, .2)' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#8ADBD3', borderWidth: 2 } } } },
    MuiInputLabel: { styleOverrides: { root: { color: '#B7C6CB', '&.Mui-focused': { color: '#9CCDC8' } } } },
    MuiFormHelperText: { styleOverrides: { root: { color: '#B7C6CB', '&.Mui-error': { color: '#FFB4AB' } } } },
    MuiAlert: { styleOverrides: { root: { '&.MuiAlert-standardError': { color: '#FFD8D3', backgroundColor: '#3A1D20' }, '&.MuiAlert-standardWarning': { color: '#F3DDA8', backgroundColor: '#382D17' } } } },
    MuiTableCell: { styleOverrides: { root: { borderColor: '#344A55' }, head: { color: '#B7C6CB' } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
  },
})

export function AppProviders({ children, queryClient }: { children: ReactNode; queryClient: QueryClient }) {
  return <QueryClientProvider client={queryClient}><ThemeProvider theme={theme}><CssBaseline /><LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es" localeText={esES.components.MuiLocalizationProvider.defaultProps.localeText}>{children}</LocalizationProvider></ThemeProvider></QueryClientProvider>
}

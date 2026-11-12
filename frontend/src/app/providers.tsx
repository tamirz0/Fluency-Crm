import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { esES } from '@mui/x-date-pickers/locales'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import 'dayjs/locale/es'

export const theme = createTheme({
  palette: { mode: 'dark', primary: { main: '#4575B2', light: '#A5C6F2', dark: '#396599', contrastText: '#FFFFFF' }, secondary: { main: '#A5C6F2', contrastText: '#151619' }, error: { main: '#FFB4AB' }, warning: { main: '#E8C578' }, background: { default: '#151619', paper: '#202226' }, text: { primary: '#F0F1F4', secondary: '#B8BEC9' }, divider: '#353941' },
  typography: { fontFamily: "'Source Sans 3 Variable', 'Source Sans 3', sans-serif", button: { fontWeight: 650, textTransform: 'none' } },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: { styleOverrides: { root: { minHeight: 44, borderRadius: 6, '&.MuiButton-colorPrimary': { '--variant-textColor': '#A5C6F2', '--variant-outlinedColor': '#A5C6F2', '--variant-outlinedBorder': '#717885', '&:hover': { '--variant-outlinedBorder': '#A5C6F2' } }, '&.Mui-focusVisible': { outline: '2px solid #A5C6F2', outlineOffset: 3 } } } },
    MuiOutlinedInput: { styleOverrides: { root: { backgroundColor: '#1B1D21', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#717885' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#A5C6F2' }, '&.Mui-focused': { boxShadow: '0 0 0 3px rgba(69, 117, 178, .2)' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#A5C6F2', borderWidth: 2 } } } },
    MuiInputLabel: { styleOverrides: { root: { color: '#B8BEC9', '&.Mui-focused': { color: '#A5C6F2' } } } },
    MuiFormHelperText: { styleOverrides: { root: { color: '#B8BEC9', '&.Mui-error': { color: '#FFB4AB' } } } },
    MuiAlert: { styleOverrides: { root: { '&.MuiAlert-standardError': { color: '#FFD8D3', backgroundColor: '#3A1D20' }, '&.MuiAlert-standardWarning': { color: '#F3DDA8', backgroundColor: '#382D17' } } } },
    MuiTableCell: { styleOverrides: { root: { borderColor: '#353941' }, head: { backgroundColor: '#26292f', color: '#F0F1F4', fontWeight: 700 } } },
    MuiCssBaseline: { styleOverrides: { ':root': { colorScheme: 'dark' } } },
    MuiLink: { defaultProps: { color: 'primary.light' } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
  },
})

export function AppProviders({ children, queryClient }: { children: ReactNode; queryClient: QueryClient }) {
  return <QueryClientProvider client={queryClient}><ThemeProvider theme={theme}><CssBaseline /><LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es" localeText={esES.components.MuiLocalizationProvider.defaultProps.localeText}>{children}</LocalizationProvider></ThemeProvider></QueryClientProvider>
}

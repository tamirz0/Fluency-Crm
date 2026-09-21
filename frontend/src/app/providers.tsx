import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const theme = createTheme({
  palette: { primary: { main: '#17324D', contrastText: '#FFFFFF' }, secondary: { main: '#2F7F7B', contrastText: '#FFFFFF' }, background: { default: '#F5F7F6', paper: '#FFFFFF' }, text: { primary: '#26343D', secondary: '#52616A' } },
  typography: { fontFamily: "'Source Sans 3 Variable', 'Source Sans 3', sans-serif", button: { fontWeight: 650, textTransform: 'none' } },
  shape: { borderRadius: 8 },
  components: { MuiButton: { styleOverrides: { root: { minHeight: 44, borderRadius: 6 } } }, MuiOutlinedInput: { styleOverrides: { root: { backgroundColor: '#FFFFFF' } } } },
})

export function AppProviders({ children, queryClient }: { children: ReactNode; queryClient: QueryClient }) {
  return <QueryClientProvider client={queryClient}><ThemeProvider theme={theme}><CssBaseline />{children}</ThemeProvider></QueryClientProvider>
}

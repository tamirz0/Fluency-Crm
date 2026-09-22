import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'

export const theme = createTheme({
  palette: { mode: 'dark', primary: { main: '#62BDB5', contrastText: '#0B1118' }, secondary: { main: '#9CCDC8', contrastText: '#0B1118' }, error: { main: '#FF8F86' }, warning: { main: '#E8C578' }, background: { default: '#0B1118', paper: '#162631' }, text: { primary: '#E7EFF1', secondary: '#AABBC1' }, divider: '#2A3D48' },
  typography: { fontFamily: "'Source Sans 3 Variable', 'Source Sans 3', sans-serif", button: { fontWeight: 650, textTransform: 'none' } },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: { styleOverrides: { root: { minHeight: 44, borderRadius: 6 } } },
    MuiOutlinedInput: { styleOverrides: { root: { backgroundColor: '#101C28', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#2A3D48' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#62BDB5' } } } },
    MuiTableCell: { styleOverrides: { root: { borderColor: '#2A3D48' }, head: { color: '#AABBC1' } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
  },
})

export function AppProviders({ children, queryClient }: { children: ReactNode; queryClient: QueryClient }) {
  return <QueryClientProvider client={queryClient}><ThemeProvider theme={theme}><CssBaseline />{children}</ThemeProvider></QueryClientProvider>
}

import { Close, Search } from '@mui/icons-material'
import { Box, IconButton, InputAdornment, TextField, Typography } from '@mui/material'

type ListSearchProps = {
  label: string
  query: string
  onQueryChange: (query: string) => void
  resultCount: number
  totalCount: number
}

export function ListSearch({ label, query, onQueryChange, resultCount, totalCount }: ListSearchProps) {
  return <Box className="record-list-search">
    <TextField
      className="record-list-search-input"
      label={`Buscar ${label.toLocaleLowerCase('es-AR')}`}
      placeholder="Escribí para filtrar"
      value={query}
      onChange={(event) => onQueryChange(event.target.value)}
      size="small"
      type="search"
      slotProps={{
        input: {
          startAdornment: <InputAdornment position="start"><Search aria-hidden="true" fontSize="small" /></InputAdornment>,
          endAdornment: query ? <InputAdornment position="end"><IconButton aria-label="Vaciar campo de búsqueda" onClick={() => onQueryChange('')} edge="end" size="small"><Close fontSize="small" /></IconButton></InputAdornment> : undefined,
        },
        htmlInput: { 'aria-label': `Buscar en ${label.toLocaleLowerCase('es-AR')}` },
      }}
    />
    <Typography className="record-list-search-count" variant="body2" aria-live="polite" aria-atomic="true">
      {resultCount} de {totalCount} {totalCount === 1 ? 'resultado' : 'resultados'}
    </Typography>
  </Box>
}

export function NoSearchResults({ query, onClear }: { query: string; onClear: () => void }) {
  return <Box className="record-search-empty" role="status">
    <Typography component="p">No hay resultados para “{query}”.</Typography>
    <button type="button" onClick={onClear}>Limpiar búsqueda</button>
  </Box>
}

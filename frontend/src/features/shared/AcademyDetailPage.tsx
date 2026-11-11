import { Box } from '@mui/material'
import type { PropsWithChildren } from 'react'

export function AcademyDetailPage({ children }: PropsWithChildren) {
  return <Box className="companies-list-surface">
    <Box className="companies-page company-result-page records-page fluency-shell-type academy-detail-page">{children}</Box>
  </Box>
}

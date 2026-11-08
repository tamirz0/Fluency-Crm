import { Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { initials } from './display'
import './profile.css'

/** Cabecera de una ficha: avatar con iniciales, nombre, subtítulo, estado y acciones. */
export function ProfileHeader({ name, subtitle, status, actions }: { name: string; subtitle?: string | null; status?: ReactNode; actions?: ReactNode }) {
  return <header className="profile-header">
    <span className="profile-avatar" aria-hidden="true">{initials(name)}</span>
    <div className="profile-title">
      <Typography component="h1" className="companies-page-title">{name}</Typography>
      {subtitle?.trim() && <p className="profile-subtitle">{subtitle}</p>}
    </div>
    {status}
    <div className="profile-actions">{actions}</div>
  </header>
}

/** Franja de datos clave. */
export function ProfileStats({ items }: { items: { label: string; value: ReactNode }[] }) {
  return <dl className="profile-stats">{items.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd>{value || '-'}</dd></div>)}</dl>
}

/** Filas «ETIQUETA | valor» de la ficha. */
export function ProfileRows({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return <dl className="profile-rows">{rows.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd>{value || '-'}</dd></div>)}</dl>
}

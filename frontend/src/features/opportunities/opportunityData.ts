/** Cliente de la oportunidad: empresa, contacto o «Empresa – Contacto». */
export function clientLabel(opportunity: { empresaRazonSocial?: string | null; contactoNombre?: string | null }): string {
  return [opportunity.empresaRazonSocial, opportunity.contactoNombre].filter(Boolean).join(' – ')
}

export function stageToneClass(index: number): string {
  return `stage-tone-${(index % 5) + 1}`
}

export const stateLabels: Record<string, string> = { ABIERTA: 'Abierta', GANADA: 'Ganada', PERDIDA: 'Perdida' }

export function opportunityStateClass(state: string): string {
  return state === 'GANADA' ? 'opportunity-state--won' : state === 'PERDIDA' ? 'opportunity-state--lost' : 'company-status--prospect'
}

export const money = (value: number | string) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(value))

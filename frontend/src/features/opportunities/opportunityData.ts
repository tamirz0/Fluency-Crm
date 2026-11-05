import type { EtapaConOportunidades, OportunidadResumen } from '../../api/client'

export function flattenOpportunitiesByStage(stages: EtapaConOportunidades[]): OportunidadResumen[] {
  return stages.flatMap((stage) => stage.oportunidades.map((opportunity) => ({
    ...opportunity,
    idEtapa: stage.idEtapa,
    etapaNombre: stage.nombre,
    etapaOrden: stage.orden,
  })))
}

/** Cliente de la oportunidad: empresa, contacto o «Empresa – Contacto». */
export function clientLabel(opportunity: { empresaRazonSocial?: string | null; contactoNombre?: string | null }): string {
  return [opportunity.empresaRazonSocial, opportunity.contactoNombre].filter(Boolean).join(' – ')
}

export function stageToneClass(index: number): string {
  return `stage-tone-${(index % 5) + 1}`
}

export function orderStagesByPosition(stages: EtapaConOportunidades[]): EtapaConOportunidades[] {
  return stages.map((stage, index) => ({ stage, index }))
    .sort((left, right) => Number(left.stage.orden) - Number(right.stage.orden) || left.index - right.index)
    .map(({ stage }) => stage)
}

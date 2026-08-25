import { useState } from 'react'
import { matchHonorVisual } from '../data/honors/honorVisualRegistry'
import type { CareerHonor } from '../models/game'

export type HonorBadgeSize = 24 | 32 | 48
export const HONOR_BADGE_EXPORT_RASTERIZE = 'honor-badge'

export function honorBadgeExportAttributes(assetPath: string | null): Readonly<Record<'data-export-rasterize', string>> | Readonly<Record<string, never>> {
  return assetPath ? Object.freeze({ 'data-export-rasterize': HONOR_BADGE_EXPORT_RASTERIZE }) : Object.freeze({})
}

export function HonorBadge({ honor, size = 24, className = '' }: {
  honor: Pick<CareerHonor, 'type' | 'competitionLabel' | 'label'>
  size?: HonorBadgeSize
  className?: string
}) {
  const [failedAssetPath, setFailedAssetPath] = useState<string | null>(null)
  const matched = matchHonorVisual(honor)
  const assetPath = matched.visual?.assetPath ?? null
  const showAsset = assetPath !== null && assetPath !== failedAssetPath
  const classes = `honor-badge honor-badge--${size} ${className}`.trim()
  if (!showAsset) return <span className={classes} data-honor-state="fallback" aria-label={matched.displayLabel}>{matched.fallbackMark}</span>
  return (
    <span className={classes} data-honor-state="asset" data-short-mark={matched.fallbackMark} aria-label={matched.displayLabel}>
      <img alt="" src={assetPath} loading="lazy" {...honorBadgeExportAttributes(assetPath)} onError={() => setFailedAssetPath(assetPath)} />
    </span>
  )
}

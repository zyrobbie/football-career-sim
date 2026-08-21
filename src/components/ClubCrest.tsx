import { useState } from 'react'
import { getClubCrestByCompatibleId } from '../data/clubs/clubCrests'

export interface ClubCrestPresentation {
  assetPath: string | null
  fallbackShortMark: string
}

export function resolveClubCrestPresentation(input: {
  clubId: string | null | undefined
  shortMark: string
  failedAssetPath?: string | null
}): Readonly<ClubCrestPresentation> {
  const asset = input.clubId
    ? getClubCrestByCompatibleId(input.clubId)
    : null
  const assetPath = asset?.assetPath ?? null
  return Object.freeze({
    assetPath: assetPath !== null && assetPath === input.failedAssetPath
      ? null
      : assetPath,
    fallbackShortMark: input.shortMark,
  })
}

export function ClubCrest({
  clubId,
  shortMark,
  className = '',
}: {
  clubId: string | null | undefined
  shortMark: string
  className?: string
}) {
  const [failedAssetPath, setFailedAssetPath] = useState<string | null>(null)
  const presentation = resolveClubCrestPresentation({
    clubId,
    shortMark,
    failedAssetPath,
  })
  const classes = `club-crest ${className}`.trim()

  if (presentation.assetPath) {
    return (
      <span className={classes} data-crest-state="asset" data-short-mark={shortMark}>
        <img
          alt=""
          src={presentation.assetPath}
          loading="lazy"
          onError={() => setFailedAssetPath(presentation.assetPath)}
        />
      </span>
    )
  }

  return (
    <span className={classes} data-crest-state="fallback" data-short-mark={shortMark} aria-label={`${shortMark}俱乐部短标`}>
      {presentation.fallbackShortMark}
    </span>
  )
}

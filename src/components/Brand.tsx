export type BrandVariant = 'full' | 'compact' | 'icon'
export type BrandTone = 'standard' | 'reverse'

const BRAND_ASSET_PATHS: Record<BrandTone, Record<BrandVariant, string>> = {
  standard: {
    full: `${import.meta.env.BASE_URL}assets/brand/logo-full.svg`,
    compact: `${import.meta.env.BASE_URL}assets/brand/logo-compact.svg`,
    icon: `${import.meta.env.BASE_URL}assets/brand/logo-mark.svg`,
  },
  reverse: {
    full: `${import.meta.env.BASE_URL}assets/brand/logo-full-reverse.svg`,
    compact: `${import.meta.env.BASE_URL}assets/brand/logo-compact-reverse.svg`,
    icon: `${import.meta.env.BASE_URL}assets/brand/logo-mark.svg`,
  },
}

function brandAlt(variant: BrandVariant): string {
  return variant === 'full' ? '上场 · TAKE THE FIELD' : '上场'
}

export function Brand({
  variant = 'full',
  tone = 'standard',
  collapseOnMobile = false,
  exportRasterize = false,
}: {
  variant?: BrandVariant
  tone?: BrandTone
  collapseOnMobile?: boolean
  exportRasterize?: boolean
}) {
  const mobileVariant = variant === 'full' && collapseOnMobile ? 'compact' : variant
  const imageProps = {
    className: 'brand__image',
    'data-export-rasterize': exportRasterize ? 'brand-logo' : undefined,
  }

  return (
    <div className={`brand brand--${variant} brand--${tone}${collapseOnMobile ? ' brand--collapse-on-mobile' : ''}`}>
      {collapseOnMobile && variant === 'full' ? (
        <>
          <picture className="brand__picture" aria-hidden="true">
            <source media="(max-width: 767px)" srcSet={BRAND_ASSET_PATHS[tone].compact} />
            <img {...imageProps} src={BRAND_ASSET_PATHS[tone].full} alt="" />
          </picture>
          <span className="sr-only brand__a11y brand__a11y--desktop">{brandAlt('full')}</span>
          <span className="sr-only brand__a11y brand__a11y--mobile">{brandAlt(mobileVariant)}</span>
        </>
      ) : (
        <picture className="brand__picture">
          <img {...imageProps} src={BRAND_ASSET_PATHS[tone][variant]} alt={brandAlt(variant)} />
        </picture>
      )}
    </div>
  )
}

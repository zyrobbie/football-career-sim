import { describe, expect, it } from 'vitest'
import {
  RETIREMENT_EXPORT_WIDTH,
  RETIREMENT_EXPORT_FONT_TIMEOUT_MS,
  RETIREMENT_EXPORT_IMAGE_TIMEOUT_MS,
  RETIREMENT_MAX_CANVAS_PIXELS,
  RETIREMENT_QR_ASSET_PATH,
  RETIREMENT_RECORD_URL,
  calculateRetirementExportScale,
  canvasPixels,
  canShareRetirementRecord,
  chooseRetirementRecordDelivery,
  isShareCancellation,
  prepareExportCloneImages,
  retirementExportErrorMessage,
  safeRetirementRecordFilename,
  shareRetirementRecord,
  waitForExportFonts,
  waitForExportImage,
} from '../retirementRecord'
import { canExportRetirementRecord } from '../../screens/RetirementScreen'

describe('retirement record export V1', () => {
  it('only exposes record export for the final retirement archive', () => {
    expect(canExportRetirementRecord('CAREER_RETIRED')).toBe(true)
    expect(canExportRetirementRecord('RETIREMENT_DECISION')).toBe(false)
    expect(canExportRetirementRecord('HALF_YEAR_REPORT')).toBe(false)
  })

  it('keeps the QR target and local Pages-compatible asset path fixed', () => {
    expect(RETIREMENT_RECORD_URL).toBe('https://zyrobbie.github.io/football-career-sim/')
    expect(RETIREMENT_QR_ASSET_PATH).toMatch(/assets\/retirement-career-qr\.svg$/)
  })

  it('filters unsafe player names from PNG filenames', () => {
    expect(safeRetirementRecordFilename('林/致:远?*', 2048)).toBe('绿茵生涯-林致远-2048.png')
    expect(safeRetirementRecordFilename('   ', 2048)).toBe('绿茵生涯-球员-2048.png')
  })

  it('uses a high-quality scale for ordinary careers without exceeding the pixel budget', () => {
    const scale = calculateRetirementExportScale({ width: RETIREMENT_EXPORT_WIDTH, height: 3600 })
    expect(scale).not.toBeNull()
    expect(scale!).toBeGreaterThan(1)
    expect(canvasPixels(RETIREMENT_EXPORT_WIDTH, 3600, scale!)).toBeLessThanOrEqual(RETIREMENT_MAX_CANVAS_PIXELS)
  })

  it('reduces scale for long careers and rejects only impossible single-image sizes', () => {
    const ordinary = calculateRetirementExportScale({ width: RETIREMENT_EXPORT_WIDTH, height: 3600 })!
    const longCareer = calculateRetirementExportScale({ width: RETIREMENT_EXPORT_WIDTH, height: 26000 })!
    expect(longCareer).toBeLessThan(ordinary)
    expect(canvasPixels(RETIREMENT_EXPORT_WIDTH, 26000, longCareer)).toBeLessThanOrEqual(RETIREMENT_MAX_CANVAS_PIXELS)
    expect(calculateRetirementExportScale({ width: RETIREMENT_EXPORT_WIDTH, height: 180000 })).toBeNull()
  })

  it('chooses system share only when file sharing is explicitly supported', () => {
    const file = {} as File
    expect(canShareRetirementRecord({ share: () => Promise.resolve(), canShare: () => true }, file)).toBe(true)
    expect(canShareRetirementRecord({ share: () => Promise.resolve(), canShare: () => false }, file)).toBe(false)
    expect(chooseRetirementRecordDelivery(true)).toBe('SHARE')
    expect(chooseRetirementRecordDelivery(false)).toBe('DOWNLOAD')
  })

  it('falls back to download when canShare throws', () => {
    const file = {} as File
    expect(canShareRetirementRecord({
      share: () => Promise.resolve(),
      canShare: () => { throw new Error('unsupported') },
    }, file)).toBe(false)
  })

  it('returns share, cancellation, and fallback results without leaking share errors', async () => {
    const file = {} as File
    const supportedNavigator = {
      canShare: () => true,
      share: () => Promise.resolve(),
    }
    expect(await shareRetirementRecord(file, supportedNavigator)).toBe('SHARED')
    expect(await shareRetirementRecord(file, {
      canShare: () => true,
      share: () => Promise.reject(new DOMException('cancelled', 'AbortError')),
    })).toBe('CANCELLED')
    expect(await shareRetirementRecord(file, {
      canShare: () => true,
      share: () => { throw new Error('share failed') },
    })).toBe('FALLBACK')
  })

  it('forces only export-clone images to eager synchronous decoding', () => {
    const crestImage = { loading: 'lazy', decoding: 'async' }
    const qrImage = { loading: 'lazy', decoding: 'async' }
    const target = {
      querySelectorAll: () => [crestImage, qrImage],
    }
    expect(prepareExportCloneImages(target as unknown as HTMLElement)).toHaveLength(2)
    expect(crestImage).toMatchObject({ loading: 'eager', decoding: 'sync' })
    expect(qrImage).toMatchObject({ loading: 'eager', decoding: 'sync' })
  })

  it('uses data-short-mark after a crest image error or timeout but rejects a required QR image', async () => {
    const shortMarkParent = { dataset: { shortMark: '沪' }, textContent: '' }
    const failedCrest = Object.assign(new EventTarget(), {
      complete: false,
      naturalWidth: 0,
      src: '/assets/crest.svg',
      currentSrc: '/assets/crest.svg',
      parentElement: shortMarkParent,
    })
    const crestWait = waitForExportImage(failedCrest as unknown as HTMLImageElement, 50)
    failedCrest.dispatchEvent(new Event('error'))
    await expect(crestWait).resolves.toBeUndefined()
    expect(shortMarkParent.textContent).toBe('沪')

    const timedOutCrestParent = { dataset: { shortMark: '京' }, textContent: '' }
    const timedOutCrest = Object.assign(new EventTarget(), {
      complete: false,
      naturalWidth: 0,
      src: '/assets/crest-2.svg',
      currentSrc: '/assets/crest-2.svg',
      parentElement: timedOutCrestParent,
    })
    await expect(waitForExportImage(timedOutCrest as unknown as HTMLImageElement, 1)).resolves.toBeUndefined()
    expect(timedOutCrestParent.textContent).toBe('京')

    const qrImage = Object.assign(new EventTarget(), {
      complete: false,
      naturalWidth: 0,
      src: '/assets/retirement-career-qr.svg',
      currentSrc: '/assets/retirement-career-qr.svg',
      parentElement: { dataset: {}, textContent: '' },
    })
    await expect(waitForExportImage(qrImage as unknown as HTMLImageElement, 1)).rejects.toThrow('Required export image failed')
  })

  it('bounds image and font waits instead of leaving export generation pending', async () => {
    const noFontLoad = { ready: new Promise<FontFaceSet>(() => undefined) }
    await expect(waitForExportFonts(noFontLoad, 1)).resolves.toBe('TIMEOUT')
    expect(RETIREMENT_EXPORT_IMAGE_TIMEOUT_MS).toBe(5_000)
    expect(RETIREMENT_EXPORT_FONT_TIMEOUT_MS).toBe(5_000)
  })


  it('maps rendering failures to recoverable Chinese messages', () => {
    expect(retirementExportErrorMessage(new Error('Canvas memory exhausted'))).toContain('无法安全生成')
    expect(retirementExportErrorMessage(new Error('other failure'))).toContain('生成失败')
  })

  it('treats a dismissed system share sheet as a non-error cancellation', () => {
    expect(isShareCancellation(new DOMException('cancelled', 'AbortError'))).toBe(true)
    expect(isShareCancellation(new Error('share failed'))).toBe(false)
  })
})

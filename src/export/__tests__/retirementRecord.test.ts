import { describe, expect, it } from 'vitest'
import {
  RETIREMENT_EXPORT_WIDTH,
  RETIREMENT_EXPORT_BOTTOM_PADDING,
  RETIREMENT_EXPORT_FONT_TIMEOUT_MS,
  RETIREMENT_EXPORT_IMAGE_TIMEOUT_MS,
  RETIREMENT_MAX_CANVAS_PIXELS,
  RETIREMENT_QR_ASSET_PATH,
  RETIREMENT_RECORD_URL,
  calculateRetirementExportScale,
  canvasPixels,
  canShareRetirementRecord,
  cropRetirementExportCanvas,
  chooseRetirementRecordDelivery,
  isShareCancellation,
  measureRetirementExportHeight,
  lockRetirementExportHeight,
  prepareExportCloneImages,
  rasterizeExportImages,
  retirementExportErrorMessage,
  retirementExportCanvasDimensions,
  safeRetirementRecordFilename,
  shareRetirementRecord,
  waitForRetirementExportLayout,
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
    expect(safeRetirementRecordFilename('林/致:远?*', 2048)).toBe('上场-林致远-2048.png')
    expect(safeRetirementRecordFilename('   ', 2048)).toBe('上场-球员-2048.png')
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

  it('crops the export at the last visible content instead of inherited scroll-height whitespace', () => {
    const rect = (top: number, bottom: number, width = 1180) => ({
      top,
      bottom,
      width,
      height: bottom - top,
    }) as DOMRect
    const target = {
      scrollHeight: 2_400,
      getBoundingClientRect: () => rect(100, 2_500),
      children: [
        { getBoundingClientRect: () => rect(100, 196) },
        { getBoundingClientRect: () => rect(220, 1_440) },
        { getBoundingClientRect: () => rect(1_460, 1_620) },
      ],
    }

    expect(measureRetirementExportHeight(target as unknown as HTMLElement)).toBe(1_548)
  })

  it('uses the QR footer as the explicit visual export boundary and locks the clone to it', () => {
    const rect = (top: number, bottom: number, width = 1180) => ({
      top,
      bottom,
      width,
      height: bottom - top,
    }) as DOMRect
    const end = { getBoundingClientRect: () => rect(1_640, 1_820) }
    const style = {} as CSSStyleDeclaration
    const target = {
      scrollHeight: 4_000,
      style,
      getBoundingClientRect: () => rect(100, 4_100),
      querySelector: (selector: string) => {
        expect(selector).toBe('[data-retirement-export-end]')
        return end
      },
      children: [],
    }

    const height = measureRetirementExportHeight(target as unknown as HTMLElement)
    expect(height).toBe(1_720 + RETIREMENT_EXPORT_BOTTOM_PADDING)
    lockRetirementExportHeight(target as unknown as HTMLElement, height)
    expect(style).toMatchObject({
      height: `${height}px`, minHeight: '0', maxHeight: `${height}px`, boxSizing: 'border-box', paddingBottom: `${RETIREMENT_EXPORT_BOTTOM_PADDING}px`, overflow: 'hidden',
    })
  })

  it('geometrically crops an oversized source canvas to the measured QR boundary', () => {
    const originalDocument = globalThis.document
    const drawImage = (...args: unknown[]) => args
    const output = { width: 0, height: 0, getContext: () => ({ drawImage }) }
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: { createElement: () => output },
    })
    try {
      const source = { width: 2360, height: 9000 } as HTMLCanvasElement
      const cropped = cropRetirementExportCanvas(source, 1180, 3200, 2)
      expect(cropped).toBe(output)
      expect(output).toMatchObject({ width: 2360, height: 6400 })
      expect(drawImage(source, 0, 0, 2360, 6400, 0, 0, 2360, 6400)).toEqual([source, 0, 0, 2360, 6400, 0, 0, 2360, 6400])
    } finally {
      Object.defineProperty(globalThis, 'document', { configurable: true, value: originalDocument })
    }
  })

  it('reuses a correctly sized source canvas without allocating a second canvas', () => {
    const source = { width: 2360, height: 6400 } as HTMLCanvasElement
    const originalDocument = globalThis.document
    let allocations = 0
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: { createElement: () => { allocations += 1; return {} } },
    })
    try {
      expect(cropRetirementExportCanvas(source, 1180, 3200, 2)).toBe(source)
      expect(allocations).toBe(0)
    } finally {
      Object.defineProperty(globalThis, 'document', { configurable: true, value: originalDocument })
    }
  })

  it('rejects a source canvas smaller than the geometric export boundary', () => {
    expect(() => cropRetirementExportCanvas({ width: 2359, height: 6400 } as HTMLCanvasElement, 1180, 3200, 2))
      .toThrow('smaller than the measured retirement sheet')
  })

  it('uses one browser-canvas pixel-dimension calculation for budgets and cropping', () => {
    const dimensions = retirementExportCanvasDimensions(1180, 3200.1, 1.37)
    expect(dimensions).toEqual({ width: 1616, height: 4384 })
    expect(canvasPixels(1180, 3200.1, 1.37)).toBe(dimensions.width * dimensions.height)
  })

  it('waits one layout frame after rasterizing images before using export geometry', async () => {
    const originalAnimationFrame = globalThis.requestAnimationFrame
    let scheduled = false
    Object.defineProperty(globalThis, 'requestAnimationFrame', {
      configurable: true,
      value: (callback: FrameRequestCallback) => {
        scheduled = true
        callback(16)
        return 1
      },
    })
    try {
      await waitForRetirementExportLayout()
      expect(scheduled).toBe(true)
    } finally {
      Object.defineProperty(globalThis, 'requestAnimationFrame', {
        configurable: true,
        value: originalAnimationFrame,
      })
    }
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
    let shareInput: ShareData | undefined
    const supportedNavigator = {
      canShare: () => true,
      share: (input: ShareData) => {
        shareInput = input
        return Promise.resolve()
      },
    }
    expect(await shareRetirementRecord(file, supportedNavigator)).toBe('SHARED')
    expect(shareInput?.title).toBe('我的《上场》职业生涯')
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

  it('rasterizes cloned crest, honor badge, brand logo, and QR images at double internal resolution before export', () => {
    const originalDocument = globalThis.document
    const crestCanvas = {
      width: 0,
      height: 0,
      className: '',
      style: { cssText: '', width: '', height: '' },
      getContext: () => ({ drawImage: (..._args: unknown[]) => undefined }),
    }
    const honorCanvas = {
      width: 0,
      height: 0,
      className: '',
      style: { cssText: '', width: '', height: '' },
      getContext: () => ({ drawImage: (..._args: unknown[]) => undefined }),
    }
    const qrCanvas = {
      width: 0,
      height: 0,
      className: '',
      style: { cssText: '', width: '', height: '' },
      getContext: () => ({ drawImage: (..._args: unknown[]) => undefined }),
    }
    const brandCanvas = {
      width: 0,
      height: 0,
      className: '',
      style: { cssText: '', width: '', height: '' },
      getContext: () => ({ drawImage: (..._args: unknown[]) => undefined }),
    }
    const canvases = [crestCanvas, honorCanvas, brandCanvas, qrCanvas]
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: { createElement: () => canvases.shift() },
    })

    const replaced: unknown[] = []
    const image = (dataset: Record<string, string>, width: number, height: number) => ({
      dataset,
      className: 'club-crest--retirement',
      style: { cssText: 'display:block' },
      getBoundingClientRect: () => ({ width, height }),
      replaceWith: (canvas: unknown) => replaced.push(canvas),
    })
    const crest = image({ exportRasterize: 'club-crest' }, 37.5, 42.2)
    const honor = image({ exportRasterize: 'honor-badge' }, 24, 24)
    const brand = image({ exportRasterize: 'brand-logo' }, 126, 46)
    const qr = image({ exportRequired: 'qr' }, 76, 76)
    const target = {
      querySelectorAll: (selector: string) => {
        expect(selector).toContain('data-export-rasterize="club-crest"')
        expect(selector).toContain('data-export-rasterize="honor-badge"')
        expect(selector).toContain('data-export-rasterize="brand-logo"')
        expect(selector).toContain('data-export-required="qr"')
        return [crest, honor, brand, qr]
      },
    }

    try {
      rasterizeExportImages(target as unknown as HTMLElement)
    } finally {
      Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: originalDocument,
      })
    }

    expect(replaced).toEqual([crestCanvas, honorCanvas, brandCanvas, qrCanvas])
    expect(crestCanvas).toMatchObject({ width: 76, height: 86, className: 'club-crest--retirement' })
    expect(crestCanvas.style).toMatchObject({ cssText: 'display:block', width: '38px', height: '43px' })
    expect(honorCanvas).toMatchObject({ width: 48, height: 48 })
    expect(brandCanvas).toMatchObject({ width: 252, height: 92 })
    expect(qrCanvas).toMatchObject({ width: 152, height: 152 })
  })

  it('falls back on crest rasterization failure but rejects required brand and QR rasterization failures', () => {
    const originalDocument = globalThis.document
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: { createElement: () => ({ style: {}, getContext: () => null }) },
    })
    const crestParent = { dataset: { shortMark: '京' }, textContent: '' }
    const crest = {
      dataset: { exportRasterize: 'club-crest' }, className: '', style: { cssText: '' }, parentElement: crestParent,
      getBoundingClientRect: () => ({ width: 20, height: 20 }), replaceWith: () => undefined,
    }
    const qr = {
      dataset: { exportRequired: 'qr' }, className: '', style: { cssText: '' }, parentElement: { dataset: {}, textContent: '' },
      getBoundingClientRect: () => ({ width: 20, height: 20 }), replaceWith: () => undefined,
    }
    const brand = {
      dataset: { exportRasterize: 'brand-logo' }, className: '', style: { cssText: '' }, parentElement: { dataset: {}, textContent: '' },
      getBoundingClientRect: () => ({ width: 20, height: 20 }), replaceWith: () => undefined,
    }
    try {
      rasterizeExportImages({ querySelectorAll: () => [crest] } as unknown as HTMLElement)
      expect(crestParent.textContent).toBe('京')
      expect(() => rasterizeExportImages({ querySelectorAll: () => [brand] } as unknown as HTMLElement)).toThrow('Unable to rasterize export image')
      expect(() => rasterizeExportImages({ querySelectorAll: () => [qr] } as unknown as HTMLElement)).toThrow('Unable to rasterize export image')
    } finally {
      Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: originalDocument,
      })
    }
  })

  it('bounds image and font waits instead of leaving export generation pending', async () => {
    const noFontLoad = { ready: new Promise<FontFaceSet>(() => undefined) }
    await expect(waitForExportFonts(noFontLoad, 1)).resolves.toBe('TIMEOUT')
    expect(RETIREMENT_EXPORT_IMAGE_TIMEOUT_MS).toBe(5_000)
    expect(RETIREMENT_EXPORT_FONT_TIMEOUT_MS).toBe(5_000)
  })


  it('maps rendering failures to recoverable Chinese messages', () => {
    expect(retirementExportErrorMessage(new Error('Canvas memory exhausted'))).toContain('当前设备无法生成')
    expect(retirementExportErrorMessage(new Error('other failure'))).toContain('生成失败')
  })

  it('treats a dismissed system share sheet as a non-error cancellation', () => {
    expect(isShareCancellation(new DOMException('cancelled', 'AbortError'))).toBe(true)
    expect(isShareCancellation(new Error('share failed'))).toBe(false)
  })
})

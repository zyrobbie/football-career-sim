export const RETIREMENT_RECORD_URL = 'https://zyrobbie.github.io/football-career-sim/'
export const RETIREMENT_QR_ASSET_PATH = `${import.meta.env.BASE_URL}assets/retirement-career-qr.svg`
export const RETIREMENT_EXPORT_WIDTH = 1180
export const RETIREMENT_MAX_CANVAS_PIXELS = 12_000_000
const MAX_EXPORT_SCALE = 2
const MIN_EXPORT_SCALE = 0.25
export const RETIREMENT_EXPORT_IMAGE_TIMEOUT_MS = 5_000
export const RETIREMENT_EXPORT_FONT_TIMEOUT_MS = 5_000

export type RecordDelivery = 'SHARE' | 'DOWNLOAD'
export type RecordShareResult = 'SHARED' | 'CANCELLED' | 'FALLBACK'

export function canvasPixels(width: number, height: number, scale: number): number {
  return Math.ceil(width * scale) * Math.ceil(height * scale)
}

export function calculateRetirementExportScale(input: {
  width: number
  height: number
  maxPixels?: number
}): number | null {
  const { width, height, maxPixels = RETIREMENT_MAX_CANVAS_PIXELS } = input
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null
  const budgetScale = Math.sqrt(maxPixels / (width * height))
  const scale = Math.min(MAX_EXPORT_SCALE, Math.floor(budgetScale * 100) / 100)
  return scale >= MIN_EXPORT_SCALE ? scale : null
}

export function safeRetirementRecordFilename(playerName: string, retirementYear: number): string {
  const safeName = playerName
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40) || '球员'
  return `绿茵生涯-${safeName}-${retirementYear}.png`
}

export function canShareRetirementRecord(
  navigatorLike: Pick<Navigator, 'share' | 'canShare'> | undefined,
  file: File,
): boolean {
  if (!navigatorLike?.share || !navigatorLike.canShare) return false
  try {
    return navigatorLike.canShare({ files: [file] })
  } catch {
    return false
  }
}

export function chooseRetirementRecordDelivery(canShareFile: boolean): RecordDelivery {
  return canShareFile ? 'SHARE' : 'DOWNLOAD'
}

export function retirementExportErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === 'SecurityError') {
    return '浏览器阻止了图片生成，请关闭无痕限制后重试。'
  }
  if (error instanceof Error && /canvas|memory|size/i.test(error.message)) {
    return '这份生涯记录过长，当前设备无法安全生成单张图片。'
  }
  return '生涯记录生成失败，请稍后重试。'
}

export function isShareCancellation(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

export async function waitForExportFonts(
  fonts: Pick<FontFaceSet, 'ready'> | undefined,
  timeoutMs = RETIREMENT_EXPORT_FONT_TIMEOUT_MS,
): Promise<'READY' | 'TIMEOUT'> {
  if (!fonts?.ready) return 'READY'
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve('TIMEOUT'), timeoutMs)
    void fonts.ready.then(
      () => {
        clearTimeout(timeout)
        resolve('READY')
      },
      () => {
        clearTimeout(timeout)
        resolve('READY')
      },
    )
  })
}

function replaceExportImageWithShortMark(image: HTMLImageElement): boolean {
  const parent = image.parentElement
  const shortMark = parent?.dataset.shortMark
  if (!parent || !shortMark) return false
  parent.textContent = shortMark
  return true
}

function imageFailureError(image: HTMLImageElement): Error {
  return new Error(`Required export image failed: ${image.currentSrc || image.src || 'unknown image'}.`)
}

export function prepareExportCloneImages(target: HTMLElement): HTMLImageElement[] {
  const images = [...target.querySelectorAll('img')]
  for (const image of images) {
    image.loading = 'eager'
    image.decoding = 'sync'
  }
  return images
}

export function waitForExportImage(
  image: HTMLImageElement,
  timeoutMs = RETIREMENT_EXPORT_IMAGE_TIMEOUT_MS,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const fail = () => {
      cleanup()
      if (replaceExportImageWithShortMark(image)) {
        resolve()
        return
      }
      reject(imageFailureError(image))
    }
    const succeed = () => {
      cleanup()
      resolve()
    }
    const cleanup = () => {
      clearTimeout(timeout)
      image.removeEventListener('load', succeed)
      image.removeEventListener('error', fail)
    }
    const timeout = setTimeout(fail, timeoutMs)

    if (image.complete) {
      if (image.naturalWidth > 0) succeed()
      else fail()
      return
    }

    image.addEventListener('load', succeed)
    image.addEventListener('error', fail)
  })
}

export async function waitForExportImages(
  target: HTMLElement,
  timeoutMs = RETIREMENT_EXPORT_IMAGE_TIMEOUT_MS,
): Promise<void> {
  await Promise.all(prepareExportCloneImages(target).map((image) => waitForExportImage(image, timeoutMs)))
}

function rasterizeRequiredExportImages(target: HTMLElement): void {
  for (const image of target.querySelectorAll<HTMLImageElement>('img[data-export-required="qr"]')) {
    const rect = image.getBoundingClientRect()
    const cssWidth = Math.max(1, Math.ceil(rect.width))
    const cssHeight = Math.max(1, Math.ceil(rect.height))
    const canvas = document.createElement('canvas')
    canvas.width = cssWidth * 2
    canvas.height = cssHeight * 2
    canvas.className = image.className
    canvas.style.cssText = `width:${cssWidth}px;height:${cssHeight}px;`
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Unable to rasterize required export image.')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    image.replaceWith(canvas)
  }
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Canvas PNG blob failed.')), 'image/png')
  })
}

export function measureRetirementExportHeight(
  target: HTMLElement,
  bottomPadding = 30,
): number {
  const targetTop = target.getBoundingClientRect().top
  const contentBottom = [...target.children]
    .map((child) => child.getBoundingClientRect())
    .filter((rect) => rect.width > 0 && rect.height > 0)
    .reduce((bottom, rect) => Math.max(bottom, rect.bottom), targetTop)

  if (contentBottom <= targetTop) return Math.max(1, Math.ceil(target.scrollHeight))
  return Math.max(1, Math.ceil(contentBottom - targetTop + bottomPadding))
}

export async function renderRetirementRecordPng(target: HTMLElement): Promise<Blob> {
  await waitForExportFonts(document.fonts)
  const clone = target.cloneNode(true) as HTMLElement
  clone.classList.add('retirement-export-target', 'is-exporting')
  clone.style.cssText = `position:absolute;left:-20000px;top:0;width:${RETIREMENT_EXPORT_WIDTH}px;height:auto;min-height:0;max-height:none;overflow:visible;pointer-events:none;`
  document.body.append(clone)

  try {
    await waitForExportImages(clone)
    rasterizeRequiredExportImages(clone)
    const width = RETIREMENT_EXPORT_WIDTH
    const height = measureRetirementExportHeight(clone)
    const scale = calculateRetirementExportScale({ width, height })
    if (!scale) throw new Error('Canvas size exceeds memory budget.')
    const html2canvas = (await import('html2canvas')).default
    let lastError: unknown
    for (const attemptScale of [scale, Math.max(MIN_EXPORT_SCALE, scale * 0.72)]) {
      try {
        if (canvasPixels(width, height, attemptScale) > RETIREMENT_MAX_CANVAS_PIXELS) continue
        const canvas = await html2canvas(clone, {
          backgroundColor: '#f3f0e8',
          logging: false,
          scale: attemptScale,
          useCORS: false,
          width,
          height,
          windowWidth: width,
          windowHeight: height,
        })
        try {
          return await canvasToBlob(canvas)
        } finally {
          canvas.width = 0
          canvas.height = 0
        }
      } catch (error) {
        lastError = error
      }
    }
    throw lastError ?? new Error('Canvas rendering failed.')
  } finally {
    clone.remove()
  }
}

export async function shareRetirementRecord(
  file: File,
  navigatorLike: Pick<Navigator, 'share' | 'canShare'> | undefined = navigator,
): Promise<RecordShareResult> {
  if (!canShareRetirementRecord(navigatorLike, file)) return 'FALLBACK'
  try {
    await navigatorLike.share({
      files: [file],
      title: '我的绿茵生涯',
      text: '这是我的球员生涯记录',
    })
    return 'SHARED'
  } catch (error) {
    return isShareCancellation(error) ? 'CANCELLED' : 'FALLBACK'
  }
}

export function downloadRetirementRecord(url: string, filename: string): void {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()
}

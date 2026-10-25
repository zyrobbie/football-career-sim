/** Browser save assets are real PNG bytes, never the SVG reader or a viewport screenshot. */
export interface CareerPngSaveAsset { file: File; dataUrl: string }
export async function prepareCareerPngSaveAsset(blob: Blob, filename: string): Promise<CareerPngSaveAsset> {
  if (blob.type !== 'image/png' || !blob.size) throw new Error('A PNG image is required for saving.')
  const signature = new Uint8Array(await blob.slice(0, 8).arrayBuffer())
  if (![137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => signature[index] === value)) {
    throw new Error('Invalid PNG image bytes.')
  }
  const file = new File([blob], filename, { type: 'image/png' })
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    const timer = setTimeout(() => { reader.abort(); reject(new Error('PNG preview timed out.')) }, 10_000)
    const cleanup = () => { clearTimeout(timer); reader.onload = null; reader.onerror = null; reader.onabort = null }
    reader.onload = () => {
      const result = reader.result
      cleanup()
      typeof result === 'string' && result.startsWith('data:image/png;base64,')
        ? resolve(result) : reject(new Error('PNG preview encoding failed.'))
    }
    reader.onerror = () => { cleanup(); reject(new Error('PNG preview encoding failed.')) }
    reader.onabort = () => { cleanup(); reject(new Error('PNG preview encoding interrupted.')) }
    try { reader.readAsDataURL(file) } catch (error) { cleanup(); reject(error) }
  })
  return { file, dataUrl }
}

export type CareerPngShareResult = 'HANDED_OFF' | 'CANCELLED' | 'UNSUPPORTED' | 'ERROR'
/** Invoke from the actual click handler. No fetch/render/await before navigator.share. */
export function shareCareerPng(file: File, navigatorLike: Pick<Navigator, 'share' | 'canShare'>): Promise<CareerPngShareResult> {
  try {
    if (file.type !== 'image/png' || !file.size) return Promise.resolve('UNSUPPORTED')
    if (!navigatorLike.share || !navigatorLike.canShare?.({ files: [file] })) return Promise.resolve('UNSUPPORTED')
    // File only: sharing the page URL or accompanying text can route mobile targets to a web page.
    return navigatorLike.share({ files: [file] }).then(
      () => 'HANDED_OFF' as const,
      (error: unknown) => error instanceof Error && error.name === 'AbortError' ? 'CANCELLED' as const : 'ERROR' as const,
    )
  } catch (error) {
    return Promise.resolve(error instanceof Error && error.name === 'AbortError' ? 'CANCELLED' : 'ERROR')
  }
}

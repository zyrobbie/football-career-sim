import { useEffect, useRef, useState, type RefObject } from 'react'
import type { GameState } from '../models/game'
import type { CareerPosterSvg } from '../export/careerPosterSvg'
import { prepareCareerPoster, renderPreparedCareerPosterPng } from '../export/careerPosterExport'
import { renderRetirementRecordPng, retirementExportErrorMessage, safeRetirementRecordFilename } from '../export/retirementRecord'
import { Icon } from './Icons'
import { prepareCareerPngSaveAsset, shareCareerPng, type CareerPngSaveAsset } from '../export/careerPngSave'

type ExportStatus = 'IDLE' | 'GENERATING' | 'READY' | 'ERROR'

export function RetirementRecordPreview({ previewUrl, playerName, fileSize, onClose,
  filename = '上场-职业生涯.png', busy = false, message, returnFocusRef, pngAsset, originalUrl,
}: {
  previewUrl: string; playerName: string; fileSize: number; onClose: () => void
  pngAsset?: CareerPngSaveAsset | null; originalUrl?: string | null
  filename?: string; busy?: boolean
  message?: string | null; returnFocusRef?: RefObject<HTMLElement | null>
}) {
  const [shareMessage, setShareMessage] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const sharingRef = useRef(false)
  const shareToken = useRef(0)
  useEffect(() => { shareToken.current++; sharingRef.current = false; setSharing(false); setShareMessage(null); return () => { shareToken.current++ } }, [pngAsset])
  const saveWithSystem = () => {
    if (!pngAsset || sharingRef.current || busy) return
    sharingRef.current = true
    const token = ++shareToken.current
    const pending = shareCareerPng(pngAsset.file, navigator)
    setSharing(true); setShareMessage(null)
    void pending.then(result => {
      if (token !== shareToken.current) return
      const notices = { HANDED_OFF: '图片已交给系统菜单；是否存入相册取决于你选择的操作。', CANCELLED: '已取消系统操作，图片仍可保存。', UNSUPPORTED: '当前浏览器不支持系统图片菜单。请长按下方 PNG 原图，或打开 PNG 原图后保存；内置浏览器受限时请在 Safari 或系统浏览器中打开。', ERROR: '系统图片菜单未能打开。图片未丢失，可长按下方 PNG 原图，或使用下载 PNG 文件。' }
      setShareMessage(notices[result]); setSharing(false); sharingRef.current = false
    })
  }
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    const previousFocus = returnFocusRef?.current ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onCloseRef.current(); return }
      if (event.key !== 'Tab') return
      const elements = [...(panelRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],select:not(:disabled),summary,[tabindex="0"]') ?? [])]
      const first = elements[0], last = elements.at(-1)
      if (!elements.includes(document.activeElement as HTMLElement)) { event.preventDefault(); (event.shiftKey ? last : first)?.focus(); return }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => { document.removeEventListener('keydown', keydown); document.body.style.overflow = oldOverflow; previousFocus?.focus() }
  }, [])
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0 }, [previewUrl])
  return <div className="retirement-export-preview" role="dialog" aria-modal="true" aria-label="职业生涯长图预览">
    <div className="retirement-export-preview__panel" ref={panelRef}>
      <header><div><span>你的生涯长图做好了</span><strong>保存到手机：PNG 原图</strong></div>
        <button type="button" ref={closeRef} onClick={onClose} aria-label="关闭生涯长图预览">×</button></header>
      <div className="retirement-export-preview__tools">
        {busy ? <span role="status">正在生成完整长图…</span> : <>
          <button type="button" data-png-system-save disabled={!pngAsset || sharing} onClick={saveWithSystem}>{sharing ? '系统菜单处理中…' : '系统保存 / 分享'}</button>
          <a data-png-download href={previewUrl} download={filename}>下载PNG文件</a>
          <a data-png-original href={originalUrl ?? previewUrl} target="_blank" rel="noopener noreferrer">打开PNG原图</a>
        </>}
        <span>下方是完整 PNG 图片，可上下滑动查看。</span>
        <details className="retirement-export-save-help"><summary>如何保存到相册？</summary><p>长按下方 PNG 图片或打开原图，选择“存储图像 / 保存图片”。也可用“系统保存 / 分享”寻找保存图片选项。下载 PNG 文件通常进入“文件 / 下载”，不会自动进入相册。若只有微信转发选项，请在 Safari 或系统浏览器中打开后再保存。网页无法代替你完成系统相册授权。</p></details>
        {shareMessage ? <p role="status" data-png-save-status>{shareMessage}</p> : null}
        {message ? <p role="alert">{message}</p> : null}
      </div>
      <div ref={scrollRef} className="retirement-export-preview__image" data-export-file-size={fileSize} data-career-preview-scroll
        tabIndex={0} role="region" aria-label="可上下滚动的保存图片" aria-busy={busy}>
        <img data-png-save-preview src={previewUrl} alt={`${playerName}的《上场》职业生涯记录`} draggable={false} />
      </div>
    </div>
  </div>
}

export function RetirementRecordExportActions({ targetRef, game, preparedPoster, playerName, onReturnHome }: {
  targetRef: RefObject<HTMLElement | null>; game?: GameState; preparedPoster?: CareerPosterSvg | null
  playerName: string; onReturnHome: () => void
}) {
  const mounted = useRef(true), generating = useRef(false), request = useRef(0)
  const controller = useRef<AbortController | null>(null)
  const saveButtonRef = useRef<HTMLButtonElement>(null)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; request.current++; controller.current?.abort() } }, [])
  const [status, setStatus] = useState<ExportStatus>('IDLE')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [pngAsset, setPngAsset] = useState<CareerPngSaveAsset | null>(null)
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => () => { if (originalUrl) URL.revokeObjectURL(originalUrl) }, [originalUrl])
  const closePreview = () => { controller.current?.abort(); request.current++; generating.current = false; setPreviewUrl(null); setPngAsset(null); setOriginalUrl(null); setFileSize(0); setStatus('IDLE'); setMessage(null) }
  const generateRecord = async () => {
    if (generating.current || (!game && !targetRef.current)) return
    generating.current = true
    const token = ++request.current
    controller.current = new AbortController()
    const signal = controller.current.signal
    setStatus('GENERATING'); setMessage(null)
    try {
      let blob: Blob
      if (game) {
        const poster = preparedPoster ?? await prepareCareerPoster(game)
        blob = await renderPreparedCareerPosterPng(poster, signal)
      } else blob = await renderRetirementRecordPng(targetRef.current!)
      signal.throwIfAborted()
      const baseName = safeRetirementRecordFilename(playerName, game ? game.startYear + Math.floor(game.windowIndex / 2) : new Date().getFullYear())
      const asset = await prepareCareerPngSaveAsset(blob, baseName)
      if (!mounted.current || token !== request.current) return
      setPngAsset(asset); setOriginalUrl(URL.createObjectURL(asset.file));
      setFileSize(blob.size); setPreviewUrl(asset.dataUrl); setStatus('READY')
    } catch (error) {
      if (!mounted.current || token !== request.current) return
      setMessage(retirementExportErrorMessage(error)); setStatus('ERROR')
    } finally { if (token === request.current) generating.current = false }
  }
  const baseFilename = safeRetirementRecordFilename(playerName, game ? game.startYear + Math.floor(game.windowIndex / 2) : new Date().getFullYear())
  const filename = baseFilename
  return <section className="retirement-export-actions" aria-label="保存职业生涯记录">
    <div className="retirement-export-actions__buttons">
      <button ref={saveButtonRef} type="button" className="button button--primary" onClick={() => void generateRecord()} disabled={status === 'GENERATING'}>
        <Icon name="save" />{status === 'GENERATING' ? '正在生成生涯长图…' : '保存我的职业生涯'}</button>
      <button type="button" className="button button--secondary button--on-dark" onClick={() => { closePreview(); onReturnHome() }}>回到初始界面</button>
      {status === 'GENERATING' ? <button type="button" className="button button--secondary" onClick={closePreview}>取消生成</button> : null}
    </div>
    {status === 'ERROR' && message && !previewUrl ? <p role="alert">{message}</p> : null}
    {previewUrl ? <RetirementRecordPreview previewUrl={previewUrl} playerName={playerName} fileSize={fileSize} filename={filename} pngAsset={pngAsset} originalUrl={originalUrl}
      returnFocusRef={saveButtonRef} busy={status === 'GENERATING'} message={message} onClose={closePreview} /> : null}
  </section>
}

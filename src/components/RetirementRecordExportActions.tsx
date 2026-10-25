import { useEffect, useRef, useState, type RefObject } from 'react'
import type { GameState } from '../models/game'
import type { CareerPosterSvg } from '../export/careerPosterSvg'
import { prepareCareerPoster, planCareerPosterPages, renderCareerPosterPage } from '../export/careerPosterExport'
import { renderRetirementRecordPng, retirementExportErrorMessage, safeRetirementRecordFilename } from '../export/retirementRecord'
import { Icon } from './Icons'

type ExportStatus = 'IDLE' | 'GENERATING' | 'READY' | 'ERROR'

export function RetirementRecordPreview({ previewUrl, playerName, fileSize, onClose,
  filename = '上场-职业生涯.png', pageIndex = 0, pageCount = 1, busy = false, onPageChange, message, returnFocusRef,
}: {
  previewUrl: string; playerName: string; fileSize: number; onClose: () => void
  filename?: string; pageIndex?: number; pageCount?: number; busy?: boolean
  onPageChange?: (index: number) => void; message?: string | null; returnFocusRef?: RefObject<HTMLElement | null>
}) {
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
      const elements = [...(panelRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],select:not(:disabled),[tabindex="0"]') ?? [])]
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
      <header><div><span>你的生涯长图做好了</span><strong>长按图片即可保存到相册</strong></div>
        <button type="button" ref={closeRef} onClick={onClose} aria-label="关闭生涯长图预览">×</button></header>
      <div className="retirement-export-preview__tools">
        {pageCount > 1 ? <><p>履历较长，分为 {pageCount} 张高清图。请依次选择并保存，完整内容仍可在浏览框连续查看。</p>
          <label>选择图片 <select aria-label="选择生涯图片" value={pageIndex} disabled={busy} onChange={event => onPageChange?.(Number(event.target.value))}>
            {Array.from({ length: pageCount }, (_, index) => <option key={index} value={index}>第 {index + 1} / {pageCount} 张</option>)}
          </select></label></> : null}
        {busy ? <span role="status">正在生成所选图片…</span> : <a href={previewUrl} download={filename}>{pageCount > 1 ? '下载当前图片' : '下载图片'}</a>}
        <span>在图片内上下滑动查看</span>
        {message ? <p role="alert">{message}</p> : null}
      </div>
      <div ref={scrollRef} className="retirement-export-preview__image" data-export-file-size={fileSize} data-career-preview-scroll
        tabIndex={0} role="region" aria-label="可上下滚动的保存图片" aria-busy={busy}>
        <img src={previewUrl} alt={`${playerName}的《上场》职业生涯记录${pageCount > 1 ? `，第${pageIndex + 1}张，共${pageCount}张` : ''}`} draggable={false} />
      </div>
    </div>
  </div>
}

export function RetirementRecordExportActions({ targetRef, game, preparedPoster, playerName, onReturnHome }: {
  targetRef: RefObject<HTMLElement | null>; game?: GameState; preparedPoster?: CareerPosterSvg | null
  playerName: string; onReturnHome: () => void
}) {
  const mounted = useRef(true), generating = useRef(false), request = useRef(0)
  const exportPoster = useRef<CareerPosterSvg | null>(null)
  const saveButtonRef = useRef<HTMLButtonElement>(null)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; request.current++ } }, [])
  const [status, setStatus] = useState<ExportStatus>('IDLE')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState(0)
  const [pageIndex, setPageIndex] = useState(0), [pageCount, setPageCount] = useState(1)
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])
  const closePreview = () => { request.current++; generating.current = false; setPreviewUrl(null); setFileSize(0); setStatus('IDLE'); setMessage(null) }
  const generateRecord = async (index = 0, changePage = false) => {
    if (generating.current || (!game && !targetRef.current)) return
    generating.current = true
    const token = ++request.current
    setStatus('GENERATING'); setMessage(null)
    try {
      let blob: Blob, count = 1
      if (game) {
        const poster = (changePage ? exportPoster.current : preparedPoster) ?? await prepareCareerPoster(game)
        const pages = planCareerPosterPages(poster)
        count = pages.length
        const page = pages[index]
        if (!page) throw new Error('Invalid poster page.')
        blob = await renderCareerPosterPage(poster, page)
        if (mounted.current && token === request.current) exportPoster.current = poster
      } else blob = await renderRetirementRecordPng(targetRef.current!)
      if (!mounted.current || token !== request.current) return
      setFileSize(blob.size); setPreviewUrl(URL.createObjectURL(blob)); setPageCount(count); setPageIndex(index); setStatus('READY')
    } catch (error) {
      if (!mounted.current || token !== request.current) return
      setMessage(retirementExportErrorMessage(error)); setStatus('ERROR')
    } finally { if (token === request.current) generating.current = false }
  }
  const baseFilename = safeRetirementRecordFilename(playerName, game ? game.startYear + Math.floor(game.windowIndex / 2) : new Date().getFullYear())
  const filename = pageCount > 1 ? baseFilename.replace(/\.png$/, `-${pageIndex + 1}-${pageCount}.png`) : baseFilename
  return <section className="retirement-export-actions" aria-label="保存职业生涯记录">
    <div className="retirement-export-actions__buttons">
      <button ref={saveButtonRef} type="button" className="button button--primary" onClick={() => void generateRecord()} disabled={status === 'GENERATING'}>
        <Icon name="save" />{status === 'GENERATING' ? '正在生成生涯长图…' : '保存我的职业生涯'}</button>
      <button type="button" className="button button--secondary button--on-dark" onClick={onReturnHome} disabled={status === 'GENERATING'}>回到初始界面</button>
    </div>
    {status === 'ERROR' && message && !previewUrl ? <p role="alert">{message}</p> : null}
    {previewUrl ? <RetirementRecordPreview previewUrl={previewUrl} playerName={playerName} fileSize={fileSize} filename={filename}
      returnFocusRef={saveButtonRef} pageIndex={pageIndex} pageCount={pageCount} busy={status === 'GENERATING'} onPageChange={index => void generateRecord(index, true)} message={message} onClose={closePreview} /> : null}
  </section>
}

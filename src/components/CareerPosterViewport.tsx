import { useEffect, useState, type ReactNode } from 'react'
import type { GameState } from '../models/game'
import type { CareerPosterSvg } from '../export/careerPosterSvg'
import { prepareCareerPoster } from '../export/careerPosterExport'

/** Vector preview never allocates a full-height canvas, including unusually long careers. */
export function useCareerPoster(game: GameState) {
  const [poster, setPoster] = useState<CareerPosterSvg | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let cancelled = false
    let url: string | null = null
    setPoster(null); setPreviewUrl(null); setError(false)
    void prepareCareerPoster(game).then(result => {
      if (cancelled) return
      url = URL.createObjectURL(new Blob([result.svg], { type: 'image/svg+xml;charset=utf-8' }))
      setPoster(result); setPreviewUrl(url)
    }).catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url) }
  }, [game, attempt])
  return { poster, previewUrl, error, retry: () => setAttempt(value => value + 1) }
}

export function CareerPosterViewport({ previewUrl, playerName, error, onRetry, actions }: {
  previewUrl: string | null
  playerName: string
  error?: boolean
  onRetry?: () => void
  actions?: ReactNode
}) {
  return <section className="career-poster-reader" aria-label="生涯长图浏览框">
    <header className="career-poster-reader__heading">
      <h1>我的职业生涯</h1>
      <p id="career-poster-scroll-help">在浏览框内上下滑动，查看完整生涯。保存图片请点“保存我的职业生涯”，不要长按此浏览图。</p>
    </header>
    {actions}
    {previewUrl ? <div className="career-poster-viewport" data-career-viewer-scroll tabIndex={0}
      role="region" aria-label="可上下滚动的生涯长图" aria-describedby="career-poster-scroll-help">
      <img onContextMenu={event => event.preventDefault()} data-career-viewer-image src={previewUrl} alt={`${playerName}的完整职业生涯长图；完整文字内容位于下方文字版档案`} draggable={false} />
    </div> : <div className="career-poster-reader__loading" role={error ? 'alert' : 'status'}>
      {error ? <>长图暂时无法载入，你仍可查看下方完整文字档案。<button type="button" onClick={onRetry}>重新载入长图</button></> : '正在载入生涯长图…'}
    </div>}
  </section>
}

import { useEffect, useState, type RefObject } from 'react'
import {
  canShareRetirementRecord,
  chooseRetirementRecordDelivery,
  downloadRetirementRecord,
  renderRetirementRecordPng,
  retirementExportErrorMessage,
  safeRetirementRecordFilename,
  shareRetirementRecord,
} from '../export/retirementRecord'
import { Icon } from './Icons'

type ExportStatus = 'IDLE' | 'GENERATING' | 'READY' | 'SHARING' | 'ERROR'

export function RetirementRecordExportActions({
  targetRef,
  playerName,
  retirementYear,
}: {
  targetRef: RefObject<HTMLElement | null>
  playerName: string
  retirementYear: number
}) {
  const [status, setStatus] = useState<ExportStatus>('IDLE')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setFile(null)
    setStatus('IDLE')
    setMessage(null)
  }

  const generateRecord = async () => {
    if (status === 'GENERATING' || !targetRef.current) return
    setStatus('GENERATING')
    setMessage(null)
    try {
      const blob = await renderRetirementRecordPng(targetRef.current)
      const filename = safeRetirementRecordFilename(playerName, retirementYear)
      const generatedFile = new File([blob], filename, { type: 'image/png' })
      const nextPreviewUrl = URL.createObjectURL(blob)
      setFile(generatedFile)
      setPreviewUrl(nextPreviewUrl)
      setStatus('READY')
    } catch (error) {
      setMessage(retirementExportErrorMessage(error))
      setStatus('ERROR')
    }
  }

  const download = () => {
    if (!file || !previewUrl) return
    try {
      downloadRetirementRecord(previewUrl, file.name)
      setMessage('已发起图片下载；若浏览器未自动保存，可长按预览图片保存到相册。')
    } catch {
      setMessage('图片已保留在预览中；浏览器未能自动下载，请长按图片保存到相册。')
    }
  }

  const shareOrDownload = async () => {
    if (!file || !previewUrl || status === 'SHARING') return
    const delivery = chooseRetirementRecordDelivery(canShareRetirementRecord(navigator, file))
    if (delivery === 'DOWNLOAD') {
      download()
      return
    }
    setStatus('SHARING')
    try {
      const result = await shareRetirementRecord(file)
      if (result === 'CANCELLED') {
        setMessage('已取消系统分享，图片预览仍可保存。')
        return
      }
      if (result === 'FALLBACK') {
        download()
        setMessage('系统分享未完成，已保留预览并尝试下载图片。')
        return
      }
      setMessage('已交给系统分享面板。')
    } catch {
      download()
      setMessage('系统分享未完成，已保留预览并尝试下载图片。')
    } finally {
      setStatus('READY')
    }
  }

  return (
    <section className="retirement-export-actions" aria-label="保存生涯记录">
      <button
        type="button"
        className="button button--primary"
        onClick={() => void generateRecord()}
        disabled={status === 'GENERATING'}
      >
        <Icon name="save" />
        {status === 'GENERATING' ? '正在生成生涯记录…' : '保存我的生涯记录'}
      </button>
      {status === 'ERROR' && message ? <p role="alert">{message}</p> : null}

      {previewUrl && file ? (
        <div className="retirement-export-preview" role="dialog" aria-modal="true" aria-label="生涯记录图片预览">
          <div className="retirement-export-preview__panel">
            <header>
              <div>
                <span>生涯记录已生成</span>
                <strong>长按图片可保存到系统相册</strong>
              </div>
              <button type="button" onClick={closePreview} aria-label="关闭图片预览">×</button>
            </header>
            <div className="retirement-export-preview__image" data-export-file-size={file.size}>
              <img src={previewUrl} alt={`${playerName}的绿茵生涯记录`} />
            </div>
            <p>{message ?? '可保存到系统相册、分享给朋友，或下载 PNG 图片。'}</p>
            <div className="retirement-export-preview__actions">
              <button type="button" className="button button--primary" onClick={() => void shareOrDownload()} disabled={status === 'SHARING'}>
                <Icon name="save" />
                {status === 'SHARING' ? '正在调用系统分享…' : '保存到相册 / 分享'}
              </button>
              <button type="button" className="button button--secondary" onClick={download}>下载图片</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

import { useEffect, useState, type RefObject } from 'react'
import {
  renderRetirementRecordPng,
  retirementExportErrorMessage,
} from '../export/retirementRecord'
import { Icon } from './Icons'

type ExportStatus = 'IDLE' | 'GENERATING' | 'READY' | 'ERROR'

export function RetirementRecordPreview({
  previewUrl,
  playerName,
  fileSize,
  onClose,
}: {
  previewUrl: string
  playerName: string
  fileSize: number
  onClose: () => void
}) {
  return (
    <div className="retirement-export-preview" role="dialog" aria-modal="true" aria-label="职业生涯长图预览">
      <div className="retirement-export-preview__panel">
        <header>
          <div>
            <span>你的生涯长图做好了</span>
            <strong>长按图片即可保存到相册</strong>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭生涯长图预览">×</button>
        </header>
        <div className="retirement-export-preview__image" data-export-file-size={fileSize}>
          <img
            src={previewUrl}
            alt={`${playerName}的《上场》职业生涯记录`}
            draggable={false}
          />
        </div>
      </div>
    </div>
  )
}

export function RetirementRecordExportActions({
  targetRef,
  playerName,
}: {
  targetRef: RefObject<HTMLElement | null>
  playerName: string
}) {
  const [status, setStatus] = useState<ExportStatus>('IDLE')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState(0)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setFileSize(0)
    setStatus('IDLE')
    setMessage(null)
  }

  const generateRecord = async () => {
    if (status === 'GENERATING' || !targetRef.current) return
    setStatus('GENERATING')
    setMessage(null)
    try {
      const blob = await renderRetirementRecordPng(targetRef.current)
      const nextPreviewUrl = URL.createObjectURL(blob)
      setFileSize(blob.size)
      setPreviewUrl(nextPreviewUrl)
      setStatus('READY')
    } catch (error) {
      setMessage(retirementExportErrorMessage(error))
      setStatus('ERROR')
    }
  }

  return (
    <section className="retirement-export-actions" aria-label="保存职业生涯记录">
      <button
        type="button"
        className="button button--primary"
        onClick={() => void generateRecord()}
        disabled={status === 'GENERATING'}
      >
        <Icon name="save" />
        {status === 'GENERATING' ? '正在生成生涯长图…' : '保存我的职业生涯'}
      </button>
      {status === 'ERROR' && message ? <p role="alert">{message}</p> : null}

      {previewUrl ? (
        <RetirementRecordPreview
          previewUrl={previewUrl}
          playerName={playerName}
          fileSize={fileSize}
          onClose={closePreview}
        />
      ) : null}
    </section>
  )
}

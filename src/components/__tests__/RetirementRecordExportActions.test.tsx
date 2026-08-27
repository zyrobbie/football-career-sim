import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { RetirementRecordPreview } from '../RetirementRecordExportActions'

describe('retirement record preview', () => {
  it('shows one long-pressable image without redundant share or download buttons', () => {
    const markup = renderToStaticMarkup(
      <RetirementRecordPreview
        previewUrl="blob:retirement-record"
        playerName="Robbie"
        fileSize={123456}
        onClose={vi.fn()}
      />,
    )

    expect(markup).toContain('长按图片即可保存到相册')
    expect(markup).toContain('你的生涯长图做好了')
    expect(markup).toContain('《上场》职业生涯记录')
    expect(markup).toContain('draggable="false"')
    expect(markup).toContain('data-export-file-size="123456"')
    expect(markup).not.toContain('保存到相册 / 分享')
    expect(markup).not.toContain('下载图片')
  })
})

import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import {
  RetirementRecordExportActions,
  RetirementRecordPreview,
} from '../RetirementRecordExportActions'

const exportActionsSource = readFileSync(
  new URL('../RetirementRecordExportActions.tsx', import.meta.url),
  'utf8',
)

describe('retirement record preview', () => {
  it('shows a scrollable long-pressable image and explicit accessible download', () => {
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
    expect(markup).toContain('下载图片')
    expect(markup).toContain('data-career-preview-scroll')
    expect(markup).toContain('tabindex="0"')
    expect(markup).toContain('download=')
  })
})

it('explains multipart output and lets the player select a numbered image', () => {
  const markup = renderToStaticMarkup(<RetirementRecordPreview previewUrl="blob:part" playerName="Robbie" fileSize={42} pageCount={4} pageIndex={2} onPageChange={vi.fn()} onClose={vi.fn()} />)
  expect(markup).toContain('选择生涯图片')
  expect(markup).toContain('第 3 / 4 张')
  expect(markup).toContain('下载当前图片')
  expect(markup).toContain('完整内容仍可在浏览框连续查看')
})

describe('retirement record actions', () => {
  it('keeps save and non-destructive return-home actions outside the export target', () => {
    const markup = renderToStaticMarkup(
      <RetirementRecordExportActions
        targetRef={{ current: null }}
        playerName="Robbie"
        onReturnHome={vi.fn()}
      />,
    )

    expect(markup).toContain('保存我的职业生涯')
    expect(markup).toContain('回到初始界面')
    expect(markup).toContain('retirement-export-actions__buttons')
    expect(markup).not.toContain('retirement-export-sheet')
  })

  it('disables both archive actions while the record is generating', () => {
    const disabledActions = exportActionsSource.match(
      /disabled=\{status === 'GENERATING'\}/g,
    ) ?? []

    expect(disabledActions).toHaveLength(2)
  })
})

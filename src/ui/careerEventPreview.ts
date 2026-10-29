/** Display-only, neutral metric names. Outcomes and settlement values are untouched.
 * Risk probabilities remain explicit; purchase quotes do not use this helper.
 */
export function qualitativeEventPreview(preview: string): string {
  if (/\d+%/.test(preview)) return preview
  return preview
    .replace(/(?:花费|支出)€[\d,]+(?:\.\d+)?/g, '现金')
    .replace(/[+−-]?\d+(?:\.\d+)?\s*[～~至]\s*[+−-]?\d+(?:\.\d+)?/g, '')
    .replace(/[+−-]€?[\d,]+(?:\.\d+)?/g, '')
    .replace(/(?:小幅|明显|略微|略|均衡|平衡|稳定)?(?:上升|下降|增加|减少|提升|降低|恢复|增长|承压|较少|不变|略降|略升)/g, '')
    .replace(/风险(?:最低|较低)|关系基本稳定/g, value => value.startsWith('风险') ? '风险' : '关系')
    .replace(/\s+）/g, '）')
    .replace(/（\s*）/g, '')
    .replace('无数值影响', '不影响状态与收入')
}

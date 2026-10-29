/** Choice outcomes are directional, not a numerical shopping list.
 * Risk probabilities are not stat-outcome spoilers. Real purchase panels do not use this helper.
 * The settled record is rendered separately and retains exact actual deltas.
 */
export function qualitativeEventPreview(preview: string): string {
  return preview
    .replace(/花费€[\d,]+(?:\.\d+)?/g, '现金减少')
    .replace(/([+-])€[\d,]+(?:\.\d+)?/g, (_, sign: string) => sign === '+' ? '上升' : '下降')
    .replace(/([+-])(\d+(?:\.\d+)?)(?![\d.%])/g, (_, sign: string, amount: string) => {
      const size = Number(amount) <= 2 ? '小幅' : '明显'
      return `${size}${sign === '+' ? '上升' : '下降'}`
    })
    .replace('无数值影响', '状态与收入不变')
}

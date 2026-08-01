export const DEMO_WINDOW_COUNT = 4

export function careerWindowLabel(
  startYear: number,
  windowIndex: number,
): string {
  const year = startYear + Math.floor(windowIndex / 2)
  const season = windowIndex % 2 === 0 ? '夏季' : '冬季'
  return `${year}年${season}`
}

export function playerAgeAtWindow(windowIndex: number): number {
  return 13 + Math.floor(windowIndex / 2)
}

export function transferWindowNumber(windowIndex: number): number {
  return Math.max(1, windowIndex - DEMO_WINDOW_COUNT)
}

const DISPOSABLE_BRACKETS = [
  { ceiling: 50_000, rate: 0.3 },
  { ceiling: 150_000, rate: 0.25 },
  { ceiling: 500_000, rate: 0.2 },
  { ceiling: 2_000_000, rate: 0.12 },
  { ceiling: 5_000_000, rate: 0.08 },
  { ceiling: Number.POSITIVE_INFINITY, rate: 0.05 },
] as const

export function annualDisposableIncome(annualSalaryEuro: number): number {
  let remaining = Math.max(0, annualSalaryEuro)
  let previousCeiling = 0
  let disposable = 0

  for (const bracket of DISPOSABLE_BRACKETS) {
    if (remaining <= 0) break
    const width = bracket.ceiling - previousCeiling
    const taxable = Math.min(remaining, width)
    disposable += taxable * bracket.rate
    remaining -= taxable
    previousCeiling = bracket.ceiling
  }

  return Math.round(disposable)
}

export function halfYearDisposableIncome(annualSalaryEuro: number): number {
  return Math.round(annualDisposableIncome(annualSalaryEuro) / 2)
}

export function cashReserveLimit(annualSalaryEuro: number): number {
  return Math.round(annualDisposableIncome(annualSalaryEuro) * 1.5)
}

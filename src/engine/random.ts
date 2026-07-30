export interface RandomSource {
  next: () => number
  float: (min: number, max: number) => number
  int: (min: number, max: number) => number
  pick: <T>(items: readonly T[]) => T
}

function hashString(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function createRandom(...parts: Array<string | number>): RandomSource {
  const next = mulberry32(hashString(parts.join('::')))
  return {
    next,
    float: (min, max) => min + (max - min) * next(),
    int: (min, max) => Math.floor(min + (max - min + 1) * next()),
    pick: <T>(items: readonly T[]) => {
      if (items.length === 0) {
        throw new Error('Cannot pick from an empty collection.')
      }
      return items[Math.floor(next() * items.length)] as T
    },
  }
}

export function weightedPick<T>(
  random: RandomSource,
  items: readonly { value: T; weight: number }[],
): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0)
  let cursor = random.float(0, total)
  for (const item of items) {
    cursor -= item.weight
    if (cursor <= 0) return item.value
  }
  return items.at(-1)?.value as T
}

export function poisson(random: RandomSource, lambda: number): number {
  if (lambda <= 0) return 0
  if (lambda > 25) {
    const approximate = Math.round(
      lambda + Math.sqrt(lambda) * normal(random),
    )
    return Math.max(0, approximate)
  }

  const limit = Math.exp(-lambda)
  let product = 1
  let count = 0
  do {
    count += 1
    product *= random.next()
  } while (product > limit)
  return count - 1
}

function normal(random: RandomSource): number {
  const first = Math.max(Number.EPSILON, random.next())
  const second = random.next()
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second)
}

export function createCareerSeed(): string {
  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(4)
    globalThis.crypto.getRandomValues(values)
    return Array.from(values, (value) => value.toString(16).padStart(8, '0')).join(
      '',
    )
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

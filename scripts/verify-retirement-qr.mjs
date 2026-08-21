import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import jsQR from 'jsqr'
import sharp from 'sharp'
import { RETIREMENT_RECORD_URL } from './retirement-qr-config.mjs'

const requestedPath = process.argv[2] === '--file' ? process.argv[3] : undefined
if (process.argv[2] && !requestedPath) {
  throw new Error('Usage: node scripts/verify-retirement-qr.mjs [--file path]')
}
const sourcePath = requestedPath ?? fileURLToPath(
  new URL('../public/assets/retirement-career-qr.svg', import.meta.url),
)
const sourceBefore = await readFile(sourcePath)
const sourceHashBefore = createHash('sha256').update(sourceBefore).digest('hex')
const { data, info } = await sharp(sourceBefore)
  .resize({ width: 820, height: 820, fit: 'contain', kernel: 'nearest' })
  .extend({ top: 80, bottom: 80, left: 80, right: 80, background: '#ffffff' })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })
const decoded = jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data

if (decoded !== RETIREMENT_RECORD_URL) {
  throw new Error(`QR decoded to ${decoded}, expected ${RETIREMENT_RECORD_URL}.`)
}

const sourceAfter = await readFile(sourcePath)
const sourceHashAfter = createHash('sha256').update(sourceAfter).digest('hex')
if (sourceHashBefore !== sourceHashAfter) {
  throw new Error('QR verification unexpectedly modified the SVG source.')
}

console.log(`Verified retirement QR: ${decoded}`)
console.log(`QR source unchanged (sha256): ${sourceHashBefore}`)

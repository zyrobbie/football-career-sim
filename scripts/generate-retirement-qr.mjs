import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import QRCode from 'qrcode'
import { RETIREMENT_RECORD_URL } from './retirement-qr-config.mjs'

const outputPath = fileURLToPath(
  new URL('../public/assets/retirement-career-qr.svg', import.meta.url),
)

const svg = await QRCode.toString(RETIREMENT_RECORD_URL, {
  type: 'svg',
  errorCorrectionLevel: 'M',
  margin: 4,
  color: { dark: '#12382d', light: '#ffffff' },
})

await writeFile(outputPath, svg)

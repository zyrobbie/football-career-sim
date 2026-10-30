/** Tiny same-scene placeholders only; full-resolution approved artwork is untouched. */
import fs from 'node:fs/promises'
import sharp from 'sharp'
const assets = JSON.parse(await fs.readFile(new URL('../src/ui/sceneAssets.json', import.meta.url), 'utf8'))
const previews = {}
for (const [id, asset] of Object.entries(assets)) {
  const bytes = await sharp(new URL(`../public${asset.src}`, import.meta.url).pathname)
    .resize({ width: 64 }).webp({ quality: 30, effort: 6 }).toBuffer()
  previews[id] = `data:image/webp;base64,${bytes.toString('base64')}`
}
const json = JSON.stringify(previews, null, 2) + '\n'
if (Buffer.byteLength(json) > 48 * 1024) throw Error('Scene preview budget exceeded (48 KiB)')
const target = new URL('../src/ui/scenePreviews.json', import.meta.url)
if (process.argv.includes('--check')) {
  if (await fs.readFile(target, 'utf8') !== json) throw Error('Scene previews are out of date')
} else await fs.writeFile(target, json)
console.log(`${Object.keys(previews).length} same-scene previews: ${Buffer.byteLength(json)} bytes`)

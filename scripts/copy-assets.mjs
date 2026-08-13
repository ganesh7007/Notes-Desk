import { cpSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const dest = resolve(root, 'resources/tesseract')
mkdirSync(dest, { recursive: true })

const sources = [
  ['node_modules/tesseract.js/dist', 'worker'],
  ['node_modules/tesseract.js-core', 'core']
]

for (const [from, to] of sources) {
  const srcPath = resolve(root, from)
  if (existsSync(srcPath)) {
    cpSync(srcPath, resolve(dest, to), { recursive: true })
    console.log(`copied ${from} -> resources/tesseract/${to}`)
  } else {
    console.warn(`SKIP: ${from} does not exist`)
  }
}

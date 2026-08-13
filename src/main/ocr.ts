import { createWorker } from 'tesseract.js'
import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import { dirs } from './db'

export const OCR_LANGS = ['eng', 'fra', 'deu', 'spa', 'ita', 'por', 'rus', 'hin', 'ara', 'jpn', 'kor', 'chi_sim']

interface TesseractPaths {
  workerPath: string
  corePath: string
  langPath: string
}

function resolveTesseractPaths(): TesseractPaths {
  const inResources = path.join(process.resourcesPath ?? '', 'tesseract')
  if (fs.existsSync(path.join(inResources, 'worker', 'worker.min.js'))) {
    return {
      workerPath: path.join(inResources, 'worker', 'worker.min.js'),
      corePath: path.join(inResources, 'core'),
      langPath: dirs.tesseract
    }
  }
  const nodeModules = path.join(process.cwd(), 'node_modules')
  return {
    workerPath: path.join(nodeModules, 'tesseract.js', 'dist', 'worker.min.js'),
    corePath: path.join(nodeModules, 'tesseract.js-core'),
    langPath: dirs.tesseract
  }
}

const DATA_URLS = [
  (lang: string) => `https://cdn.jsdelivr.net/npm/@tesseract.js-data/${lang}/4.0.0_best_int/tessdata_fast/${lang}.traineddata.gz`,
  (lang: string) => `https://raw.githubusercontent.com/naptha/tessdata_fast/main/${lang}.traineddata.gz`,
  (lang: string) => `https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main/${lang}.traineddata.gz`
]

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    const req = https.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        req.destroy()
        downloadFile(res.headers.location, dest).then(resolve, reject)
        return
      }
      if (res.statusCode !== 200) {
        req.destroy()
        reject(new Error(`HTTP ${res.statusCode}`))
        return
      }
      res.pipe(file)
      file.on('finish', () => file.close(() => resolve()))
    })
    req.on('error', (err) => {
      file.destroy()
      reject(err)
    })
    file.on('error', (err) => {
      req.destroy()
      reject(err)
    })
  })
}

async function ensureLangData(lang: string): Promise<boolean> {
  const file = path.join(dirs.tesseract, `${lang}.traineddata.gz`)
  if (fs.existsSync(file) && fs.statSync(file).size > 1000) return true
  fs.mkdirSync(dirs.tesseract, { recursive: true })
  const tmp = `${file}.tmp`
  for (const url of DATA_URLS.map((fn) => fn(lang))) {
    try {
      await downloadFile(url, tmp)
      if (fs.existsSync(tmp) && fs.statSync(tmp).size > 1000) {
        fs.renameSync(tmp, file)
        return true
      }
    } catch {
      /* try next source */
    }
  }
  return false
}

export function ocrStatus(lang = 'eng'): { available: boolean; path: string | null } {
  const file = path.join(dirs.tesseract, `${lang}.traineddata.gz`)
  const ok = fs.existsSync(file) && fs.statSync(file).size > 1000
  return { available: ok, path: ok ? file : null }
}

export async function prepareOcrLanguage(lang = 'eng'): Promise<boolean> {
  const ok = await ensureLangData(lang)
  if (!ok) {
    // fallback: copy from bundled resources if we shipped them
    const bundled = path.join(process.resourcesPath ?? '', 'tesseract', 'langs', `${lang}.traineddata.gz`)
    if (fs.existsSync(bundled)) {
      fs.copyFileSync(bundled, path.join(dirs.tesseract, `${lang}.traineddata.gz`))
      return true
    }
  }
  return ok
}

export async function extractTextFromImage(
  filePath: string,
  lang = 'eng'
): Promise<{ text: string; confidence: number }> {
  const ready = await prepareOcrLanguage(lang)
  if (!ready) {
    throw new Error(
      `OCR language "${lang}" is not available offline. Connect to the internet once so NotesApp can download it, then try again.`
    )
  }
  const paths = resolveTesseractPaths()
  const worker = await createWorker(lang, 1, {
    workerPath: paths.workerPath,
    corePath: paths.corePath,
    langPath: paths.langPath,
    cachePath: path.join(dirs.tesseract, 'cache')
  })
  try {
    const { data } = await worker.recognize(filePath)
    return {
      text: (data.text || '').trim(),
      confidence: data.confidence ?? 0
    }
  } finally {
    await worker.terminate()
  }
}

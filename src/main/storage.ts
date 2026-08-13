import fs from 'node:fs'
import path from 'node:path'
import { dirs } from './db'

export type MediaKind = 'image' | 'audio' | 'attachment' | 'drawing' | 'recording'

function extFor(kind: MediaKind, fallback: string): string {
  if (kind === 'image') return fallback || '.png'
  if (kind === 'audio' || kind === 'recording') return fallback || '.webm'
  if (kind === 'drawing') return '.png'
  return fallback || '.bin'
}

export function mediaDir(kind: MediaKind): string {
  if (kind === 'image') return dirs.images
  if (kind === 'audio' || kind === 'recording') return dirs.audio
  if (kind === 'drawing') return dirs.drawings
  return dirs.attachments
}

export function saveBuffer(
  buffer: Buffer,
  kind: MediaKind,
  fallbackExt: string,
  name?: string
): { path: string; name: string; size: number } {
  const dir = mediaDir(kind)
  const safe = (name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
  const ext = extFor(kind, fallbackExt).startsWith('.')
    ? extFor(kind, fallbackExt)
    : `.${extFor(kind, fallbackExt)}`
  const baseName = safe.toLowerCase().endsWith(ext.toLowerCase())
    ? safe
    : `${safe}${ext}`
  const finalName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${baseName}`
  const fullPath = path.join(dir, finalName)
  fs.writeFileSync(fullPath, buffer)
  return { path: fullPath, name: finalName, size: buffer.length }
}

export function copyIntoApp(sourcePath: string, kind: MediaKind): { path: string; name: string; size: number } {
  const buffer = fs.readFileSync(sourcePath)
  const ext = path.extname(sourcePath) || '.bin'
  return saveBuffer(buffer, kind, ext, path.basename(sourcePath))
}

export function readAsBuffer(filePath: string): Buffer {
  return fs.readFileSync(filePath)
}

export function readAsDataUrl(filePath: string): string {
  const buffer = fs.readFileSync(filePath)
  const mime = mimeFor(filePath)
  return `data:${mime};base64,${buffer.toString('base64')}`
}

export function fileSize(filePath: string): number {
  try {
    return fs.statSync(filePath).size
  } catch {
    return 0
  }
}

export function mimeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const map: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.mp4': 'video/mp4',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.json': 'application/json',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.zip': 'application/zip',
    '.html': 'text/html',
    '.htm': 'text/html'
  }
  return map[ext] || 'application/octet-stream'
}

export function deleteFile(filePath: string): boolean {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      return true
    }
  } catch {
    /* ignore */
  }
  return false
}

export function dirSize(dir: string): number {
  let total = 0
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) total += dirSize(full)
      else if (entry.isFile()) total += fs.statSync(full).size
    }
  } catch {
    /* ignore */
  }
  return total
}

import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { generateHTML } from '@tiptap/core'
import { StarterKit } from '@tiptap/starter-kit'
import { Underline } from '@tiptap/extension-underline'
import { Link } from '@tiptap/extension-link'
import { Image } from '@tiptap/extension-image'
import { Placeholder } from '@tiptap/extension-placeholder'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import { TextAlign } from '@tiptap/extension-text-align'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'

import type { Note, TipNode } from '../shared/types'
import { tiptapJsonToMarkdown, tiptapJsonToPlainText, markdownToTiptapJson, plainTextToTiptapJson } from '../shared/converters'
import { generateDocxBuffer } from './docx'
import { appDataDir } from './db'
import { mimeFor } from './storage'

export const EXPORT_EXTENSIONS = [
  StarterKit,
  Underline,
  Link.configure({ openOnClick: false }),
  Image.configure({ inline: false }),
  Placeholder.configure({ placeholder: 'Start writing...' }),
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Table.configure({ resizable: true }),
  TableRow,
  TableHeader,
  TableCell
]

function resolveMediaSrc(src: string): string | null {
  if (!src) return null
  if (src.startsWith('appmedia://')) {
    const rest = src.replace('appmedia://', '')
    const full = path.join(appDataDir, rest)
    return fs.existsSync(full) ? full : null
  }
  if (src.startsWith('data:')) return src
  if (fs.existsSync(src)) return src
  return null
}

interface PdfLine {
  text: string
  style?: string
  bold?: boolean
  italic?: boolean
  image?: string
}

function buildPdfLines(doc: TipNode, out: PdfLine[], depth = 0): void {
  if (!doc.content) return
  for (const node of doc.content) {
    switch (node.type) {
      case 'paragraph': {
        const parts: string[] = []
        collectText(node, parts)
        const text = parts.join(' ').trim()
        if (text) out.push({ text, style: 'normal' })
        break
      }
      case 'heading': {
        const parts: string[] = []
        collectText(node, parts)
        const level = (node.attrs?.level as number) ?? 2
        out.push({ text: parts.join(' ').trim(), style: level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3' })
        break
      }
      case 'codeBlock': {
        const code = (node.content ?? []).map((t) => t.text ?? '').join('').replace(/\n$/, '')
        out.push({ text: code, style: 'code' })
        break
      }
      case 'bulletList':
      case 'orderedList': {
        node.content?.forEach((item, idx) => {
          const parts: string[] = []
          collectText(item, parts)
          out.push({ text: `${node.type === 'orderedList' ? `${idx + 1}.` : '•'} ${parts.join(' ').trim()}`, style: 'normal' })
        })
        break
      }
      case 'taskList': {
        node.content?.forEach((item) => {
          const parts: string[] = []
          collectText(item, parts)
          const checked = item.attrs?.checked ? '[x]' : '[ ]'
          out.push({ text: `${checked} ${parts.join(' ').trim()}`, style: 'normal' })
        })
        break
      }
      case 'blockquote': {
        const parts: string[] = []
        collectText(node, parts)
        out.push({ text: parts.join(' ').trim(), style: 'quote' })
        break
      }
      case 'image': {
        const src = resolveMediaSrc((node.attrs?.src as string) ?? '')
        if (src) out.push({ text: '', image: src })
        break
      }
      case 'horizontalRule':
        out.push({ text: '─────────────────────', style: 'normal' })
        break
      case 'table': {
        const rows = node.content ?? []
        rows.forEach((tr, ri) => {
          const cells = (tr.content ?? []).map((cell) => {
            const parts: string[] = []
            collectText(cell, parts)
            return parts.join(' ').trim()
          })
          out.push({ text: cells.join(' | '), style: ri === 0 ? 'tableHead' : 'normal' })
        })
        break
      }
      default:
        buildPdfLines(node, out, depth + 1)
    }
  }
}

function collectText(node: TipNode, parts: string[]): void {
  if (node.type === 'text' && node.text) parts.push(node.text)
  if (node.content) node.content.forEach((c) => collectText(c, parts))
}

export async function exportNote(note: Note, format: string, destPath: string, includeImages = true): Promise<void> {
  const title = note.title || 'Untitled'
  const meta = `${new Date(note.updatedAt).toLocaleString()}`
  switch (format) {
    case 'json': {
      fs.writeFileSync(
        destPath,
        JSON.stringify(
          {
            app: 'NotesApp',
            version: 1,
            exportedAt: Date.now(),
            note: { ...note }
          },
          null,
          2
        ),
        'utf8'
      )
      break
    }
    case 'txt':
      fs.writeFileSync(destPath, `${title}\n${meta}\n\n${tiptapJsonToPlainText(note.content)}`, 'utf8')
      break
    case 'markdown': {
      const md = tiptapJsonToMarkdown(note.content)
      fs.writeFileSync(destPath, `# ${title}\n\n_${meta}_\n\n${md}`, 'utf8')
      break
    }
    case 'html': {
      const html = generateHTML(JSON.parse(note.content || '{"type":"doc","content":[]}'), EXPORT_EXTENSIONS)
      const full = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>body{font-family:system-ui;max-width:800px;margin:40px auto;padding:0 20px;color:#1f2937;line-height:1.7}img{max-width:100%}pre{background:#0f172a;color:#e2e8f0;padding:16px;border-radius:8px;overflow:auto}</style>
</head><body><h1>${escapeHtml(title)}</h1><p style="color:#6b7280">${escapeHtml(meta)}</p>${html}</body></html>`
      fs.writeFileSync(destPath, full, 'utf8')
      break
    }
    case 'docx': {
      const doc = JSON.parse(note.content || '{"type":"doc","content":[]}') as TipNode
      const lines: { text: string; bold?: boolean; heading?: boolean }[] = [
        { text: title, heading: true, bold: true },
        { text: meta }
      ]
      buildDocxLines(doc, lines)
      const buf = await generateDocxBuffer(lines)
      fs.writeFileSync(destPath, buf)
      break
    }
    case 'pdf': {
      const doc = JSON.parse(note.content || '{"type":"doc","content":[]}') as TipNode
      const lines: PdfLine[] = [
        { text: title, style: 'h1' },
        { text: meta, style: 'meta' }
      ]
      buildPdfLines(doc, lines)
      const content = lines
        .filter((l) => !l.image)
        .map((l) => toPdfItem(l))
      if (includeImages) {
        lines
          .filter((l) => l.image)
          .forEach((l) => {
            if (l.image) {
              if (l.image.startsWith('data:')) content.push({ image: l.image, width: 500 })
              else {
                const dataUrl = fs.readFileSync(l.image).toString('base64')
                content.push({ image: `data:${mimeFor(l.image)};base64,${dataUrl}`, width: 500 })
              }
            }
          })
      }
      const docDefinition = {
        info: { title: note.title || 'Untitled' },
        content,
        defaultStyle: { fontSize: 11, color: '#1f2937' },
        styles: {
          h1: { fontSize: 24, bold: true, margin: [0, 0, 0, 8] },
          h2: { fontSize: 18, bold: true, margin: [0, 14, 0, 4] },
          h3: { fontSize: 15, bold: true, margin: [0, 10, 0, 4] },
          meta: { fontSize: 9, color: '#9ca3af', margin: [0, 0, 0, 12] },
          normal: { margin: [0, 0, 0, 6] },
          quote: { italics: true, color: '#6b7280', margin: [10, 4, 0, 8] },
          code: { font: 'Courier', fontSize: 9, background: '#f3f4f6', color: '#111827', margin: [0, 6, 0, 6] },
          tableHead: { bold: true, background: '#f3f4f6', margin: [0, 0, 0, 4] }
        }
      }
      await writePdf(docDefinition, destPath)
      break
    }
    default:
      throw new Error(`Unsupported export format: ${format}`)
  }
}

function toPdfItem(line: PdfLine): unknown {
  const base: Record<string, unknown> = { text: line.text }
  if (line.style) base.style = line.style
  return base
}

function buildDocxLines(doc: TipNode, lines: { text: string; bold?: boolean; heading?: boolean }[]): void {
  if (!doc.content) return
  for (const node of doc.content) {
    const parts: string[] = []
    collectText(node, parts)
    const text = parts.join(' ').trim()
    switch (node.type) {
      case 'paragraph':
        if (text) lines.push({ text })
        break
      case 'heading':
        if (text) lines.push({ text, heading: true, bold: true })
        break
      case 'codeBlock':
        lines.push({ text: (node.content ?? []).map((t) => t.text ?? '').join('') })
        break
      case 'bulletList':
      case 'orderedList':
        node.content?.forEach((item, i) => {
          const iparts: string[] = []
          collectText(item, iparts)
          lines.push({ text: `${node.type === 'orderedList' ? `${i + 1}.` : '•'} ${iparts.join(' ').trim()}` })
        })
        break
      case 'taskList':
        node.content?.forEach((item) => {
          const iparts: string[] = []
          collectText(item, iparts)
          lines.push({ text: `${item.attrs?.checked ? '[x]' : '[ ]'} ${iparts.join(' ').trim()}` })
        })
        break
      case 'blockquote':
        if (text) lines.push({ text: `> ${text}`, bold: true })
        break
      case 'table':
        node.content?.forEach((tr, ri) => {
          const cells = (tr.content ?? []).map((cell) => {
            const cp: string[] = []
            collectText(cell, cp)
            return cp.join(' ').trim()
          })
          lines.push({ text: cells.join(' | '), bold: ri === 0 })
        })
        break
      default:
        buildDocxLines(node, lines)
    }
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/* ----------------------------- pdfmake ----------------------------- */

interface PdfDoc {
  info?: { title: string }
  content: unknown[]
  defaultStyle?: Record<string, unknown>
  styles?: Record<string, unknown>
}

async function writePdf(doc: PdfDoc, destPath: string): Promise<void> {
  const require = createRequire(import.meta.url)
  const PdfPrinter = require('pdfmake') as {
    new (fonts: Record<string, Record<string, string>>): {
      createPdfKitDocument(def: PdfDoc): NodeJS.ReadableStream & { end(): void }
    }
  }
  const vfsModule = require('pdfmake/build/vfs_fonts') as { pdfMake?: { vfs?: Record<string, string> } }
  const vfs = vfsModule.pdfMake?.vfs ?? {}
  const fonts = {
    Roboto: {
      normal: vfs['Roboto-Regular.ttf'] ?? '',
      bold: vfs['Roboto-Medium.ttf'] ?? vfs['Roboto-Regular.ttf'] ?? '',
      italics: vfs['Roboto-Italic.ttf'] ?? vfs['Roboto-Regular.ttf'] ?? '',
      bolditalics: vfs['Roboto-MediumItalic.ttf'] ?? vfs['Roboto-Regular.ttf'] ?? ''
    },
    Courier: {
      normal: vfs['Roboto-Regular.ttf'] ?? '',
      bold: vfs['Roboto-Medium.ttf'] ?? '',
      italics: vfs['Roboto-Regular.ttf'] ?? '',
      bolditalics: vfs['Roboto-Medium.ttf'] ?? ''
    }
  }
  const printer = new PdfPrinter(fonts)
  const stream = printer.createPdfKitDocument(doc)
  const writeStream = fs.createWriteStream(destPath)
  await new Promise<void>((resolve, reject) => {
    stream.pipe(writeStream)
    stream.on('error', reject)
    writeStream.on('error', reject)
    writeStream.on('finish', resolve)
    stream.end()
  })
}

/* ----------------------------- import ----------------------------- */

export async function importFile(filePath: string, format: string): Promise<{ title: string; content: TipNode; text: string }> {
  const base = path.basename(filePath, path.extname(filePath))
  switch (format) {
    case 'txt':
    case 'markdown': {
      const raw = fs.readFileSync(filePath, 'utf8')
      if (format === 'markdown') {
        return { title: base, content: markdownToTiptapJson(raw), text: tiptapJsonToPlainText(markdownToTiptapJson(raw)) }
      }
      return { title: base, content: plainTextToTiptapJson(raw), text: raw }
    }
    case 'json': {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      const note = parsed.note ?? parsed
      const content = typeof note.content === 'string' ? (JSON.parse(note.content || '{}') as TipNode) : (note.content as TipNode)
      return { title: note.title ?? base, content, text: note.plainText ?? tiptapJsonToPlainText(content) }
    }
    case 'docx': {
      const require = createRequire(import.meta.url)
      const mammoth = require('mammoth') as {
        extractRawText(args: { path: string }): Promise<{ value: string }>
      }
      const result = await mammoth.extractRawText({ path: filePath })
      const text = result.value.trim()
      return { title: base, content: plainTextToTiptapJson(text), text }
    }
    case 'pdf': {
      const text = await extractPdfText(filePath)
      return { title: base, content: plainTextToTiptapJson(text), text }
    }
    default:
      throw new Error(`Unsupported import format: ${format}`)
  }
}

async function extractPdfText(filePath: string): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs').catch(() =>
    import('pdfjs-dist').then((m) => m as unknown as { getDocument: (src: unknown) => { promise: Promise<unknown> } })
  ) as unknown as { getDocument(src: { data: Uint8Array }): { promise: Promise<{ getPage(n: number): Promise<{ getTextContent(): Promise<{ items: { str: string }[] }> }>; numPages: number }> } }

  const data = new Uint8Array(fs.readFileSync(filePath))
  const doc = await pdfjs.getDocument({ data }).promise
  const parts: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    parts.push(content.items.map((it) => it.str).join(' '))
  }
  return parts.join('\n\n').trim()
}

export function resolveMediaSrcExport(src: string): string | null {
  return resolveMediaSrc(src)
}

/* TipTap JSON <-> Markdown / Plain text converters. */
import type { TipNode } from './types'

export type { TipNode }

function mdInlineMarks(node: TipNode): string {
  if (!node.text) return ''
  let t = node.text
  const marks = node.marks ?? []
  const ordered = marks.map((m) => m.type)
  const isBold = ordered.includes('bold')
  const isItalic = ordered.includes('italic')
  const isCode = ordered.includes('code')
  const isStrike = ordered.includes('strike')
  if (isCode) return `\`${t}\``
  if (isBold) t = `**${t}**`
  if (isItalic) t = `*${t}*`
  if (isStrike) t = `~~${t}~~`
  const link = marks.find((m) => m.type === 'link')
  if (link && link.attrs?.href) return `[${t}](${link.attrs.href})`
  return t
}

export function tiptapJsonToMarkdown(json: string | TipNode | null): string {
  if (!json) return ''
  let doc: TipNode
  if (typeof json === 'string') {
    try {
      doc = JSON.parse(json)
    } catch {
      return json
    }
  } else {
    doc = json
  }
  if (!doc?.content) return ''
  const out: string[] = []

  const render = (node: TipNode, depth: number, inTask: boolean): string => {
    const c = (node.content ?? []).map((child) => render(child, depth, false)).filter(Boolean)
    switch (node.type) {
      case 'paragraph':
        return c.join('')
      case 'text':
        return inTask ? node.text ?? '' : mdInlineMarks(node)
      case 'heading': {
        const level = (node.attrs?.level as number) ?? 2
        const prefix = '#'.repeat(Math.min(level, 6))
        return `${prefix} ${c.join('')}`
      }
      case 'bulletList':
      case 'orderedList': {
        const ordered = node.type === 'orderedList'
        const items = node.content ?? []
        return items
          .map((item, i) => {
            const body = render(item, depth + 1, false)
            return `${'  '.repeat(depth)}${ordered ? `${i + 1}.` : '-'} ${body}`
          })
          .join('\n')
      }
      case 'listItem':
        return c.join('')
      case 'taskList':
        return (node.content ?? [])
          .map((item) => render(item, depth, true))
          .join('\n')
      case 'taskItem': {
        const checked = node.attrs?.checked ? '[x]' : '[ ]'
        const body = c.join('')
        return `${'  '.repeat(depth)}- ${checked} ${body}`
      }
      case 'codeBlock': {
        const lang = (node.attrs?.language as string) ?? ''
        const code = (node.content ?? []).map((t) => t.text ?? '').join('')
        return '```' + lang + '\n' + code + '\n```'
      }
      case 'blockquote':
        return c
          .map((l) => `> ${l}`)
          .join('\n')
      case 'horizontalRule':
        return '---'
      case 'hardBreak':
      case 'break':
        return '\n'
      case 'image': {
        const src = (node.attrs?.src as string) ?? ''
        const alt = (node.attrs?.alt as string) ?? ''
        return src ? `![${alt || 'image'}](${src})` : ''
      }
      case 'table': {
        const rows = (node.content ?? []).map((tr) => render(tr, depth, false))
        return rows.join('\n')
      }
      case 'tableRow': {
        const cells = (node.content ?? []).map((cell) => render(cell, depth + 1, false))
        const parts = cells.length ? cells : ['']
        return `| ${parts.join(' | ')} |`
      }
      case 'tableHeader':
      case 'tableCell': {
        const body = c.join(' ')
        const attrs = node.attrs ?? {}
        const rowspan = attrs.rowspan && attrs.rowspan !== 1 ? ` rowspan="${attrs.rowspan}"` : ''
        const colspan = attrs.colspan && attrs.colspan !== 1 ? ` colspan="${attrs.colspan}"` : ''
        return `${body}${rowspan}${colspan}`
      }
      default:
        return c.join('')
    }
  }

  for (const child of doc.content) {
    const line = render(child, 0, false)
    if (line !== undefined && line.trim() !== '') out.push(line)
  }
  return out.join('\n\n')
}

export function tiptapJsonToPlainText(json: string | TipNode | null): string {
  if (!json) return ''
  let doc: TipNode
  if (typeof json === 'string') {
    try {
      doc = JSON.parse(json)
    } catch {
      return json
    }
  } else {
    doc = json
  }
  const parts: string[] = []
  const walk = (node: TipNode) => {
    if (node.type === 'text' && node.text) parts.push(node.text)
    else if (node.type === 'image') parts.push(`[image: ${(node.attrs?.alt as string) ?? ''}]`)
    else if (node.type === 'codeBlock') parts.push((node.content ?? []).map((t) => t.text ?? '').join('\n'))
    else if (node.type === 'hardBreak' || node.type === 'break') parts.push('\n')
    else if (node.type === 'horizontalRule') parts.push('---')
    if (node.content) {
      for (const ch of node.content) {
        if (ch.type === 'paragraph' || ch.type === 'heading' || ch.type === 'blockquote') {
          walk(ch)
          parts.push('\n')
        } else {
          walk(ch)
        }
      }
    }
  }
  walk(doc)
  return parts.join('').replace(/\n{3,}/g, '\n\n').trim()
}

const INLINE_PATTERN = /(\*\*|__|[*_~`]|\[[^\]]*\]\([^)]*\)|#{1,6}\s)/

function parseInline(text: string): TipNode[] {
  const nodes: TipNode[] = []
  const parts = text.split(INLINE_PATTERN)
  for (const part of parts) {
    if (!part) continue
    if (part.startsWith('**') || part.startsWith('__')) {
      const inner = part.slice(2)
      nodes.push({ type: 'text', text: inner, marks: [{ type: 'bold' }] })
    } else if (part.startsWith('*') && !part.startsWith('**')) {
      nodes.push({ type: 'text', text: part.slice(1, -1), marks: [{ type: 'italic' }] })
    } else if (part.startsWith('_') && !part.startsWith('__')) {
      nodes.push({ type: 'text', text: part.slice(1, -1), marks: [{ type: 'italic' }] })
    } else if (part.startsWith('~')) {
      nodes.push({ type: 'text', text: part.slice(2, -2), marks: [{ type: 'strike' }] })
    } else if (part.startsWith('`')) {
      nodes.push({ type: 'text', text: part.slice(1, -1), marks: [{ type: 'code' }] })
    } else if (part.startsWith('[')) {
      const m = part.match(/^\[([^\]]*)\]\(([^)]*)\)$/)
      if (m) {
        nodes.push({ type: 'text', text: m[1], marks: [{ type: 'link', attrs: { href: m[2] } }] })
      } else {
        nodes.push({ type: 'text', text: part })
      }
    } else {
      nodes.push({ type: 'text', text: part })
    }
  }
  return nodes
}

export function markdownToTiptapJson(md: string): TipNode {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const content: TipNode[] = []
  let i = 0

  const pushParagraph = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    content.push({ type: 'paragraph', content: parseInline(trimmed) })
  }

  const parseCodeFence = () => {
    const fence = lines[i]
    const lang = fence.replace(/^```+/, '').trim()
    const codeLines: string[] = []
    i++
    while (i < lines.length && !lines[i].startsWith('```')) {
      codeLines.push(lines[i])
      i++
    }
    i++
    content.push({
      type: 'codeBlock',
      attrs: { language: lang || 'plain' },
      content: codeLines.map((line) => ({ type: 'text', text: `${line}\n` }))
    })
  }

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()
    if (trimmed.startsWith('```')) {
      parseCodeFence()
      continue
    }
    if (!trimmed) {
      i++
      continue
    }
    if (/^#{1,6}\s/.test(trimmed)) {
      const level = trimmed.match(/^(#{1,6})/ )![1].length
      content.push({
        type: 'heading',
        attrs: { level },
        content: parseInline(trimmed.replace(/^#{1,6}\s*/, ''))
      })
      i++
      continue
    }
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && lines[i + 1]?.trim().match(/^\|[\s:|-]+\|$/)) {
      const rows: TipNode[] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i]
          .trim()
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim())
        rows.push({
          type: 'tableRow',
          content: cells.map((cell) => ({
            type: 'tableCell',
            content: cell ? [{ type: 'paragraph', content: parseInline(cell) }] : []
          }))
        })
        i++
      }
      content.push({ type: 'table', content: rows })
      continue
    }
    if (/^[-*]\s/.test(trimmed)) {
      const items: TipNode[] = []
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) {
        items.push({
          type: 'listItem',
          content: [{ type: 'paragraph', content: parseInline(lines[i].trim().replace(/^[-*]\s/, '')) }]
        })
        i++
      }
      content.push({ type: 'bulletList', content: items })
      continue
    }
    if (/^\d+\.\s/.test(trimmed)) {
      const items: TipNode[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push({
          type: 'listItem',
          content: [{ type: 'paragraph', content: parseInline(lines[i].trim().replace(/^\d+\.\s/, '')) }]
        })
        i++
      }
      content.push({ type: 'orderedList', content: items })
      continue
    }
    if (/^- \[[ xX]\]/.test(trimmed)) {
      const items: TipNode[] = []
      while (i < lines.length && /^- \[[ xX]\]/.test(lines[i].trim())) {
        const m = lines[i].trim().match(/^- \[([ xX])\]\s*(.*)/)
        items.push({
          type: 'taskItem',
          attrs: { checked: m![1].toLowerCase() === 'x' },
          content: [{ type: 'paragraph', content: parseInline(m![2] ?? '') }]
        })
        i++
      }
      content.push({ type: 'taskList', content: items })
      continue
    }
    if (/^>\s?/.test(trimmed)) {
      const quoteLines: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      content.push({
        type: 'blockquote',
        content: quoteLines.map((l) => ({ type: 'paragraph', content: parseInline(l) }))
      })
      continue
    }
    if (trimmed === '---' || trimmed === '***') {
      content.push({ type: 'horizontalRule' })
      i++
      continue
    }
    pushParagraph(line)
    i++
  }

  return { type: 'doc', content }
}

export function plainTextToTiptapJson(text: string): TipNode {
  return {
    type: 'doc',
    content: text
      .split(/\n{2,}/)
      .filter((p) => p.trim())
      .map((p) => ({
        type: 'paragraph',
        content: p.split('\n').map((l) => ({ type: 'text', text: l }))
      }))
  }
}

import fs from 'node:fs'
import { createRequire } from 'node:module'
import type { Archiver } from 'archiver'

const requireFn = createRequire(__filename)
const archiver = requireFn('archiver') as (
  format: string,
  options?: Record<string, unknown>
) => Archiver

function xmlEscape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function paragraphXml(text: string, bold = false, italic = false, underline = false, size = 22, heading = false): string {
  const runs = text
    .split('\n')
    .map((line) => {
      const props = [
        `<w:sz w:val="${size}"/>`,
        `<w:szCs w:val="${size}"/>`,
        bold ? '<w:b/>' : '',
        italic ? '<w:i/>' : '',
        underline ? '<w:u w:val="single"/>' : ''
      ].join('')
      return `<w:r><w:rPr>${props}</w:rPr><w:t xml:space="preserve">${xmlEscape(line)}</w:t></w:r>`
    })
    .join('<w:br/>')
  return `<w:p><w:pPr><w:pStyle w:val="${heading ? 'Heading1' : 'Normal'}" />${heading ? '' : ''}</w:pPr>${runs}</w:p>`
}

export function generateDocxBuffer(lines: { text: string; bold?: boolean; heading?: boolean }[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const body = lines
      .map((l) => paragraphXml(l.text, l.bold, false, false, l.heading ? 32 : 22, l.heading))
      .join('\n')

    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`

    const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`

    const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
${body}
<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
</w:body>
</w:document>`

    const chunks: Buffer[] = []
    const archive = archiver('zip', { zlib: { level: 9 } })
    archive.on('error', reject)
    archive.on('data', (chunk: Buffer) => chunks.push(chunk))
    archive.on('end', () => resolve(Buffer.concat(chunks)))
    archive.append(contentTypes, { name: '[Content_Types].xml' })
    archive.append(rels, { name: '_rels/.rels' })
    archive.append(document, { name: 'word/document.xml' })
    archive.finalize()
  })
}

export function writeLinesAsDocx(filePath: string, lines: { text: string; bold?: boolean; heading?: boolean }[]): Promise<void> {
  return generateDocxBuffer(lines).then((buf) => fs.writeFileSync(filePath, buf))
}
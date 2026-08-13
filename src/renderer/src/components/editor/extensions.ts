import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextStyle from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import CharacterCount from '@tiptap/extension-character-count'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { createLowlight } from 'lowlight'
import { common } from 'lowlight'

import { Extension, type ChainedCommands, type RawCommands } from '@tiptap/core'

export const lowlight = createLowlight(common)

export function buildExtensions(_fontFamily: string, _fontSize: number): unknown[] {
  return [
    StarterKit.configure({
      codeBlock: false,
      heading: { levels: [1, 2, 3] }
    }),
    Underline,
    Link.configure({
      openOnClick: true,
      autolink: true,
      linkOnPaste: true,
      HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' }
    }),
    Placeholder.configure({ placeholder: 'Start writing, or use the toolbar below to add images, checklists, tables and more…' }),
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    CharacterCount,
    CodeBlockLowlight.configure({
      lowlight,
      defaultLanguage: 'plain'
    }),
    ImageExtension,
    FontFamilyExtension,
    FontSizeExtension
  ]
}

/* Custom Image extension with a shared marker — uses the Image core under the hood. */
import Image from '@tiptap/extension-image'

export const ImageExtension = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: null, parseHTML: (el) => el.getAttribute('width'), renderHTML: (attrs) => (attrs.width ? { width: attrs.width } : {}) },
      alt: { default: '', parseHTML: (el) => el.getAttribute('alt'), renderHTML: (attrs) => ({ alt: attrs.alt }) }
    }
  }
})

const FontFamilyExtension = Extension.create({
  name: 'fontFamily',
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontFamily: {
            default: null,
            parseHTML: (el) => el.style.fontFamily?.replace(/"/g, ''),
            renderHTML: (attrs) => (attrs.fontFamily ? { style: `font-family: ${attrs.fontFamily}` } : {})
          }
        }
      }
    ]
  },
  addCommands() {
    return {
      setFontFamily: (family: string) => ({ chain }: { chain: () => ChainedCommands }) =>
        chain().setMark('textStyle', { fontFamily: family }).run(),
      unsetFontFamily: () => ({ chain }: { chain: () => ChainedCommands }) =>
        chain().setMark('textStyle', { fontFamily: null }).removeEmptyTextStyle().run()
    } as unknown as Partial<RawCommands>
  }
})

const FontSizeExtension = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el) => el.style.fontSize?.replace('px', ''),
            renderHTML: (attrs) => (attrs.fontSize ? { style: `font-size: ${attrs.fontSize}px` } : {})
          }
        }
      }
    ]
  },
  addCommands() {
    return {
      setFontSize: (size: number) => ({ chain }: { chain: () => ChainedCommands }) =>
        chain().setMark('textStyle', { fontSize: String(size) }).run(),
      unsetFontSize: () => ({ chain }: { chain: () => ChainedCommands }) =>
        chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run()
    } as unknown as Partial<RawCommands>
  }
})

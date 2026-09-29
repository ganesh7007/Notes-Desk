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
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { RendererImageExtension } from './RendererImage'

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
    RendererImageExtension,
    TrailingParagraphExtension,
    FontFamilyExtension,
    FontSizeExtension
  ]
}

/**
 * Keeps an empty paragraph at the end of a document whose last block is a void
 * node (an image or a divider).
 *
 * Without it, a note that ends with an image has nowhere to put the caret — the
 * image cannot hold text — so inserting an image and then typing silently did
 * nothing. With this plugin there is always a line to type on after the image.
 */
export const TrailingParagraphExtension = Extension.create({
  name: 'trailingParagraph',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('trailingParagraph'),
        appendTransaction: (transactions, _oldState, newState) => {
          if (!transactions.some((tr) => tr.docChanged)) return null
          const last = newState.doc.lastChild
          // Text blocks (paragraph, heading, code block…) can already hold the caret.
          if (!last || !last.isLeaf || last.isTextblock) return null
          const paragraph = newState.schema.nodes.paragraph
          if (!paragraph) return null
          const tr = newState.tr.insert(newState.doc.content.size, paragraph.create())
          tr.setMeta('addToHistory', false)
          return tr
        }
      })
    ]
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

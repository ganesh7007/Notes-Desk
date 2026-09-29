import Image from '@tiptap/extension-image'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ImageNodeView } from './ImageNodeView'

/**
 * The app's image node.
 *
 * It is the only image extension the editor uses: it registers the editable
 * attributes the node view writes (width, alt, rotation, flips) *and* the React
 * node view. Keeping both in one extension means resizing/rotating an image
 * survives a reload instead of being silently dropped.
 */
export const RendererImageExtension = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => el.getAttribute('width'),
        renderHTML: (attrs) => (attrs.width ? { width: attrs.width } : {})
      },
      alt: {
        default: '',
        parseHTML: (el) => el.getAttribute('alt'),
        renderHTML: (attrs) => ({ alt: attrs.alt })
      },
      rotate: {
        default: 0,
        parseHTML: (el) => Number(el.getAttribute('data-rotate') ?? 0),
        renderHTML: (attrs) => (attrs.rotate ? { 'data-rotate': attrs.rotate } : {})
      },
      flipX: {
        default: false,
        parseHTML: (el) => el.getAttribute('data-flip-x') === 'true',
        renderHTML: (attrs) => (attrs.flipX ? { 'data-flip-x': 'true' } : {})
      },
      flipY: {
        default: false,
        parseHTML: (el) => el.getAttribute('data-flip-y') === 'true',
        renderHTML: (attrs) => (attrs.flipY ? { 'data-flip-y': 'true' } : {})
      }
    }
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView)
  }
})

import Image from '@tiptap/extension-image'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ImageNodeView } from './ImageNodeView'

export const RendererImageExtension = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView)
  }
})

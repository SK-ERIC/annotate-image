import { type PropType, defineComponent, h } from 'vue'
import type { AnnotatePath, PartialAnnotateOptions } from '@annotate-image/core'

export default defineComponent({
  name: 'AnnotateImage',
  props: {
    options: {
      type: Object as PropType<PartialAnnotateOptions>,
      default: () => {}
    },
    modelValue: {
      type: Array as PropType<AnnotatePath[]>,
      default: () => []
    }
  },
  setup() {},
  render() {
    return h('div', null, this.$slots.default)
  }
})

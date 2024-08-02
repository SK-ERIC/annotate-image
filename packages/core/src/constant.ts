import type {
  AnnotateEvents,
  ClickPathTypes,
  DragPathTypes,
  PublicMethodNames
} from './types'

export const PUBLIC_METHODS: PublicMethodNames[] = [
  'mount',
  'resetOptions',
  'resetCanvas',
  'scale',
  'invert',
  'setValue',
  'clearCanvas',
  'redrawCanvas',
  'exportImageFromCanvas',
  'customDrawing',
  'choosePath',
  'destroy'
]

export const EVENT_NAMES: AnnotateEvents[] = [
  'onReady',
  'onInput',
  'onChange',
  'onChoose',
  'onResize',
  'onDrawStart',
  'onDrawEnd',
  'onModifyStart'
]

export const CLICK_PATH_TYPES: ClickPathTypes[] = ['point', 'line', 'polygon']

export const DRAG_PATH_TYPES: DragPathTypes[] = ['rect', 'circle']

export const ROOT_CANVAS_STYLE = {
  position: 'absolute',
  width: '100%',
  height: '100%',
  left: 0,
  top: 0,
  overflow: 'hidden'
}

import { onBeforeUnmount, watch, type Ref } from 'vue'
import Sortable from 'sortablejs'

interface Options {
  // 拖完後回傳舊位置、新位置（只算可拖曳的列），由呼叫端調整陣列並存檔
  onMove: (from: number, to: number) => void
  // 回傳 false 就不能放到那一列旁邊（例如療程只能在同一分類內移動）
  canDrop?: (dragged: HTMLElement, related: HTMLElement) => boolean
  disabled?: Ref<boolean>
}

// 拖曳排序：可拖曳的列加 data-sortable，拖曳把手加 data-drag-handle
// Sortable 只負責手勢；放開後把它移動的節點放回原位，畫面交給 Vue 依新陣列重新渲染
export const useSortable = (el: Ref<HTMLElement | null>, options: Options) => {
  let sortable: Sortable | null = null

  const destroy = () => {
    sortable?.destroy()
    sortable = null
  }

  watch(
    el,
    (container) => {
      destroy()
      if (!container) return
      sortable = Sortable.create(container, {
        draggable: '[data-sortable]',
        handle: '[data-drag-handle]',
        animation: 150,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        disabled: options.disabled?.value,
        onMove: (evt) => options.canDrop?.(evt.dragged, evt.related) ?? true,
        onEnd: ({ item, from, oldIndex, oldDraggableIndex, newDraggableIndex }) => {
          if (oldDraggableIndex === undefined || newDraggableIndex === undefined) return
          if (oldDraggableIndex === newDraggableIndex) return
          from.removeChild(item)
          from.insertBefore(item, from.children[oldIndex ?? 0] ?? null)
          options.onMove(oldDraggableIndex, newDraggableIndex)
        }
      })
    },
    { flush: 'post', immediate: true }
  )

  if (options.disabled) watch(options.disabled, (disabled) => sortable?.option('disabled', disabled))

  onBeforeUnmount(destroy)
}

// 回傳搬移後的新陣列，不改動原本的
export const moveItem = <T>(list: T[], from: number, to: number) => {
  const next = [...list]
  next.splice(to, 0, ...next.splice(from, 1))
  return next
}

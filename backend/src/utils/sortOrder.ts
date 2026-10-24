import { Request, Response } from 'express'
import { execute } from '../models/db'
import { fail, serverError } from './http'
import { logAction } from './adminLog'

// 可以拖曳排序的資料表（白名單，表名會直接放進 SQL）
type SortableTable = 'service_categories' | 'services' | 'announcements'

// 依拖曳後的 id 順序，把 sort_order 依序改成 1、2、3…
const saveOrder = async (table: SortableTable, ids: unknown) => {
  if (!Array.isArray(ids) || !ids.length || ids.length > 500 || !ids.every(Number.isInteger)) return false
  const placeholders = ids.map(() => '?').join(', ')
  await execute(
    `UPDATE ${table} SET sort_order = CASE id ${ids.map(() => 'WHEN ? THEN ?').join(' ')} END
     WHERE id IN (${placeholders})`,
    [...ids.flatMap((id, i) => [id, i + 1]), ...ids]
  )
  return true
}

export const reorderHandler =
  (table: SortableTable, label: string) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!(await saveOrder(table, req.body.ids))) return fail(res, 400, '排序資料不正確')
      await logAction(req, `調整${label}排序`)
      res.json({ success: true, message: '排序已更新' })
    } catch (error) {
      serverError(res, `Reorder ${table} error`, error)
    }
  }

// 編輯時沒帶排序就維持原本的位置
export const optionalSortOrder = (value: unknown) =>
  value === undefined || value === null || value === '' ? null : Number(value) || 0

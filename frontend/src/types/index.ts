// 服務類型
export interface Service {
  id: number
  category_id: number
  name: string
  description: string
  price: number
  duration: number
  image_url?: string
  category_name?: string
  sort_order?: number
  is_active?: boolean
  average_rating?: number | null
  review_count?: number
}

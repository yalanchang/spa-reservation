// 每個服務對應一張照片，後台有上傳圖片（image_url）時以上傳的為主
const SERVICE_IMAGES: Record<string, string> = {
  基礎臉部護理: 'facial-basic',
  進階臉部護理: 'facial-advanced',
  精油按摩: 'oil-massage',
  熱石按摩: 'hot-stone',
  身體去角質: 'body-scrub',
  岩盤浴: 'bedrock-bath',
  手部保養: 'hand-care',
  足部保養: 'foot-care'
}

export const serviceImage = (service: { name?: string; image_url?: string | null }) =>
  service.image_url || `/images/services/${SERVICE_IMAGES[service.name || ''] || 'facial-basic'}.jpg`

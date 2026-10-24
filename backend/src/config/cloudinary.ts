// 部署之後的雲端圖片儲存地址，使用 Cloudinary 來管理圖片上傳和存儲。這樣可以確保圖片的安全性和可擴展性，同時減少伺服器的負擔。
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary'
import multer from 'multer'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// 先把圖片放在記憶體，檢查格式與大小後再由程式上傳到 Cloudinary
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) callback(null, true)
    // 訊息含 format not allowed，路由會轉成「不支援這種圖片格式」
    else callback(new Error(`Image file format ${file.mimetype} not allowed`))
  }
})

// 用到時才讀環境變數，避免模組載入時 .env 還沒讀進來
const configure = () =>
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  })

export const uploadAvatarImage = (buffer: Buffer): Promise<UploadApiResponse> => {
  configure()
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'beauty-spa/avatars',
        transformation: [{ width: 500, height: 500, crop: 'limit' }]
      },
      (error, result) => (error || !result ? reject(error || new Error('Upload failed')) : resolve(result))
    )
    stream.end(buffer)
  })
}

export const deleteImage = (publicId: string) => {
  configure()
  return cloudinary.uploader.destroy(publicId)
}

// 從 .../upload/v123/beauty-spa/avatars/abc.jpg 取出 public_id「beauty-spa/avatars/abc」再刪除
// 不是 Cloudinary 的網址（例如 Google 大頭貼）就略過；刪不掉只記錄，不影響主要流程
export const deleteImageByUrl = async (url?: string | null) => {
  if (!url?.includes('res.cloudinary.com')) return
  const publicId = url
    .split('/upload/')[1]
    ?.replace(/^v\d+\//, '')
    .replace(/\.[^/.]+$/, '')
  if (!publicId) return
  await deleteImage(publicId).catch((err) => console.error('Delete Cloudinary image error:', err))
}

export default cloudinary

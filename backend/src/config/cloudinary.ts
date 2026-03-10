//部署之後的雲端圖片儲存地址，使用 Cloudinary 來管理圖片上傳和存儲。這樣可以確保圖片的安全性和可擴展性，同時減少伺服器的負擔。
import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import multer from 'multer'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!
})

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'beauty-spa/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }]
  } as any
})

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
})

export default cloudinary
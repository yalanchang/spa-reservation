# SPA 預約系統 - Spa Reservation System

一個美容院 / SPA 中心的線上預約系統，支援 Google 和 LINE 第三方登入，提供完整的預約管理流程。

---

## 專案簡介

本系統提供美容院客戶線上預約服務，主要功能包含：

- 瀏覽服務項目與詳細介紹
- 線上預約時段（三步驟流程）
- 選擇美容師與可預約時段
- 第三方登入（Google、LINE OAuth 2.0）
- 會員個人資料管理與頭像上傳
- 預約紀錄查詢

---

## 🛠 技術棧

### 後端 (Backend)
| 項目 | 技術 |
|------|------|
| Runtime | Node.js |
| Framework | Express.js |
| 語言 | TypeScript |
| 資料庫 | MySQL |
| 認證 | JWT、OAuth 2.0（Google、LINE）|
| 圖片儲存 | Cloudinary |
| 其他套件 | bcryptjs、axios、multer、cors |

### 前端 (Frontend)
| 項目 | 技術 |
|------|------|
| Framework | Vue 3 + Vite |
| 語言 | TypeScript |
| 狀態管理 | Pinia |
| 樣式 | TailwindCSS |
| HTTP 客戶端 | Axios |
| 路由 | Vue Router |

---

## 部署架構

```
前端 (Vue + Vite)  →  Vercel
後端 (Express)     →  Render
資料庫 (MySQL)     →  Aiven
圖片儲存           →  Cloudinary
```

---

## 本地開發環境設定

### 前置需求
- Node.js v18 以上
- MySQL（XAMPP 或本地安裝）

### 安裝步驟

**1. Clone 專案**
```bash
git clone https://github.com/your-username/spa-reservation.git
cd spa-reservation
```

**2. 後端設定**
```bash
cd backend
npm install
```

建立 `backend/.env`：
```env
PORT=3001
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=spa_reservation

JWT_SECRET=your_jwt_secret

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/oauth/google/callback

LINE_CHANNEL_ID=your_line_channel_id
LINE_CHANNEL_SECRET=your_line_channel_secret
LINE_CALLBACK_URL=http://localhost:3001/api/oauth/line/callback

FRONTEND_URL=http://localhost:3000

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

啟動後端：
```bash
npm run dev
```

**3. 前端設定**
```bash
cd frontend
npm install
```

建立 `frontend/.env.development`：
```env
VITE_API_URL=http://localhost:3001/api
```

啟動前端：
```bash
npm run dev
```

前端預設運行在 `http://localhost:3000`

---

## 部署說明

### 後端部署（Render）
1. 將專案推上 GitHub
2. 至 [render.com](https://render.com) 建立 Web Service
3. Root Directory 設為 `backend`
4. Build Command：`npm install && npm run build`
5. Start Command：`npm run start`
6. 設定環境變數（同上述 `.env`，DB 改為 Aiven 連線資訊）

### 資料庫（Aiven MySQL）
1. 至 [aiven.io](https://aiven.io) 建立免費 MySQL 服務
2. 使用 TablePlus 連線並匯入本地資料庫的 `.sql` 備份檔

### 圖片儲存（Cloudinary）
1. 至 [cloudinary.com](https://cloudinary.com) 註冊免費帳號
2. 取得 Cloud Name、API Key、API Secret 填入環境變數

### 前端部署（Vercel）
1. 至 [vercel.com](https://vercel.com) 建立新專案
2. Root Directory 設為 `frontend`
3. Framework 選 Vite
4. 設定環境變數：
   ```
   VITE_API_URL=https://your-backend.onrender.com/api
   ```

---

## 專案結構

```
spa-reservation/
├── backend/
│   ├── src/
│   │   ├── config/        # 資料庫、Cloudinary 設定
│   │   ├── controllers/   # 業務邏輯
│   │   ├── middleware/    # 認證中間件
│   │   ├── models/        # 資料庫查詢
│   │   ├── routes/        # API 路由
│   │   ├── utils/         # JWT 工具
│   │   └── app.ts         # 主程式
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/
    ├── src/
    │   ├── api/           # Axios 設定
    │   ├── components/    # 共用元件
    │   ├── pages/         # 頁面
    │   ├── router/        # 路由設定
    │   ├── stores/        # Pinia 狀態管理
    │   └── main.ts        # 入口
    ├── vercel.json
    └── package.json
```

---

##  API 路由總覽

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/auth/login` | 登入 |
| POST | `/api/auth/register` | 註冊 |
| GET | `/api/auth/profile` | 取得個人資料 |
| PUT | `/api/auth/profile` | 更新個人資料 |
| POST | `/api/auth/avatar` | 上傳頭像 |
| GET | `/api/oauth/google` | Google 登入 |
| GET | `/api/oauth/line` | LINE 登入 |
| GET | `/api/services` | 取得服務列表 |
| GET | `/api/services/:id` | 取得服務詳情 |
| GET | `/api/staff` | 取得美容師列表 |
| GET | `/api/appointments/my` | 取得我的預約 |
| POST | `/api/appointments` | 建立預約 |

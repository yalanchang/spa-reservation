# SPA 預約系統 - Spa Reservation System

一個美容院/SPA 中心的線上預約系統，支援 Google 和 LINE 登入。

## 專案簡介

本系統提供美容院客戶線上預約服務，包含：
- 使用者可以瀏覽服務項目
- 線上預約時段
- 第三方登入（Google、LINE）

## 技術棧

### 後端 (Backend)
- **Runtime**: Node.js
- **Framework**: Express.js
- **語言**: TypeScript
- **資料庫**: MySQL/MariaDB
- **ORM**: 自定義查詢 (mysql2)
- **認證**: JWT, OAuth 2.0 (Google, LINE)
- **其他**: bcryptjs, axios

### 前端 (Frontend)
- **Framework**: React.js
- **語言**: TypeScript
- **狀態管理**: Context API / Redux
- **樣式**: CSS Modules / TailwindCSS
- **HTTP 客戶端**: Axios


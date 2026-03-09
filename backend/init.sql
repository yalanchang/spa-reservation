CREATE DATABASE IF NOT EXISTS beauty_booking
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE beauty_booking;
DESCRIBE users;

-- 用戶表
CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    avatar VARCHAR(500),
    role ENUM('admin', 'staff', 'customer') DEFAULT 'customer',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
);



-- 服務分類表
CREATE TABLE service_categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 服務項目表
CREATE TABLE services (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id INT UNSIGNED NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration INT NOT NULL COMMENT '分鐘',
    image_url VARCHAR(500),
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES service_categories(id),
    INDEX idx_category (category_id),
    INDEX idx_is_active (is_active),
    FULLTEXT idx_search (name, description)
);

-- 美容師表
CREATE TABLE staff (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED UNIQUE,
    name VARCHAR(100) NOT NULL,
    title VARCHAR(100),
    bio TEXT,
    avatar VARCHAR(500),
    years_experience INT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_is_active (is_active)
);

CREATE TABLE staff_services (
    staff_id INT UNSIGNED NOT NULL,
    service_id INT UNSIGNED NOT NULL,
    price_adjustment DECIMAL(10,2) DEFAULT 0 COMMENT '價格調整',
    is_active BOOLEAN DEFAULT true,
    PRIMARY KEY (staff_id, service_id),
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

CREATE TABLE appointments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    appointment_no VARCHAR(30) UNIQUE NOT NULL,
    user_id INT UNSIGNED,
    staff_id INT UNSIGNED NOT NULL,
    service_id INT UNSIGNED NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'confirmed', 'completed', 'cancelled', 'no_show') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (staff_id) REFERENCES staff(id),
    FOREIGN KEY (service_id) REFERENCES services(id),
    INDEX idx_date (appointment_date),
    INDEX idx_status (status),
    INDEX idx_appointment_no (appointment_no)
);
-- 美容師工作時間表
CREATE TABLE staff_schedule (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    staff_id INT UNSIGNED NOT NULL,
    day_of_week TINYINT NOT NULL COMMENT '0-6, 0=週日',
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_working BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    UNIQUE KEY unique_staff_day (staff_id, day_of_week)
);

-- 休假表
CREATE TABLE staff_leaves (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    staff_id INT UNSIGNED NOT NULL,
    leave_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    reason VARCHAR(255),
    is_full_day BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    INDEX idx_staff_date (staff_id, leave_date)
);

-- 評價表
CREATE TABLE reviews (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    appointment_id INT UNSIGNED UNIQUE NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    staff_id INT UNSIGNED NOT NULL,
    service_id INT UNSIGNED NOT NULL,
    rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    staff_reply TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (staff_id) REFERENCES staff(id),
    FOREIGN KEY (service_id) REFERENCES services(id),
    INDEX idx_staff_rating (staff_id, rating),
    INDEX idx_service_rating (service_id, rating)
);

-- 插入服務分類
INSERT INTO service_categories (name, description, sort_order) VALUES
('臉部護理', '專業臉部保養服務', 1),
('身體按摩', '舒緩放鬆按摩課程', 2),
('美體課程', '雕塑身材美體療程', 3),
('手足護理', '手足保養與美甲', 4);

-- 插入服務項目
INSERT INTO services (category_id, name, description, price, duration, sort_order) VALUES
(1, '基礎臉部護理', '深層清潔、去角質、保濕導入', 1500, 60, 1),
(1, '進階臉部護理', '含抗老精華、超聲波導入', 2500, 90, 2),
(2, '精油按摩', '全身放鬆精油按摩', 1800, 60, 1),
(2, '熱石按摩', '結合熱石的能量按摩', 2200, 90, 2),
(3, '身體去角質', '溫和去除老廢角質', 2000, 60, 1),
(3, '岩盤浴', '促進新陳代謝、排毒', 1200, 45, 2),
(4, '手部保養', '手部去角質、保濕', 800, 30, 1),
(4, '足部保養', '足浴、去角質、按摩', 1000, 45, 2);

-- 插入美容師
INSERT INTO staff (name, title, years_experience, bio) VALUES
('林美玲', '資深美容師', 8, '專長：臉部護理、淋巴按摩'),
('張雅芳', '美容顧問', 5, '專長：精油按摩、體態雕塑'),
('王心怡', '美體師', 6, '專長：熱石療法、去角質課程'),
('李靜儀', '手足護理師', 4, '專長：美甲、手足保養');

-- 建立測試預約
INSERT INTO appointments (appointment_no, staff_id, service_id, customer_name, customer_phone, appointment_date, start_time, end_time, duration, price, status) VALUES
('APT20240307001', 1, 1, '陳小姐', '0912345678', CURDATE(), '10:00', '11:00', 60, 1500, 'confirmed'),
('APT20240307002', 2, 3, '林小姐', '0923456789', CURDATE(), '14:00', '15:00', 60, 1800, 'pending'),
('APT20240308001', 3, 5, '王小姐', '0934567890', DATE_ADD(CURDATE(), INTERVAL 1 DAY), '11:00', '12:00', 60, 2000, 'confirmed');

-- 先產生新的 {密碼：password}
UPDATE users 
SET password = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' 
WHERE email = 'admin@example.com';

ALTER TABLE users ADD COLUMN google_id VARCHAR(100) DEFAULT NULL;
ALTER TABLE users ADD COLUMN line_id VARCHAR(100) DEFAULT NULL;


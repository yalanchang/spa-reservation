-- 後台模組：操作紀錄、公休日、跑馬燈公告、優惠碼、會員備註、預約來源與折扣、美容師預設排班
-- 可重複執行：資料表或欄位已存在就跳過

CREATE TABLE IF NOT EXISTS admin_logs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  action VARCHAR(50) NOT NULL,
  target VARCHAR(100) NULL,
  detail VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS store_closures (
  closure_date DATE PRIMARY KEY,
  reason VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS announcements (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  content VARCHAR(100) NOT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coupons (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  discount_type ENUM('amount', 'percent') NOT NULL DEFAULT 'amount',
  discount_value INT UNSIGNED NOT NULL,
  min_spend INT UNSIGNED NOT NULL DEFAULT 0,
  start_date DATE NULL,
  end_date DATE NULL,
  usage_limit INT UNSIGNED NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'admin_note') = 0,
  'ALTER TABLE users ADD COLUMN admin_note TEXT NULL',
  'SELECT ''users.admin_note 已存在，略過'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointments' AND COLUMN_NAME = 'source') = 0,
  'ALTER TABLE appointments ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT ''online'' AFTER status_notice',
  'SELECT ''appointments.source 已存在，略過'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointments' AND COLUMN_NAME = 'coupon_id') = 0,
  'ALTER TABLE appointments ADD COLUMN coupon_id INT UNSIGNED NULL AFTER price, ADD COLUMN discount DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER coupon_id',
  'SELECT ''appointments.coupon_id 已存在，略過'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 還沒有排班的美容師：週一到週五 10:00–20:00、週末 10:00–18:00，每人輪休一天
INSERT IGNORE INTO staff_schedule (staff_id, day_of_week, start_time, end_time, is_working)
SELECT s.id, d.day,
       '10:00',
       IF(d.day IN (0, 6), '18:00', '20:00'),
       d.day <> (s.id % 7)
FROM staff s
CROSS JOIN (SELECT 0 AS day UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6) d
WHERE NOT EXISTS (SELECT 1 FROM staff_schedule ss WHERE ss.staff_id = s.id);

-- 預設公告（之後在後台改）
INSERT INTO announcements (content, sort_order)
SELECT * FROM (
  SELECT '新會員首次預約享 9 折' AS content, 1 AS sort_order UNION ALL
  SELECT '生日當月任選療程 85 折', 2 UNION ALL
  SELECT '平日 14:00 前預約精油按摩折 NT$200', 3 UNION ALL
  SELECT '金卡會員全年療程 9 折', 4 UNION ALL
  SELECT '推薦好友完成療程，雙方各得 NT$200 折扣', 5
) seed
WHERE NOT EXISTS (SELECT 1 FROM announcements);

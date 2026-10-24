-- 基本資料擴充：地址、緊急聯絡人、電子發票、優惠通知
-- 可重複執行：欄位已存在就跳過

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'city') = 0,
  'ALTER TABLE users ADD COLUMN city VARCHAR(10) NULL AFTER phone',
  'SELECT ''users.city 已存在，略過'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'address') = 0,
  'ALTER TABLE users ADD COLUMN address VARCHAR(200) NULL AFTER city',
  'SELECT ''users.address 已存在，略過'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'emergency_name') = 0,
  'ALTER TABLE users ADD COLUMN emergency_name VARCHAR(50) NULL AFTER address',
  'SELECT ''users.emergency_name 已存在，略過'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'emergency_phone') = 0,
  'ALTER TABLE users ADD COLUMN emergency_phone VARCHAR(20) NULL AFTER emergency_name',
  'SELECT ''users.emergency_phone 已存在，略過'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'invoice_carrier') = 0,
  'ALTER TABLE users ADD COLUMN invoice_carrier VARCHAR(8) NULL AFTER care_notes',
  'SELECT ''users.invoice_carrier 已存在，略過'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'tax_id') = 0,
  'ALTER TABLE users ADD COLUMN tax_id VARCHAR(8) NULL AFTER invoice_carrier',
  'SELECT ''users.tax_id 已存在，略過'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'marketing_opt_in') = 0,
  'ALTER TABLE users ADD COLUMN marketing_opt_in TINYINT(1) NOT NULL DEFAULT 0 AFTER tax_id',
  'SELECT ''users.marketing_opt_in 已存在，略過'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

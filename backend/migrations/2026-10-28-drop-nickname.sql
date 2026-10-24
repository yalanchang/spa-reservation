-- 拿掉暱稱欄位
-- 可重複執行：欄位不存在就跳過

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'nickname') > 0,
  'ALTER TABLE users DROP COLUMN nickname',
  'SELECT ''users.nickname 不存在，略過'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

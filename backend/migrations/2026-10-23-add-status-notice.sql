
SET @has_column = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointments' AND COLUMN_NAME = 'status_notice'
);

SET @sql = IF(
  @has_column = 0,
  'ALTER TABLE appointments ADD COLUMN status_notice VARCHAR(20) NULL AFTER status',
  'SELECT ''status_notice 已存在，略過'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;



SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'birthday') = 0,
  'ALTER TABLE users ADD COLUMN birthday DATE NULL AFTER phone',
  'SELECT ''users.birthday 已存在，略過'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'gender') = 0,
  'ALTER TABLE users ADD COLUMN gender VARCHAR(10) NULL AFTER birthday',
  'SELECT ''users.gender 已存在，略過'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'preferred_staff_id') = 0,
  'ALTER TABLE users ADD COLUMN preferred_staff_id INT UNSIGNED NULL AFTER gender',
  'SELECT ''users.preferred_staff_id 已存在，略過'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'skin_type') = 0,
  'ALTER TABLE users ADD COLUMN skin_type VARCHAR(20) NULL AFTER preferred_staff_id',
  'SELECT ''users.skin_type 已存在，略過'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'care_notes') = 0,
  'ALTER TABLE users ADD COLUMN care_notes VARCHAR(500) NULL AFTER skin_type',
  'SELECT ''users.care_notes 已存在，略過'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'verification_codes' AND COLUMN_NAME = 'payload') = 0,
  'ALTER TABLE verification_codes ADD COLUMN payload VARCHAR(255) NULL AFTER code_hash',
  'SELECT ''verification_codes.payload 已存在，略過'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

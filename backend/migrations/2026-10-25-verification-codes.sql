-- 驗證碼：註冊驗證信箱、忘記密碼、後台登入第二步驟共用
-- 1. users 加上 email_verified（既有帳號預設為已驗證；前台註冊的新帳號由程式設為 0）
SET @has_column = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'email_verified'
);
SET @sql = IF(
  @has_column = 0,
  'ALTER TABLE users ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 1 AFTER is_active',
  'SELECT ''email_verified 已存在，略過'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. 驗證碼只存雜湊值，10 分鐘內有效，最多試 5 次
CREATE TABLE IF NOT EXISTS verification_codes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    purpose VARCHAR(20) NOT NULL,
    code_hash CHAR(64) NOT NULL,
    attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_purpose (user_id, purpose)
);

-- 3. 忘記密碼改用驗證碼，舊的重設連結資料表不再使用
DROP TABLE IF EXISTS password_resets;

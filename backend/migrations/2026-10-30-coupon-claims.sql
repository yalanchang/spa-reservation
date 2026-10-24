-- 優惠券領取：每張券有領取資格，會員領到自己的券夾
-- 可重複執行

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'coupons' AND COLUMN_NAME = 'audience') = 0,
  'ALTER TABLE coupons ADD COLUMN audience VARCHAR(20) NOT NULL DEFAULT ''all'' AFTER usage_limit, ADD COLUMN is_claimable BOOLEAN NOT NULL DEFAULT true AFTER audience, ADD COLUMN per_user_limit INT UNSIGNED NOT NULL DEFAULT 1 AFTER is_claimable, ADD COLUMN description VARCHAR(200) NULL AFTER name',
  'SELECT ''coupons.audience 已存在，略過'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS user_coupons (
  user_id INT UNSIGNED NOT NULL,
  coupon_id INT UNSIGNED NOT NULL,
  claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, coupon_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE
);

-- 範例優惠券（還沒有任何優惠券時才建立，之後在後台調整）
INSERT INTO coupons (code, name, description, discount_type, discount_value, min_spend, audience, is_claimable, per_user_limit)
SELECT * FROM (
  SELECT 'WELCOME90' AS code, '新會員首次預約 9 折' AS name, '第一次預約就能用' AS description, 'percent' AS discount_type, 10 AS discount_value, 0 AS min_spend, 'new' AS audience, 1 AS is_claimable, 1 AS per_user_limit UNION ALL
  SELECT 'BDAY200', '生日禮 折 NT$200', '生日當月任選療程', 'amount', 200, 1000, 'birthday', 1, 1 UNION ALL
  SELECT 'SILVER150', '銀卡會員 折 NT$150', '累積消費滿 NT$10,000 的會員', 'amount', 150, 1500, 'silver', 1, 3 UNION ALL
  SELECT 'GOLD85', '金卡會員 85 折', '累積消費滿 NT$30,000 的會員', 'percent', 15, 0, 'gold', 1, 5 UNION ALL
  SELECT 'WEEKDAY100', '平日優惠 折 NT$100', '全體會員皆可領取', 'amount', 100, 800, 'all', 1, 2
) seed
WHERE NOT EXISTS (SELECT 1 FROM coupons);

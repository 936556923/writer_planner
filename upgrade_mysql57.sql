-- ============================================================================
-- Writer Planner 订单模块升级 SQL（MySQL 5.7 兼容）
-- 执行前请先备份数据库：mysqldump -u root -p writer_planner > backup_before_upgrade.sql
-- ============================================================================

-- 1. 扩展 settleStatus 枚举，增加 '待结算' 和 '异常核实中'
ALTER TABLE `orders`
  MODIFY COLUMN `settleStatus` ENUM('已结算','未结算','待结算','异常核实中')
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '未结算';

-- 2. 扩展 writingStatus 枚举，增加 '待开始'、'进行中'、'修改中'
ALTER TABLE `orders`
  MODIFY COLUMN `writingStatus` ENUM('初稿待提交','修改','已完成','待开始','进行中','修改中')
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '待开始';

-- 3. 扩展 submissionStatus 枚举，增加 '收货待提交'
ALTER TABLE `orders`
  MODIFY COLUMN `submissionStatus` ENUM('已提交','未提交','待提交','收货待提交')
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '未提交';

-- 4. 新增 settleFeedback 字段（结算异常反馈信息）
ALTER TABLE `orders`
  ADD COLUMN `settleFeedback` VARCHAR(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT ''
  AFTER `settleStatus`;

-- ============================================================================
-- 历史数据迁移（可选，根据现有数据情况执行）
-- ============================================================================

-- 5. 将旧的 writingStatus='初稿待提交' 且 status='待开始' 的订单迁移为新状态
UPDATE `orders` SET `writingStatus` = '待开始'
  WHERE `writingStatus` = '初稿待提交' AND `status` = '待开始';

-- 6. 将旧的 writingStatus='初稿待提交' 且 status='进行中' 的订单迁移
UPDATE `orders` SET `writingStatus` = '进行中'
  WHERE `writingStatus` = '初稿待提交' AND `status` = '进行中';

-- 7. 将 status='已结算' 的订单同步三维度状态
UPDATE `orders` SET
  `writingStatus` = '已完成',
  `submissionStatus` = '已提交',
  `settleStatus` = '已结算'
  WHERE `status` = '已结算';

-- 8. 将 status='待结算' 的订单同步三维度状态
UPDATE `orders` SET
  `writingStatus` = '已完成',
  `submissionStatus` = '已提交',
  `settleStatus` = '待结算'
  WHERE `status` = '待结算';

-- 9. 将 status='已完成' 且 settleStatus='未结算' 的订单设为待结算
UPDATE `orders` SET
  `writingStatus` = '已完成',
  `submissionStatus` = '已提交',
  `settleStatus` = '待结算'
  WHERE `status` = '已完成' AND `settleStatus` = '未结算';

-- ============================================================================
-- 验证变更结果
-- ============================================================================
-- 执行以下查询确认变更成功：
-- SHOW COLUMNS FROM orders LIKE 'settleStatus';
-- SHOW COLUMNS FROM orders LIKE 'writingStatus';
-- SHOW COLUMNS FROM orders LIKE 'submissionStatus';
-- SHOW COLUMNS FROM orders LIKE 'settleFeedback';
-- SELECT settleStatus, COUNT(*) FROM orders GROUP BY settleStatus;
-- SELECT writingStatus, COUNT(*) FROM orders GROUP BY writingStatus;
-- SELECT submissionStatus, COUNT(*) FROM orders GROUP BY submissionStatus;

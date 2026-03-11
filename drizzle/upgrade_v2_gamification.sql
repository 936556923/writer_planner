-- ============================================================================
-- Writer Planner App - V2 Gamification Upgrade SQL Migration
-- 游戏化系统升级 - 数据库迁移脚本
-- 
-- 新增功能：AI日历、四象限任务、掉落系统、助理协作
-- 执行前请备份数据库！
-- ============================================================================

-- ── 1. 日历事件表 (calendar_events) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `calendar_events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `event_type` VARCHAR(50) NOT NULL DEFAULT 'other' COMMENT 'work|fitness|skincare|meal|rest|social|other',
  `date` VARCHAR(10) NOT NULL COMMENT 'YYYY-MM-DD',
  `start_time` VARCHAR(5) COMMENT 'HH:MM',
  `end_time` VARCHAR(5) COMMENT 'HH:MM',
  `is_recurring` BOOLEAN NOT NULL DEFAULT FALSE,
  `cron_rule` VARCHAR(100) COMMENT '重复规则描述',
  `is_completed` BOOLEAN NOT NULL DEFAULT FALSE,
  `ai_generated` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_calendar_user_date` (`user_id`, `date`),
  INDEX `idx_calendar_type` (`event_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2. 四象限待办表 (todos) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `todos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `title` VARCHAR(500) NOT NULL,
  `description` TEXT,
  `quadrant` VARCHAR(30) NOT NULL DEFAULT 'neither' COMMENT 'important_urgent|important_not_urgent|urgent_not_important|neither',
  `is_completed` BOOLEAN NOT NULL DEFAULT FALSE,
  `completed_at` TIMESTAMP NULL,
  `deadline` VARCHAR(10) COMMENT 'YYYY-MM-DD',
  `priority` INT NOT NULL DEFAULT 0,
  `ai_classified` BOOLEAN NOT NULL DEFAULT FALSE,
  `coin_reward` INT DEFAULT 0 COMMENT '完成奖励金币数',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_todos_user` (`user_id`),
  INDEX `idx_todos_quadrant` (`quadrant`),
  INDEX `idx_todos_completed` (`is_completed`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 3. 物品定义表 (items) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `type` VARCHAR(30) NOT NULL DEFAULT 'equipment' COMMENT 'equipment|pet_egg|consumable',
  `rarity` VARCHAR(20) NOT NULL DEFAULT 'common' COMMENT 'common|rare|epic|legendary',
  `emoji` VARCHAR(10) DEFAULT '📦',
  `drop_rate` DECIMAL(5,4) NOT NULL DEFAULT 0.1000 COMMENT '掉落概率 0-1',
  `stat_bonus` TEXT COMMENT 'JSON格式属性加成',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_items_type` (`type`),
  INDEX `idx_items_rarity` (`rarity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 4. 用户背包表 (user_inventory) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `user_inventory` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `item_id` INT NOT NULL,
  `item_name` VARCHAR(255) NOT NULL,
  `item_type` VARCHAR(30) NOT NULL,
  `item_rarity` VARCHAR(20) NOT NULL DEFAULT 'common',
  `item_emoji` VARCHAR(10) DEFAULT '📦',
  `item_description` TEXT,
  `quantity` INT NOT NULL DEFAULT 1,
  `is_equipped` BOOLEAN NOT NULL DEFAULT FALSE,
  `obtained_from` VARCHAR(100) COMMENT '获取来源',
  `obtained_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_inventory_user` (`user_id`),
  INDEX `idx_inventory_item` (`item_id`),
  INDEX `idx_inventory_equipped` (`is_equipped`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 5. 为 orders 表添加 assistant_id 字段 ──────────────────────────────────
-- 注意：如果字段已存在，此语句会报错，可忽略
ALTER TABLE `orders` ADD COLUMN `assistant_id` INT NULL COMMENT '协助完成的助理用户ID' AFTER `user_id`;
ALTER TABLE `orders` ADD INDEX `idx_orders_assistant` (`assistant_id`);

-- ── 6. 插入默认物品数据 ─────────────────────────────────────────────────────
INSERT INTO `items` (`name`, `description`, `type`, `rarity`, `emoji`, `drop_rate`) VALUES
-- 装备类
('新手之剑', '每个冒险者的第一把武器', 'equipment', 'common', '🗡️', 0.3000),
('魔法羽毛笔', '提升写作速度的神奇笔', 'equipment', 'common', '🪶', 0.2500),
('智慧之冠', '佩戴后灵感源源不断', 'equipment', 'rare', '👑', 0.1000),
('龙鳞护甲', '传说中龙族的鳞片打造', 'equipment', 'epic', '🛡️', 0.0500),
('星辰法杖', '蕴含星辰之力的法杖', 'equipment', 'legendary', '🔮', 0.0100),
('时光沙漏', '掌控时间的神器', 'equipment', 'legendary', '⏳', 0.0080),
('灵感之戒', '灵感永不枯竭的戒指', 'equipment', 'rare', '💍', 0.0800),
('疾风之靴', '让你的效率如风般迅速', 'equipment', 'rare', '👢', 0.0900),
-- 宠物蛋类
('火焰小龙蛋', '据说里面住着一只小火龙', 'pet_egg', 'epic', '🥚', 0.0300),
('冰晶凤凰蛋', '散发着寒冷光芒的蛋', 'pet_egg', 'legendary', '🧊', 0.0050),
('森林精灵蛋', '来自精灵森林的礼物', 'pet_egg', 'rare', '🌿', 0.0600),
('星光独角兽蛋', '在月光下闪闪发光', 'pet_egg', 'epic', '🌟', 0.0200),
-- 消耗品类
('经验药水', '饮用后获得额外经验', 'consumable', 'common', '🧪', 0.2000),
('幸运饼干', '打开后会有好运降临', 'consumable', 'common', '🥠', 0.1500),
('双倍金币卷轴', '下次完成任务获得双倍金币', 'consumable', 'rare', '📜', 0.0700),
('传送卷轴', '可以瞬间到达任何地方', 'consumable', 'rare', '🌀', 0.0600);

-- ============================================================================
-- 迁移完成！请验证以下内容：
-- 1. calendar_events 表已创建
-- 2. todos 表已创建
-- 3. items 表已创建并包含默认物品
-- 4. user_inventory 表已创建
-- 5. orders 表已添加 assistant_id 字段
-- ============================================================================

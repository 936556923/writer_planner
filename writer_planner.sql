/*
 Navicat Premium Dump SQL

 Source Server         : 金羽体育测试服务器
 Source Server Type    : MySQL
 Source Server Version : 50744 (5.7.44)
 Source Host           : 122.51.105.249:3306
 Source Schema         : writer_planner

 Target Server Type    : MySQL
 Target Server Version : 50744 (5.7.44)
 File Encoding         : 65001

 Date: 11/03/2026 22:27:30
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for ai_plans
-- ----------------------------
DROP TABLE IF EXISTS `ai_plans`;
CREATE TABLE `ai_plans` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `content` text NOT NULL,
  `mode` varchar(32) DEFAULT 'daily',
  `orderCount` int(11) DEFAULT '0',
  `totalWords` int(11) DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_aiplans_user` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for announcements
-- ----------------------------
DROP TABLE IF EXISTS `announcements`;
CREATE TABLE `announcements` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(100) NOT NULL,
  `content` text NOT NULL,
  `isPinned` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ann_pinned` (`isPinned`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for assistant_authorizations
-- ----------------------------
DROP TABLE IF EXISTS `assistant_authorizations`;
CREATE TABLE `assistant_authorizations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `adminId` int(11) NOT NULL,
  `assistantId` int(11) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_auth_admin` (`adminId`),
  KEY `idx_auth_assistant` (`assistantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for character_profiles
-- ----------------------------
DROP TABLE IF EXISTS `character_profiles`;
CREATE TABLE `character_profiles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `nickname` varchar(32) DEFAULT NULL,
  `combatClass` enum('mage','warrior','rogue','archer','paladin','necromancer','owner') DEFAULT NULL,
  `lifeClass` enum('blacksmith','merchant','chef','farmer','scholar','bard','alchemist','beggar') DEFAULT NULL,
  `avatarConfig` text,
  `level` int(11) NOT NULL DEFAULT '1',
  `exp` int(11) NOT NULL DEFAULT '0',
  `tavernAction` enum('drinking','playing_lute','chatting','sleeping','arm_wrestling','reading') DEFAULT 'drinking',
  `profileSetupDone` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `userId` (`userId`),
  KEY `idx_char_user` (`userId`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for coin_grants
-- ----------------------------
DROP TABLE IF EXISTS `coin_grants`;
CREATE TABLE `coin_grants` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `grantedBy` int(11) NOT NULL,
  `recipientId` int(11) NOT NULL,
  `amount` int(11) NOT NULL,
  `note` varchar(200) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_grant_recipient` (`recipientId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for daily_goals
-- ----------------------------
DROP TABLE IF EXISTS `daily_goals`;
CREATE TABLE `daily_goals` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `date` varchar(16) NOT NULL,
  `targetWords` int(11) DEFAULT '0',
  `targetOrders` int(11) DEFAULT '0',
  `actualWords` int(11) DEFAULT '0',
  `actualOrders` int(11) DEFAULT '0',
  `note` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_goals_user_date` (`userId`,`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for daily_quests
-- ----------------------------
DROP TABLE IF EXISTS `daily_quests`;
CREATE TABLE `daily_quests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `date` varchar(10) NOT NULL,
  `storyText` text NOT NULL,
  `stage` enum('intro','choice','outcome','completed') NOT NULL DEFAULT 'intro',
  `choices` text,
  `selectedChoice` varchar(8) DEFAULT NULL,
  `outcomeText` text,
  `expReward` int(11) DEFAULT '0',
  `coinReward` int(11) DEFAULT '0',
  `rewardClaimed` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_quest_user_date` (`userId`,`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for danmaku
-- ----------------------------
DROP TABLE IF EXISTS `danmaku`;
CREATE TABLE `danmaku` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `content` varchar(100) NOT NULL,
  `color` varchar(20) DEFAULT '#ffffff',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_danmaku_user` (`userId`),
  KEY `idx_danmaku_time` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for gift_records
-- ----------------------------
DROP TABLE IF EXISTS `gift_records`;
CREATE TABLE `gift_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `senderId` int(11) NOT NULL,
  `giftType` enum('flower','cake','drumstick','crystal','magic_wand','crown') NOT NULL,
  `coinsCost` int(11) NOT NULL,
  `message` varchar(100) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_gift_sender` (`senderId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for notes
-- ----------------------------
DROP TABLE IF EXISTS `notes`;
CREATE TABLE `notes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `orderId` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `content` text NOT NULL,
  `type` enum('normal','important') NOT NULL DEFAULT 'normal',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notes_order` (`orderId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for orders
-- ----------------------------
DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `orderId` varchar(128) DEFAULT '',
  `orderNo` varchar(128) DEFAULT '',
  `clientService` varchar(128) DEFAULT '',
  `designer` varchar(128) DEFAULT '',
  `amount` varchar(64) DEFAULT '',
  `settleDate` varchar(32) DEFAULT '',
  `deadline` varchar(32) DEFAULT '',
  `title` text,
  `wordCount` int(11) DEFAULT '0',
  `status` enum('待开始','进行中','待审核','已完成','待结算','已结算') NOT NULL DEFAULT '待开始',
  `settleStatus` enum('已结算','未结算','待结算','异常核实中') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '未结算',
  `settleFeedback` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
  `writingStatus` enum('初稿待提交','修改','已完成','待开始','进行中','修改中') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '待开始',
  `submissionStatus` enum('已提交','未提交','待提交','收货待提交') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '未提交',
  `progressStatus` varchar(32) DEFAULT '',
  `priority` int(11) DEFAULT '0',
  `tags` varchar(256) DEFAULT '',
  `estimatedHours` float DEFAULT '0',
  `actualHours` float DEFAULT '0',
  `completedAt` varchar(64) DEFAULT '',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_orders_user` (`userId`),
  KEY `idx_orders_settle` (`settleStatus`),
  KEY `idx_orders_writing` (`writingStatus`),
  KEY `idx_orders_submission` (`submissionStatus`),
  KEY `idx_orders_deadline` (`deadline`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for owner_status
-- ----------------------------
DROP TABLE IF EXISTS `owner_status`;
CREATE TABLE `owner_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `status` enum('working','eating','playing_dog','slacking','dungeon','sleeping') NOT NULL DEFAULT 'working',
  `customMessage` varchar(200) DEFAULT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for payment_qr
-- ----------------------------
DROP TABLE IF EXISTS `payment_qr`;
CREATE TABLE `payment_qr` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `platform` enum('wechat','alipay') NOT NULL,
  `imageUrl` varchar(500) NOT NULL,
  `thankMessage` varchar(300) DEFAULT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for story_arcs
-- ----------------------------
DROP TABLE IF EXISTS `story_arcs`;
CREATE TABLE `story_arcs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `arcTitle` varchar(100) DEFAULT NULL,
  `historyLog` text,
  `currentChapter` int(11) NOT NULL DEFAULT '1',
  `totalDaysPlayed` int(11) NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_arc_user` (`userId`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for user_configs
-- ----------------------------
DROP TABLE IF EXISTS `user_configs`;
CREATE TABLE `user_configs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `deepseekKey` text,
  `aiModel` varchar(64) DEFAULT 'deepseek-chat',
  `wordsPerHour` int(11) DEFAULT '1500',
  `workHoursPerDay` int(11) DEFAULT '8',
  `defaultStatus` varchar(32) DEFAULT '待开始',
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `openId` varchar(64) NOT NULL,
  `name` text,
  `email` varchar(320) DEFAULT NULL,
  `loginMethod` varchar(64) DEFAULT NULL,
  `role` enum('user','admin','assistant','owner','resident') NOT NULL DEFAULT 'resident',
  `username` varchar(64) DEFAULT NULL,
  `passwordHash` varchar(256) DEFAULT NULL,
  `displayName` varchar(64) DEFAULT NULL,
  `coins` int(11) NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `openId` (`openId`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=313 DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

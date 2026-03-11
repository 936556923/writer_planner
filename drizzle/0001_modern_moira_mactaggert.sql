CREATE TABLE `ai_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`mode` varchar(32) DEFAULT 'daily',
	`orderCount` int DEFAULT 0,
	`totalWords` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `announcements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(100) NOT NULL,
	`content` text NOT NULL,
	`isPinned` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `announcements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assistant_authorizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int NOT NULL,
	`assistantId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assistant_authorizations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `character_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`nickname` varchar(32),
	`combatClass` enum('mage','warrior','rogue','archer','paladin','necromancer','owner'),
	`lifeClass` enum('blacksmith','merchant','chef','farmer','scholar','bard','alchemist','beggar'),
	`avatarConfig` text,
	`level` int NOT NULL DEFAULT 1,
	`exp` int NOT NULL DEFAULT 0,
	`tavernAction` enum('drinking','playing_lute','chatting','sleeping','arm_wrestling','reading') DEFAULT 'drinking',
	`profileSetupDone` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `character_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `character_profiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `coin_grants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`grantedBy` int NOT NULL,
	`recipientId` int NOT NULL,
	`amount` int NOT NULL,
	`note` varchar(200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coin_grants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daily_goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`date` varchar(16) NOT NULL,
	`targetWords` int DEFAULT 0,
	`targetOrders` int DEFAULT 0,
	`actualWords` int DEFAULT 0,
	`actualOrders` int DEFAULT 0,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `daily_goals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daily_quests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`storyText` text NOT NULL,
	`stage` enum('intro','choice','outcome','completed') NOT NULL DEFAULT 'intro',
	`choices` text,
	`selectedChoice` varchar(8),
	`outcomeText` text,
	`expReward` int DEFAULT 0,
	`coinReward` int DEFAULT 0,
	`rewardClaimed` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `daily_quests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `danmaku` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`content` varchar(100) NOT NULL,
	`color` varchar(20) DEFAULT '#ffffff',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `danmaku_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gift_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`senderId` int NOT NULL,
	`giftType` enum('flower','cake','drumstick','crystal','magic_wand','crown') NOT NULL,
	`coinsCost` int NOT NULL,
	`message` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gift_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`type` enum('normal','important') NOT NULL DEFAULT 'normal',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`orderId` varchar(128) DEFAULT '',
	`orderNo` varchar(128) DEFAULT '',
	`clientService` varchar(128) DEFAULT '',
	`designer` varchar(128) DEFAULT '',
	`amount` varchar(64) DEFAULT '',
	`settleDate` varchar(32) DEFAULT '',
	`deadline` varchar(32) DEFAULT '',
	`title` text,
	`wordCount` int DEFAULT 0,
	`status` enum('待开始','进行中','待审核','已完成','待结算','已结算') NOT NULL DEFAULT '待开始',
	`settleStatus` varchar(32) DEFAULT '',
	`progressStatus` varchar(32) DEFAULT '',
	`priority` int DEFAULT 0,
	`tags` varchar(256) DEFAULT '',
	`estimatedHours` float DEFAULT 0,
	`actualHours` float DEFAULT 0,
	`completedAt` varchar(64) DEFAULT '',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `owner_status` (
	`id` int AUTO_INCREMENT NOT NULL,
	`status` enum('working','eating','playing_dog','slacking','dungeon','sleeping') NOT NULL DEFAULT 'working',
	`customMessage` varchar(200),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `owner_status_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_qr` (
	`id` int AUTO_INCREMENT NOT NULL,
	`platform` enum('wechat','alipay') NOT NULL,
	`imageUrl` varchar(500) NOT NULL,
	`thankMessage` varchar(300),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_qr_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `story_arcs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`arcTitle` varchar(100),
	`historyLog` text,
	`currentChapter` int NOT NULL DEFAULT 1,
	`totalDaysPlayed` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `story_arcs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`deepseekKey` text,
	`aiModel` varchar(64) DEFAULT 'deepseek-chat',
	`wordsPerHour` int DEFAULT 1500,
	`workHoursPerDay` int DEFAULT 8,
	`defaultStatus` varchar(32) DEFAULT '待开始',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_configs_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_configs_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','assistant','owner','resident') NOT NULL DEFAULT 'resident';--> statement-breakpoint
ALTER TABLE `users` ADD `username` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(256);--> statement-breakpoint
ALTER TABLE `users` ADD `displayName` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `coins` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_username_unique` UNIQUE(`username`);--> statement-breakpoint
CREATE INDEX `idx_aiplans_user` ON `ai_plans` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_ann_pinned` ON `announcements` (`isPinned`);--> statement-breakpoint
CREATE INDEX `idx_auth_admin` ON `assistant_authorizations` (`adminId`);--> statement-breakpoint
CREATE INDEX `idx_auth_assistant` ON `assistant_authorizations` (`assistantId`);--> statement-breakpoint
CREATE INDEX `idx_char_user` ON `character_profiles` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_grant_recipient` ON `coin_grants` (`recipientId`);--> statement-breakpoint
CREATE INDEX `idx_goals_user_date` ON `daily_goals` (`userId`,`date`);--> statement-breakpoint
CREATE INDEX `idx_quest_user_date` ON `daily_quests` (`userId`,`date`);--> statement-breakpoint
CREATE INDEX `idx_danmaku_user` ON `danmaku` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_danmaku_time` ON `danmaku` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_gift_sender` ON `gift_records` (`senderId`);--> statement-breakpoint
CREATE INDEX `idx_notes_order` ON `notes` (`orderId`);--> statement-breakpoint
CREATE INDEX `idx_orders_user` ON `orders` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_orders_status` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `idx_orders_deadline` ON `orders` (`deadline`);--> statement-breakpoint
CREATE INDEX `idx_arc_user` ON `story_arcs` (`userId`);
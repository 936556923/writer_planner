DROP INDEX `idx_orders_status` ON `orders`;--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `settleStatus` enum('已结算','未结算') NOT NULL DEFAULT '未结算';--> statement-breakpoint
ALTER TABLE `orders` ADD `writingStatus` enum('初稿待提交','修改','已完成') DEFAULT '初稿待提交' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `submissionStatus` enum('已提交','未提交','待提交') DEFAULT '未提交' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_orders_settle` ON `orders` (`settleStatus`);--> statement-breakpoint
CREATE INDEX `idx_orders_writing` ON `orders` (`writingStatus`);--> statement-breakpoint
CREATE INDEX `idx_orders_submission` ON `orders` (`submissionStatus`);--> statement-breakpoint
ALTER TABLE `orders` DROP COLUMN `status`;
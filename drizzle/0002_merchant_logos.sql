ALTER TABLE `transactions` ADD `logo_url` text;
--> statement-breakpoint
UPDATE `items` SET `cursor` = NULL;

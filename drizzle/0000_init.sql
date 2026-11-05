CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`name` text NOT NULL,
	`official_name` text,
	`mask` text,
	`type` text NOT NULL,
	`subtype` text,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `category_overrides` (
	`transaction_id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`access_token` text NOT NULL,
	`institution_id` text,
	`institution_name` text NOT NULL,
	`cursor` text,
	`status` text DEFAULT 'ok' NOT NULL,
	`error_code` text,
	`history_status` text,
	`last_synced_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pattern` text NOT NULL,
	`category` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`date` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`currency` text,
	`name` text NOT NULL,
	`merchant_name` text,
	`plaid_category` text,
	`plaid_category_detailed` text,
	`pending` integer NOT NULL,
	`pending_transaction_id` text,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `transactions_date_idx` ON `transactions` (`date`);
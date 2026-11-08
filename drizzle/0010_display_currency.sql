CREATE TABLE `exchange_rates` (
	`currency` text PRIMARY KEY NOT NULL,
	`rate` real NOT NULL,
	`rate_date` text NOT NULL,
	`fetched_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);

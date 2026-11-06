CREATE TABLE `holdings` (
	`account_id` text NOT NULL,
	`security_id` text NOT NULL,
	`ticker` text,
	`name` text,
	`security_type` text,
	`quantity` real NOT NULL,
	`price_cents` integer NOT NULL,
	`value_cents` integer NOT NULL,
	`cost_basis_cents` integer,
	PRIMARY KEY(`account_id`, `security_id`),
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `investment_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`date` text NOT NULL,
	`name` text NOT NULL,
	`ticker` text,
	`type` text NOT NULL,
	`subtype` text NOT NULL,
	`quantity` real NOT NULL,
	`price` real NOT NULL,
	`amount_cents` integer NOT NULL,
	`fees_cents` integer,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `investment_transactions_date_idx` ON `investment_transactions` (`date`);--> statement-breakpoint
ALTER TABLE `items` ADD `investments_error` text;
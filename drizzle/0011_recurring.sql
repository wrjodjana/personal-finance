CREATE TABLE `recurring_edits` (
	`stream_id` text PRIMARY KEY NOT NULL,
	`name` text,
	`category` text,
	`amount_cents` integer,
	`frequency` text,
	`next_date` text,
	`hidden` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recurring_streams` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`account_id` text NOT NULL,
	`direction` text NOT NULL,
	`description` text NOT NULL,
	`merchant_name` text,
	`frequency` text NOT NULL,
	`average_cents` integer NOT NULL,
	`last_cents` integer NOT NULL,
	`first_date` text NOT NULL,
	`last_date` text NOT NULL,
	`predicted_next_date` text,
	`status` text NOT NULL,
	`is_active` integer NOT NULL,
	`plaid_category` text,
	`plaid_category_detailed` text,
	`transaction_ids` text NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `items` ADD `recurring_error` text;
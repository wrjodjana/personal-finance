CREATE TABLE `deleted_transactions` (
	`transaction_id` text PRIMARY KEY NOT NULL,
	`deleted_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `transaction_edits` (
	`transaction_id` text PRIMARY KEY NOT NULL,
	`name` text,
	`date` text,
	`amount_cents` integer,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade
);

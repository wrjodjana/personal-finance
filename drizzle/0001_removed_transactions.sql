CREATE TABLE `removed_transactions` (
	`transaction_id` text PRIMARY KEY NOT NULL,
	`removed_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade
);

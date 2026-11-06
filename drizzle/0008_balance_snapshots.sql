CREATE TABLE `balance_snapshots` (
	`account_id` text NOT NULL,
	`date` text NOT NULL,
	`cents` integer NOT NULL,
	PRIMARY KEY(`account_id`, `date`),
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);

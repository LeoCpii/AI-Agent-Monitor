CREATE TABLE `model_daily_metrics` (
	`day` text NOT NULL,
	`agent` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`request_count` integer NOT NULL,
	`total_tokens` integer NOT NULL,
	`input_tokens` integer NOT NULL,
	`output_tokens` integer NOT NULL,
	`reasoning_tokens` integer NOT NULL,
	`cache_read_tokens` integer NOT NULL,
	`cache_write_tokens` integer NOT NULL,
	`duration_ms` integer NOT NULL,
	PRIMARY KEY(`day`, `agent`, `provider`, `model`)
);
--> statement-breakpoint
CREATE TABLE `system_metrics_daily` (
	`day` text PRIMARY KEY NOT NULL,
	`sample_count` integer NOT NULL,
	`gpu_utilization_min` real NOT NULL,
	`gpu_utilization_max` real NOT NULL,
	`gpu_utilization_sum` real NOT NULL,
	`gpu_memory_used_mb_min` real NOT NULL,
	`gpu_memory_used_mb_max` real NOT NULL,
	`gpu_memory_used_mb_sum` real NOT NULL,
	`gpu_memory_total_mb_min` real NOT NULL,
	`gpu_memory_total_mb_max` real NOT NULL,
	`gpu_memory_total_mb_sum` real NOT NULL,
	`gpu_temperature_min` real NOT NULL,
	`gpu_temperature_max` real NOT NULL,
	`gpu_temperature_sum` real NOT NULL,
	`gpu_power_watts_min` real NOT NULL,
	`gpu_power_watts_max` real NOT NULL,
	`gpu_power_watts_sum` real NOT NULL,
	`cpu_usage_min` real NOT NULL,
	`cpu_usage_max` real NOT NULL,
	`cpu_usage_sum` real NOT NULL,
	`memory_used_mb_min` real NOT NULL,
	`memory_used_mb_max` real NOT NULL,
	`memory_used_mb_sum` real NOT NULL,
	`memory_total_mb_min` real NOT NULL,
	`memory_total_mb_max` real NOT NULL,
	`memory_total_mb_sum` real NOT NULL
);
--> statement-breakpoint
CREATE INDEX `model_requests_completed_at_idx` ON `model_requests` (`completed_at`);--> statement-breakpoint
CREATE INDEX `system_metrics_timestamp_idx` ON `system_metrics` (`timestamp`);
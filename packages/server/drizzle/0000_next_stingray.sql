CREATE TABLE `model_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`agent` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`total_tokens` integer NOT NULL,
	`input_tokens` integer NOT NULL,
	`output_tokens` integer NOT NULL,
	`reasoning_tokens` integer NOT NULL,
	`cache_read_tokens` integer NOT NULL,
	`cache_write_tokens` integer NOT NULL,
	`cost` real NOT NULL,
	`duration_ms` integer NOT NULL,
	`finish` text NOT NULL,
	`directory` text,
	`created_at` text NOT NULL,
	`completed_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `system_metrics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`timestamp` text NOT NULL,
	`gpu_utilization` real NOT NULL,
	`gpu_memory_used_mb` real NOT NULL,
	`gpu_memory_total_mb` real NOT NULL,
	`gpu_temperature` real NOT NULL,
	`gpu_power_watts` real NOT NULL,
	`cpu_usage` real NOT NULL,
	`memory_used_mb` real NOT NULL,
	`memory_total_mb` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tool_calls` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`tool` text NOT NULL,
	`status` text NOT NULL,
	`arguments` text,
	`title` text,
	`started_at` text NOT NULL,
	`completed_at` text,
	`duration_ms` integer
);

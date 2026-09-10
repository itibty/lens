-- 已有 Lens 数据库的一次性增量脚本。
-- 全新安装只需执行 schema.sql，不要重复执行本文件。

ALTER TABLE `sys_user`
  ADD COLUMN `email` varchar(200) DEFAULT NULL AFTER `real_name`,
  ADD UNIQUE KEY `uk_user_email` (`email`);

CREATE TABLE `vis_dashboard_subscription` (
  `id` bigint NOT NULL,
  `dashboard_id` bigint NOT NULL,
  `owner_id` bigint UNSIGNED NOT NULL,
  `subscription_name` varchar(100) NOT NULL,
  `schedule_type` varchar(16) NOT NULL COMMENT 'DAILY|WEEKDAY|WEEKLY|MONTHLY',
  `schedule_json` json NOT NULL,
  `timezone` varchar(64) NOT NULL DEFAULT 'Asia/Shanghai',
  `channel_type` varchar(16) NOT NULL DEFAULT 'EMAIL',
  `target_json` json NOT NULL,
  `next_fire_at` bigint NOT NULL,
  `last_fire_at` bigint DEFAULT NULL,
  `status` char(3) NOT NULL DEFAULT 'EBL',
  `create_at` bigint DEFAULT NULL,
  `create_by` bigint DEFAULT NULL,
  `modify_at` bigint DEFAULT NULL,
  `modify_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_subscription_due` (`status`, `next_fire_at`),
  KEY `idx_subscription_owner_dash` (`owner_id`, `dashboard_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='看板定时订阅';

CREATE TABLE `vis_dashboard_subscription_run` (
  `id` bigint NOT NULL,
  `subscription_id` bigint NOT NULL,
  `scheduled_at` bigint NOT NULL,
  `trigger_type` varchar(16) NOT NULL COMMENT 'SCHEDULED|MANUAL',
  `run_status` varchar(16) NOT NULL COMMENT 'RUNNING|SUCCESS|FAILED|SKIPPED',
  `attempt_count` int NOT NULL DEFAULT 0,
  `screenshot_bytes` bigint DEFAULT NULL,
  `error_message` varchar(500) DEFAULT NULL,
  `started_at` bigint DEFAULT NULL,
  `finished_at` bigint DEFAULT NULL,
  `create_at` bigint DEFAULT NULL,
  `create_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_subscription_run` (`subscription_id`, `scheduled_at`, `trigger_type`),
  KEY `idx_subscription_run_history` (`subscription_id`, `create_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='看板订阅执行记录';

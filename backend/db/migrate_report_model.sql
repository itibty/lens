-- 报表中心虚拟根 + 角色只绑 FUNC + 看板分组
SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS `sys_role_dashboard` (
  `id` bigint UNSIGNED NOT NULL,
  `role_id` bigint UNSIGNED NOT NULL,
  `dashboard_id` bigint NOT NULL,
  `create_at` bigint DEFAULT NULL,
  `create_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_dashboard` (`role_id`, `dashboard_id`),
  KEY `idx_dashboard` (`dashboard_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='角色可看看板';

CREATE TABLE IF NOT EXISTS `vis_dash_group` (
  `id` bigint NOT NULL,
  `pid` bigint NOT NULL DEFAULT 0,
  `group_name` varchar(50) NOT NULL,
  `icon` varchar(50) DEFAULT NULL,
  `sort_num` int DEFAULT 0,
  `status` char(3) NOT NULL DEFAULT 'EBL',
  `create_at` bigint DEFAULT NULL,
  `create_by` bigint DEFAULT NULL,
  `modify_at` bigint DEFAULT NULL,
  `modify_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_pid` (`pid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='看板分组';

SET @has_group_id := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vis_dashboard' AND COLUMN_NAME = 'group_id'
);
SET @sql := IF(@has_group_id = 0,
  'ALTER TABLE `vis_dashboard` ADD COLUMN `group_id` bigint NOT NULL DEFAULT 0 AFTER `id`, ADD KEY `idx_group` (`group_id`)',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

DELETE rm FROM `sys_role_menu` rm WHERE rm.menu_id IN (20,21,22,23,24,25,26,27,28,29,31,32,33);
DELETE FROM `sys_menu` WHERE id IN (20,21,22,23,24,25,26,27,28,29,31,32,33);

UPDATE `sys_menu` SET `perm_code` = NULL WHERE `menu_type` = 'MENU';

INSERT INTO `sys_menu` (`id`, `pid`, `menu_name`, `menu_type`, `route_path`, `icon`, `sort_num`, `perm_code`, `status`) VALUES
(200, 2, '查看用户', 'FUNC', NULL, NULL, 1, 'sys:user:query', 'EBL'),
(300, 3, '查看角色', 'FUNC', NULL, NULL, 1, 'sys:role:query', 'EBL'),
(303, 3, '配置看板', 'FUNC', NULL, NULL, 4, 'sys:role:config-dashboard', 'EBL'),
(400, 4, '查看菜单', 'FUNC', NULL, NULL, 1, 'sys:menu:query', 'EBL'),
(1100, 11, '查看数据集', 'FUNC', NULL, NULL, 1, 'ds:sql:query', 'EBL'),
(1700, 17, '查看卡片', 'FUNC', NULL, NULL, 1, 'ds:card:query', 'EBL'),
(1800, 18, '查看看板', 'FUNC', NULL, NULL, 1, 'ds:dashboard:query', 'EBL')
ON DUPLICATE KEY UPDATE
  `pid` = VALUES(`pid`),
  `menu_name` = VALUES(`menu_name`),
  `menu_type` = VALUES(`menu_type`),
  `perm_code` = VALUES(`perm_code`),
  `status` = VALUES(`status`);

UPDATE `sys_menu` SET `menu_name` = '配置功能', `sort_num` = 3 WHERE `id` = 302;

INSERT INTO `vis_dash_group` (`id`, `pid`, `group_name`, `icon`, `sort_num`, `status`) VALUES
(9601, 0, '经营分析', 'board-line', 10, 'EBL'),
(9602, 0, '查询筛选', 'search-line', 20, 'EBL'),
(9603, 0, '图表示例', 'chart-pie-line', 30, 'EBL')
ON DUPLICATE KEY UPDATE
  `group_name` = VALUES(`group_name`),
  `icon` = VALUES(`icon`),
  `sort_num` = VALUES(`sort_num`),
  `status` = VALUES(`status`);

UPDATE `vis_dashboard` SET `group_id` = 9601 WHERE `id` IN (9501, 9502);
UPDATE `vis_dashboard` SET `group_id` = 9602 WHERE `id` IN (9504, 9505, 9507);
UPDATE `vis_dashboard` SET `group_id` = 9603 WHERE `id` IN (9503, 9508, 9509, 9510);

DELETE rm FROM `sys_role_menu` rm
JOIN `sys_menu` m ON m.id = rm.menu_id
WHERE m.menu_type = 'MENU';

INSERT IGNORE INTO `sys_role_menu` (`id`, `role_id`, `menu_id`, `create_at`, `create_by`)
SELECT id, 1, id, 0, 0 FROM `sys_menu` WHERE menu_type = 'FUNC' AND status = 'EBL';

UPDATE `sys_menu` SET `menu_name` = '查看用户' WHERE `id` = 200;
UPDATE `sys_menu` SET `menu_name` = '查看角色' WHERE `id` = 300;
UPDATE `sys_menu` SET `menu_name` = '配置功能' WHERE `id` = 302;
UPDATE `sys_menu` SET `menu_name` = '配置看板' WHERE `id` = 303;
UPDATE `sys_menu` SET `menu_name` = '查看菜单' WHERE `id` = 400;
UPDATE `sys_menu` SET `menu_name` = '查看数据集', `perm_code` = 'ds:sql:query' WHERE `id` = 1100;
UPDATE `sys_menu` SET `menu_name` = '编辑数据集', `perm_code` = 'ds:sql:write' WHERE `id` = 1101;
UPDATE `sys_menu` SET `menu_name` = '查看卡片' WHERE `id` = 1700;
UPDATE `sys_menu` SET `menu_name` = '查看看板' WHERE `id` = 1800;

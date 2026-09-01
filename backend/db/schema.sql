-- Lens BI 当前唯一初始化基线（结构 + 种子菜单/角色）
-- 权限码与当前 Controller 对齐；本脚本会重建表，不用于已有库的增量升级。
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `sys_role_dashboard`;
DROP TABLE IF EXISTS `sys_role_menu`;
DROP TABLE IF EXISTS `sys_user_role`;
DROP TABLE IF EXISTS `sys_menu`;
DROP TABLE IF EXISTS `sys_role`;
DROP TABLE IF EXISTS `sys_user`;
DROP TABLE IF EXISTS `vis_dashboard_card`;
DROP TABLE IF EXISTS `vis_card`;
DROP TABLE IF EXISTS `vis_dashboard`;
DROP TABLE IF EXISTS `vis_dash_group`;
DROP TABLE IF EXISTS `vis_dataset_field`;
DROP TABLE IF EXISTS `vis_dataset`;
DROP TABLE IF EXISTS `vis_datasource`;

CREATE TABLE `sys_user` (
  `id` bigint UNSIGNED NOT NULL,
  `username` varchar(100) NOT NULL,
  `password` varchar(100) NOT NULL,
  `real_name` varchar(50) NOT NULL,
  `status` char(3) NOT NULL DEFAULT 'EBL' COMMENT 'EBL启用 DBL禁用',
  `last_login_at` bigint DEFAULT NULL,
  `create_at` bigint DEFAULT NULL,
  `create_by` bigint DEFAULT NULL,
  `modify_at` bigint DEFAULT NULL,
  `modify_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户';

CREATE TABLE `sys_role` (
  `id` bigint UNSIGNED NOT NULL,
  `role_name` varchar(50) NOT NULL,
  `role_code` varchar(50) NOT NULL,
  `role_note` varchar(100) DEFAULT NULL,
  `status` char(3) NOT NULL DEFAULT 'EBL',
  `create_at` bigint DEFAULT NULL,
  `create_by` bigint DEFAULT NULL,
  `modify_at` bigint DEFAULT NULL,
  `modify_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_code` (`role_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='角色';

CREATE TABLE `sys_user_role` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `role_id` bigint UNSIGNED NOT NULL,
  `start_at` bigint DEFAULT NULL,
  `end_at` bigint DEFAULT NULL,
  `create_at` bigint DEFAULT NULL,
  `create_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_role` (`user_id`, `role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户角色';

CREATE TABLE `sys_menu` (
  `id` bigint UNSIGNED NOT NULL,
  `pid` bigint UNSIGNED NOT NULL DEFAULT 0,
  `menu_name` varchar(50) NOT NULL,
  `menu_type` varchar(8) NOT NULL COMMENT 'MENU|FUNC',
  `route_path` varchar(100) DEFAULT NULL,
  `icon` varchar(50) DEFAULT NULL,
  `sort_num` int DEFAULT 0,
  `perm_code` varchar(100) DEFAULT NULL,
  `status` char(3) NOT NULL DEFAULT 'EBL',
  `create_at` bigint DEFAULT NULL,
  `create_by` bigint DEFAULT NULL,
  `modify_at` bigint DEFAULT NULL,
  `modify_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_pid` (`pid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='菜单与功能点';

CREATE TABLE `sys_role_menu` (
  `id` bigint UNSIGNED NOT NULL,
  `role_id` bigint UNSIGNED NOT NULL,
  `menu_id` bigint UNSIGNED NOT NULL,
  `create_at` bigint DEFAULT NULL,
  `create_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_menu` (`role_id`, `menu_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='角色功能点';

CREATE TABLE `sys_role_dashboard` (
  `id` bigint UNSIGNED NOT NULL,
  `role_id` bigint UNSIGNED NOT NULL,
  `dashboard_id` bigint NOT NULL,
  `create_at` bigint DEFAULT NULL,
  `create_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_dashboard` (`role_id`, `dashboard_id`),
  KEY `idx_dashboard` (`dashboard_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='角色可看看板';

CREATE TABLE `vis_datasource` (
  `id` bigint NOT NULL,
  `source_name` varchar(50) NOT NULL,
  `db_type` varchar(20) NOT NULL DEFAULT 'MYSQL',
  `jdbc_url` varchar(500) NOT NULL,
  `username` varchar(100) NOT NULL,
  `password` varchar(200) NOT NULL,
  `status` char(3) NOT NULL DEFAULT 'EBL',
  `create_at` bigint DEFAULT NULL,
  `create_by` bigint DEFAULT NULL,
  `modify_at` bigint DEFAULT NULL,
  `modify_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_source_name` (`source_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='可视化数据源';

CREATE TABLE `vis_dataset` (
  `id` bigint NOT NULL,
  `source_id` bigint NOT NULL,
  `dataset_name` varchar(50) NOT NULL,
  `dataset_desc` varchar(200) DEFAULT NULL,
  `sql_content` text NOT NULL,
  `param_demo` varchar(2000) DEFAULT NULL,
  `status` char(3) NOT NULL DEFAULT 'EBL',
  `create_at` bigint DEFAULT NULL,
  `create_by` bigint DEFAULT NULL,
  `modify_at` bigint DEFAULT NULL,
  `modify_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_source` (`source_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='只读数据集';

CREATE TABLE `vis_dataset_field` (
  `id` bigint NOT NULL,
  `dataset_id` bigint NOT NULL,
  `field` varchar(64) NOT NULL,
  `data_type` varchar(16) NOT NULL COMMENT 'STRING|NUMBER|DATE|DATETIME',
  `suggest_role` varchar(16) NOT NULL COMMENT 'DIMENSION|METRIC',
  `remark` varchar(200) DEFAULT NULL COMMENT '补充说明',
  `sort_num` int DEFAULT 0,
  `status` char(3) NOT NULL DEFAULT 'EBL',
  `create_at` bigint DEFAULT NULL,
  `create_by` bigint DEFAULT NULL,
  `modify_at` bigint DEFAULT NULL,
  `modify_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dataset_field` (`dataset_id`, `field`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='数据集字段';

CREATE TABLE `vis_card` (
  `id` bigint NOT NULL,
  `card_name` varchar(50) NOT NULL,
  `card_desc` varchar(200) DEFAULT NULL,
  `dataset_id` bigint NOT NULL DEFAULT 0,
  `chart_type` varchar(16) NOT NULL,
  `query_json` json NOT NULL,
  `visual_json` json NOT NULL,
  `status` char(3) NOT NULL DEFAULT 'EBL',
  `create_at` bigint DEFAULT NULL,
  `create_by` bigint DEFAULT NULL,
  `modify_at` bigint DEFAULT NULL,
  `modify_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_dataset` (`dataset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='可视化卡片';

CREATE TABLE `vis_dash_group` (
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

CREATE TABLE `vis_dashboard` (
  `id` bigint NOT NULL,
  `group_id` bigint NOT NULL DEFAULT 0,
  `dash_name` varchar(50) NOT NULL,
  `dash_desc` varchar(200) DEFAULT NULL,
  `icon` varchar(50) DEFAULT NULL,
  `config_json` json DEFAULT NULL,
  `status` char(3) NOT NULL DEFAULT 'EBL',
  `create_at` bigint DEFAULT NULL,
  `create_by` bigint DEFAULT NULL,
  `modify_at` bigint DEFAULT NULL,
  `modify_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_group` (`group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='可视化看板';

CREATE TABLE `vis_dashboard_card` (
  `id` bigint NOT NULL,
  `dashboard_id` bigint NOT NULL,
  `card_id` bigint NOT NULL,
  `create_at` bigint DEFAULT NULL,
  `create_by` bigint DEFAULT NULL,
  `modify_at` bigint DEFAULT NULL,
  `modify_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dash_card` (`dashboard_id`, `card_id`),
  KEY `idx_card` (`card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='看板卡片索引';

-- 菜单 id 对齐路由 meta.menuId。报表中心是虚拟根，不入库。
-- 角色只关联 FUNC；有任意功能点才露出上级 MENU。
INSERT INTO `sys_menu` (`id`, `pid`, `menu_name`, `menu_type`, `route_path`, `icon`, `sort_num`, `perm_code`, `status`) VALUES
(16, 0, '后台管理', 'MENU', NULL, 'settings-3-line', 10, NULL, 'EBL'),
(17, 16, '卡片', 'MENU', '/vis/cards', 'layout-4-line', 10, NULL, 'EBL'),
(18, 16, '看板', 'MENU', '/vis/dashboards', 'dashboard-3-line', 20, NULL, 'EBL'),
(11, 16, '数据集', 'MENU', '/vis/datasets', 'storage-line', 30, NULL, 'EBL'),
(4, 16, '菜单', 'MENU', '/sys/menus', 'menu-line', 40, NULL, 'EBL'),
(3, 16, '角色', 'MENU', '/sys/roles', 'group-3-line', 50, NULL, 'EBL'),
(2, 16, '用户', 'MENU', '/sys/users', 'user-3-line', 60, NULL, 'EBL'),
(200, 2, '查看', 'FUNC', NULL, NULL, 1, 'sys:user:query', 'EBL'),
(201, 2, '编辑', 'FUNC', NULL, NULL, 2, 'sys:user:write', 'EBL'),
(300, 3, '查看', 'FUNC', NULL, NULL, 1, 'sys:role:query', 'EBL'),
(301, 3, '编辑', 'FUNC', NULL, NULL, 2, 'sys:role:write', 'EBL'),
(400, 4, '查看', 'FUNC', NULL, NULL, 1, 'sys:menu:query', 'EBL'),
(401, 4, '编辑', 'FUNC', NULL, NULL, 2, 'sys:menu:write', 'EBL'),
(1100, 11, '配置', 'FUNC', NULL, NULL, 1, 'vis:dataset:conf', 'EBL'),
(1700, 17, '配置', 'FUNC', NULL, NULL, 1, 'vis:card:conf', 'EBL'),
(1800, 18, '配置', 'FUNC', NULL, NULL, 1, 'vis:dashboard:conf', 'EBL');

INSERT INTO `vis_dash_group` (`id`, `pid`, `group_name`, `icon`, `sort_num`, `status`) VALUES
(9601, 0, '经营分析', 'board-line', 10, 'EBL'),
(9602, 0, '销售运营', 'chart-line-line', 20, 'EBL'),
(9603, 0, '商品洞察', 'box-2-line', 30, 'EBL');

INSERT INTO `sys_role` (`id`, `role_name`, `role_code`, `role_note`, `status`, `create_at`, `create_by`)
VALUES (1, '超级管理员', 'admin', '全部权限', 'EBL', 0, 0);

INSERT INTO `sys_role_menu` (`id`, `role_id`, `menu_id`, `create_at`, `create_by`)
SELECT id, 1, id, 0, 0 FROM `sys_menu` WHERE menu_type = 'FUNC';

SET FOREIGN_KEY_CHECKS = 1;

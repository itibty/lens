-- Lens 初始化基线：本地 MySQL lens 库于 2026-09-11 导出的完整应用表结构和当前数据。
-- 包含账号、角色、菜单、授权、数据源、数据集、卡片、看板及订阅/执行记录，保留原有 ID 和字段值。
-- 在选定的空库/待重置开发库中执行；会重建下列 15 张应用表，无需执行增量脚本。
-- 示例订单表的结构和数据单独保存在 demo.sql；需要查看当前示例看板时，在本文件之后导入。
-- UTF-8 编码；数据源连接信息保持快照原值，迁移环境时按实际配置调整。

SET NAMES utf8mb4;
SET @LENS_OLD_SQL_MODE = @@SQL_MODE;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET @LENS_OLD_TIME_ZONE = @@TIME_ZONE;
SET TIME_ZONE = '+00:00';
SET @LENS_OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS = 0;


-- sys_menu：当前数据 16 条
DROP TABLE IF EXISTS `sys_menu`;
CREATE TABLE `sys_menu` (
  `id` bigint unsigned NOT NULL,
  `pid` bigint unsigned NOT NULL DEFAULT '0',
  `menu_name` varchar(50) NOT NULL,
  `menu_type` varchar(8) NOT NULL COMMENT 'MENU|FUNC',
  `route_path` varchar(100) DEFAULT NULL,
  `icon` varchar(50) DEFAULT NULL,
  `sort_num` int DEFAULT '0',
  `perm_code` varchar(100) DEFAULT NULL,
  `status` char(3) NOT NULL DEFAULT 'EBL',
  `create_at` bigint DEFAULT NULL,
  `create_by` bigint DEFAULT NULL,
  `modify_at` bigint DEFAULT NULL,
  `modify_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_pid` (`pid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='菜单与按钮';
INSERT INTO `sys_menu` (`id`, `pid`, `menu_name`, `menu_type`, `route_path`, `icon`, `sort_num`, `perm_code`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (2,16,'用户','MENU','/sys/users','user-3-line',60,NULL,'EBL',NULL,NULL,1787653070733,1);
INSERT INTO `sys_menu` (`id`, `pid`, `menu_name`, `menu_type`, `route_path`, `icon`, `sort_num`, `perm_code`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (3,16,'角色','MENU','/sys/roles','group-3-line',50,NULL,'EBL',NULL,NULL,1787653070767,1);
INSERT INTO `sys_menu` (`id`, `pid`, `menu_name`, `menu_type`, `route_path`, `icon`, `sort_num`, `perm_code`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (4,16,'菜单','MENU','/sys/menus','menu-line',40,NULL,'EBL',NULL,NULL,1787653070781,1);
INSERT INTO `sys_menu` (`id`, `pid`, `menu_name`, `menu_type`, `route_path`, `icon`, `sort_num`, `perm_code`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (11,16,'数据集','MENU','/vis/datasets','storage-line',30,NULL,'EBL',NULL,NULL,1787653070668,1);
INSERT INTO `sys_menu` (`id`, `pid`, `menu_name`, `menu_type`, `route_path`, `icon`, `sort_num`, `perm_code`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (16,0,'后台管理','MENU',NULL,'settings-3-line',10,NULL,'EBL',NULL,NULL,1787653070652,1);
INSERT INTO `sys_menu` (`id`, `pid`, `menu_name`, `menu_type`, `route_path`, `icon`, `sort_num`, `perm_code`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (17,16,'卡片','MENU','/vis/cards','layout-4-line',10,NULL,'EBL',NULL,NULL,1787653070681,1);
INSERT INTO `sys_menu` (`id`, `pid`, `menu_name`, `menu_type`, `route_path`, `icon`, `sort_num`, `perm_code`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (18,16,'看板','MENU','/vis/dashboards','dashboard-3-line',20,NULL,'EBL',NULL,NULL,1787653070694,1);
INSERT INTO `sys_menu` (`id`, `pid`, `menu_name`, `menu_type`, `route_path`, `icon`, `sort_num`, `perm_code`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (200,2,'查看','FUNC',NULL,NULL,1,'sys:user:query','EBL',NULL,NULL,NULL,NULL);
INSERT INTO `sys_menu` (`id`, `pid`, `menu_name`, `menu_type`, `route_path`, `icon`, `sort_num`, `perm_code`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (201,2,'编辑','FUNC',NULL,NULL,1,'sys:user:write','EBL',NULL,NULL,NULL,NULL);
INSERT INTO `sys_menu` (`id`, `pid`, `menu_name`, `menu_type`, `route_path`, `icon`, `sort_num`, `perm_code`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (300,3,'查看','FUNC',NULL,NULL,1,'sys:role:query','EBL',NULL,NULL,NULL,NULL);
INSERT INTO `sys_menu` (`id`, `pid`, `menu_name`, `menu_type`, `route_path`, `icon`, `sort_num`, `perm_code`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (301,3,'编辑','FUNC',NULL,NULL,1,'sys:role:write','EBL',NULL,NULL,NULL,NULL);
INSERT INTO `sys_menu` (`id`, `pid`, `menu_name`, `menu_type`, `route_path`, `icon`, `sort_num`, `perm_code`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (400,4,'查看','FUNC',NULL,NULL,1,'sys:menu:query','EBL',NULL,NULL,NULL,NULL);
INSERT INTO `sys_menu` (`id`, `pid`, `menu_name`, `menu_type`, `route_path`, `icon`, `sort_num`, `perm_code`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (401,4,'编辑','FUNC',NULL,NULL,1,'sys:menu:write','EBL',NULL,NULL,NULL,NULL);
INSERT INTO `sys_menu` (`id`, `pid`, `menu_name`, `menu_type`, `route_path`, `icon`, `sort_num`, `perm_code`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (1100,11,'配置','FUNC',NULL,NULL,1,'vis:dataset:conf','EBL',NULL,NULL,NULL,NULL);
INSERT INTO `sys_menu` (`id`, `pid`, `menu_name`, `menu_type`, `route_path`, `icon`, `sort_num`, `perm_code`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (1700,17,'配置','FUNC',NULL,NULL,1,'vis:card:conf','EBL',NULL,NULL,NULL,NULL);
INSERT INTO `sys_menu` (`id`, `pid`, `menu_name`, `menu_type`, `route_path`, `icon`, `sort_num`, `perm_code`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (1800,18,'配置','FUNC',NULL,NULL,1,'vis:dashboard:conf','EBL',NULL,NULL,NULL,NULL);

-- sys_role：当前数据 2 条
DROP TABLE IF EXISTS `sys_role`;
CREATE TABLE `sys_role` (
  `id` bigint unsigned NOT NULL,
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
INSERT INTO `sys_role` (`id`, `role_name`, `role_code`, `role_note`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (1,'超级管理员','admin','全部权限','EBL',0,0,NULL,NULL);
INSERT INTO `sys_role` (`id`, `role_name`, `role_code`, `role_note`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (2092228177777459201,'user','user',NULL,'EBL',1787661043952,1,1787661043952,1);

-- sys_role_dashboard：当前数据 4 条
DROP TABLE IF EXISTS `sys_role_dashboard`;
CREATE TABLE `sys_role_dashboard` (
  `id` bigint unsigned NOT NULL,
  `role_id` bigint unsigned NOT NULL,
  `dashboard_id` bigint NOT NULL,
  `create_at` bigint DEFAULT NULL,
  `create_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_dashboard` (`role_id`,`dashboard_id`),
  KEY `idx_dashboard` (`dashboard_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='è§’è‰²å¯çœ‹çœ‹æ¿';
INSERT INTO `sys_role_dashboard` (`id`, `role_id`, `dashboard_id`, `create_at`, `create_by`) VALUES (9501,1,9501,0,0);
INSERT INTO `sys_role_dashboard` (`id`, `role_id`, `dashboard_id`, `create_at`, `create_by`) VALUES (9502,1,9502,0,0);
INSERT INTO `sys_role_dashboard` (`id`, `role_id`, `dashboard_id`, `create_at`, `create_by`) VALUES (9503,1,9503,0,0);
INSERT INTO `sys_role_dashboard` (`id`, `role_id`, `dashboard_id`, `create_at`, `create_by`) VALUES (9504,1,9504,0,0);

-- sys_role_menu：当前数据 15 条
DROP TABLE IF EXISTS `sys_role_menu`;
CREATE TABLE `sys_role_menu` (
  `id` bigint unsigned NOT NULL,
  `role_id` bigint unsigned NOT NULL,
  `menu_id` bigint unsigned NOT NULL,
  `create_at` bigint DEFAULT NULL,
  `create_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_menu` (`role_id`,`menu_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='角色菜单';
INSERT INTO `sys_role_menu` (`id`, `role_id`, `menu_id`, `create_at`, `create_by`) VALUES (2092631526343684097,1,1100,1787757209748,NULL);
INSERT INTO `sys_role_menu` (`id`, `role_id`, `menu_id`, `create_at`, `create_by`) VALUES (2092631526356267009,1,1700,1787757209748,NULL);
INSERT INTO `sys_role_menu` (`id`, `role_id`, `menu_id`, `create_at`, `create_by`) VALUES (2092631526368849922,1,1800,1787757209748,NULL);
INSERT INTO `sys_role_menu` (`id`, `role_id`, `menu_id`, `create_at`, `create_by`) VALUES (2092631526377238530,1,200,1787757209748,NULL);
INSERT INTO `sys_role_menu` (`id`, `role_id`, `menu_id`, `create_at`, `create_by`) VALUES (2092631526381432833,1,201,1787757209748,NULL);
INSERT INTO `sys_role_menu` (`id`, `role_id`, `menu_id`, `create_at`, `create_by`) VALUES (2092631526394015746,1,300,1787757209748,NULL);
INSERT INTO `sys_role_menu` (`id`, `role_id`, `menu_id`, `create_at`, `create_by`) VALUES (2092631526402404353,1,301,1787757209748,NULL);
INSERT INTO `sys_role_menu` (`id`, `role_id`, `menu_id`, `create_at`, `create_by`) VALUES (2092631526427570177,1,400,1787757209748,NULL);
INSERT INTO `sys_role_menu` (`id`, `role_id`, `menu_id`, `create_at`, `create_by`) VALUES (2092631526435958786,1,401,1787757209748,NULL);
INSERT INTO `sys_role_menu` (`id`, `role_id`, `menu_id`, `create_at`, `create_by`) VALUES (2092636242200997889,2092228177777459201,1100,1787758334099,NULL);
INSERT INTO `sys_role_menu` (`id`, `role_id`, `menu_id`, `create_at`, `create_by`) VALUES (2092636242213580801,2092228177777459201,1700,1787758334099,NULL);
INSERT INTO `sys_role_menu` (`id`, `role_id`, `menu_id`, `create_at`, `create_by`) VALUES (2092636242221969410,2092228177777459201,1800,1787758334099,NULL);
INSERT INTO `sys_role_menu` (`id`, `role_id`, `menu_id`, `create_at`, `create_by`) VALUES (2092636242230358018,2092228177777459201,200,1787758334099,NULL);
INSERT INTO `sys_role_menu` (`id`, `role_id`, `menu_id`, `create_at`, `create_by`) VALUES (2092636242238746625,2092228177777459201,300,1787758334099,NULL);
INSERT INTO `sys_role_menu` (`id`, `role_id`, `menu_id`, `create_at`, `create_by`) VALUES (2092636242242940930,2092228177777459201,400,1787758334099,NULL);

-- sys_user：当前数据 2 条
DROP TABLE IF EXISTS `sys_user`;
CREATE TABLE `sys_user` (
  `id` bigint unsigned NOT NULL,
  `username` varchar(100) NOT NULL,
  `password` varchar(100) NOT NULL,
  `real_name` varchar(50) NOT NULL,
  `email` varchar(200) DEFAULT NULL,
  `avatar` varchar(200) DEFAULT NULL,
  `status` char(3) NOT NULL DEFAULT 'EBL' COMMENT 'EBL启用 DBL禁用',
  `last_login_at` bigint DEFAULT NULL,
  `create_at` bigint DEFAULT NULL,
  `create_by` bigint DEFAULT NULL,
  `modify_at` bigint DEFAULT NULL,
  `modify_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  UNIQUE KEY `uk_user_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户';
INSERT INTO `sys_user` (`id`, `username`, `password`, `real_name`, `email`, `avatar`, `status`, `last_login_at`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (1,'admin','$2a$10$shqWWlZkPz4OfHc1/nX36eey8czy9qn4T5Z8vjPA1Oo0YCHXTnPsK','管理员','916432779@qq.com',NULL,'EBL',1789037807561,1787646081891,0,1787646081891,0);
INSERT INTO `sys_user` (`id`, `username`, `password`, `real_name`, `email`, `avatar`, `status`, `last_login_at`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (2092636134315110401,'zhangsan','$2a$10$l/cXKQSy/uqeNslvKcSRJO7na9.p/Ucjrd.KuD9PkVDpco5A46gUW','张三',NULL,'/avatar/08.png','EBL',1788337014202,1787758308375,1,1787758308375,1);

-- sys_user_role：当前数据 2 条
DROP TABLE IF EXISTS `sys_user_role`;
CREATE TABLE `sys_user_role` (
  `id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `role_id` bigint unsigned NOT NULL,
  `start_at` bigint DEFAULT NULL,
  `end_at` bigint DEFAULT NULL,
  `create_at` bigint DEFAULT NULL,
  `create_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_role` (`user_id`,`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户角色';
INSERT INTO `sys_user_role` (`id`, `user_id`, `role_id`, `start_at`, `end_at`, `create_at`, `create_by`) VALUES (2092165422433243138,1,1,NULL,NULL,1787646081917,NULL);
INSERT INTO `sys_user_role` (`id`, `user_id`, `role_id`, `start_at`, `end_at`, `create_at`, `create_by`) VALUES (2092636279656132610,2092636134315110401,2092228177777459201,NULL,NULL,1787758343028,NULL);

-- vis_card：当前数据 32 条
DROP TABLE IF EXISTS `vis_card`;
CREATE TABLE `vis_card` (
  `id` bigint NOT NULL,
  `card_name` varchar(50) NOT NULL,
  `card_desc` varchar(200) DEFAULT NULL,
  `dataset_id` bigint NOT NULL DEFAULT '0',
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
INSERT INTO `vis_card` (`id`, `card_name`, `card_desc`, `dataset_id`, `chart_type`, `query_json`, `visual_json`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9201,'本月营收','本月实收，辅指标毛利',9101,'number','{\"params\": [], \"filters\": [{\"combineOp\": \"and\", \"conditions\": [{\"field\": \"order_date\", \"valueExp\": \"current_month\"}]}], \"metrics\": [{\"agg\": \"SUM\", \"field\": \"revenue\", \"label\": \"营收\"}, {\"agg\": \"SUM\", \"field\": \"profit\", \"label\": \"毛利\"}], \"asOfDate\": \"2026-06-15\", \"datasetId\": \"9101\", \"orderList\": [], \"dimensions\": [], \"havingFilters\": []}','{\"detail\": {\"fields\": [\"profit\", \"score\"], \"fieldOptions\": {\"profit\": {\"format\": {\"prefix\": \"\", \"suffix\": \"\", \"compact\": false, \"decimals\": \"auto\", \"separator\": true}}}}, \"number\": {\"showLabel\": true, \"showAuxLabel\": true}, \"chartType\": \"number\", \"showTitle\": true, \"allowDetail\": true, \"allowDownload\": true}','EBL',NULL,NULL,1788940953420,1);
INSERT INTO `vis_card` (`id`, `card_name`, `card_desc`, `dataset_id`, `chart_type`, `query_json`, `visual_json`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9202,'本月营收同比环比','相对去年同期与上月',9101,'number','{\"filters\": [{\"combineOp\": \"and\", \"conditions\": [{\"field\": \"order_date\", \"valueExp\": \"current_month\"}]}], \"metrics\": [{\"agg\": \"SUM\", \"field\": \"revenue\", \"label\": \"营收\"}, {\"agg\": \"SUM\", \"field\": \"profit\", \"label\": \"毛利\"}, {\"agg\": \"SUM\", \"field\": \"revenue\", \"label\": \"同比\", \"contrast\": {\"calcType\": \"diffRate\", \"valueExp\": \"current_month\", \"timeField\": \"order_date\", \"calcMethod\": \"shift_year\"}}, {\"agg\": \"SUM\", \"field\": \"revenue\", \"label\": \"环比\", \"contrast\": {\"calcType\": \"diffRate\", \"valueExp\": \"current_month\", \"timeField\": \"order_date\", \"calcMethod\": \"shift_month\"}}], \"asOfDate\": \"2026-06-15\", \"datasetId\": \"9101\"}','{\"number\": {\"prefix\": \"¥\", \"decimals\": 1, \"showLabel\": true, \"showAuxLabel\": true}, \"chartType\": \"number\", \"showTitle\": true, \"allowDetail\": true}','EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_card` (`id`, `card_name`, `card_desc`, `dataset_id`, `chart_type`, `query_json`, `visual_json`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9203,'今日成交','当日实收与件数',9101,'number','{\"filters\": [{\"combineOp\": \"and\", \"conditions\": [{\"field\": \"order_date\", \"valueExp\": \"current_day\"}]}], \"metrics\": [{\"agg\": \"SUM\", \"field\": \"revenue\", \"label\": \"营收\"}, {\"agg\": \"SUM\", \"field\": \"qty\", \"label\": \"件数\"}], \"asOfDate\": \"2026-06-15\", \"datasetId\": \"9101\"}','{\"number\": {\"size\": \"sm\", \"prefix\": \"¥\", \"showLabel\": true, \"showAuxLabel\": true}, \"chartType\": \"number\", \"showTitle\": true, \"allowDetail\": true}','EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_card` (`id`, `card_name`, `card_desc`, `dataset_id`, `chart_type`, `query_json`, `visual_json`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9204,'本月目标完成率','本月实收对照固定目标',9101,'progress','{\"params\": [], \"filters\": [{\"combineOp\": \"and\", \"conditions\": [{\"field\": \"order_date\", \"valueExp\": \"current_month\"}]}], \"metrics\": [{\"agg\": \"SUM\", \"field\": \"revenue\", \"label\": \"营收\"}], \"asOfDate\": \"2026-06-15\", \"datasetId\": \"9101\", \"orderList\": [], \"dimensions\": [], \"havingFilters\": []}','{\"progress\": {\"color\": \"#1677FF\", \"shape\": \"gauge\", \"target\": 1000000, \"showLabel\": true, \"trackColor\": \"#E6F4FF\"}, \"chartType\": \"progress\", \"showTitle\": true, \"allowDetail\": true}','EBL',NULL,NULL,1788879283413,1);
INSERT INTO `vis_card` (`id`, `card_name`, `card_desc`, `dataset_id`, `chart_type`, `query_json`, `visual_json`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9205,'本月毛利率','毛利占实收',9101,'progress','{\"filters\": [{\"combineOp\": \"and\", \"conditions\": [{\"field\": \"order_date\", \"valueExp\": \"current_month\"}]}], \"metrics\": [{\"agg\": \"SUM\", \"field\": \"profit\", \"label\": \"毛利\"}, {\"agg\": \"SUM\", \"field\": \"revenue\", \"label\": \"营收\"}], \"asOfDate\": \"2026-06-15\", \"datasetId\": \"9101\"}','{\"progress\": {\"color\": \"#52C41A\", \"prefix\": \"¥\", \"decimals\": 0, \"showLabel\": true, \"trackColor\": \"#F6FFED\"}, \"chartType\": \"progress\", \"showTitle\": true, \"allowDetail\": true}','EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_card` (`id`, `card_name`, `card_desc`, `dataset_id`, `chart_type`, `query_json`, `visual_json`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9206,'近30日营收趋势','最新一日实收与近30日走势',9101,'trend','{\"filters\": [{\"combineOp\": \"and\", \"conditions\": [{\"field\": \"order_date\", \"value\": [30], \"valueExp\": \"last_days\"}]}], \"metrics\": [{\"agg\": \"SUM\", \"field\": \"revenue\", \"label\": \"营收\"}, {\"agg\": \"SUM\", \"field\": \"profit\", \"label\": \"毛利\"}], \"asOfDate\": \"2026-06-15\", \"datasetId\": \"9101\", \"orderList\": [{\"dir\": \"asc\", \"field\": \"日\"}], \"dimensions\": [{\"field\": \"order_date\", \"label\": \"日\", \"timeGrain\": \"day\"}]}','{\"number\": {\"size\": \"lg\", \"prefix\": \"¥\", \"showLabel\": true, \"showAuxLabel\": true}, \"chartType\": \"trend\", \"showTitle\": true, \"allowDetail\": true}','EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_card` (`id`, `card_name`, `card_desc`, `dataset_id`, `chart_type`, `query_json`, `visual_json`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9207,'近30日日销走势','实收与件数双轴',9101,'line','{\"filters\": [{\"combineOp\": \"and\", \"conditions\": [{\"field\": \"order_date\", \"value\": [30], \"valueExp\": \"last_days\"}]}], \"metrics\": [{\"agg\": \"SUM\", \"field\": \"revenue\", \"label\": \"营收\"}, {\"agg\": \"SUM\", \"field\": \"qty\", \"label\": \"件数\"}], \"asOfDate\": \"2026-06-15\", \"datasetId\": \"9101\", \"orderList\": [{\"dir\": \"asc\", \"field\": \"日\"}], \"dimensions\": [{\"field\": \"order_date\", \"label\": \"日\", \"timeGrain\": \"day\"}]}','{\"chart\": {\"area\": true, \"smooth\": true, \"dualAxis\": true, \"legendPosition\": \"top\"}, \"chartType\": \"line\", \"showTitle\": true, \"allowDetail\": true}','EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_card` (`id`, `card_name`, `card_desc`, `dataset_id`, `chart_type`, `query_json`, `visual_json`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9208,'本年渠道营收','月度渠道堆叠',9101,'bar','{\"filters\": [{\"combineOp\": \"and\", \"conditions\": [{\"field\": \"order_date\", \"valueExp\": \"current_year\"}]}], \"metrics\": [{\"agg\": \"SUM\", \"field\": \"revenue\", \"label\": \"营收\"}], \"asOfDate\": \"2026-06-15\", \"datasetId\": \"9101\", \"orderList\": [{\"dir\": \"asc\", \"field\": \"月份\"}], \"dimensions\": [{\"field\": \"order_date\", \"label\": \"月份\", \"timeGrain\": \"month\"}, {\"field\": \"channel\", \"label\": \"渠道\"}]}','{\"chart\": {\"stacked\": true, \"dataLabel\": false}, \"chartType\": \"bar\", \"showTitle\": true, \"allowDetail\": true}','EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_card` (`id`, `card_name`, `card_desc`, `dataset_id`, `chart_type`, `query_json`, `visual_json`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9209,'本月区域营收','各大区本月实收',9101,'bar','{\"filters\": [{\"combineOp\": \"and\", \"conditions\": [{\"field\": \"order_date\", \"valueExp\": \"current_month\"}]}], \"metrics\": [{\"agg\": \"SUM\", \"field\": \"revenue\", \"label\": \"营收\"}], \"asOfDate\": \"2026-06-15\", \"datasetId\": \"9101\", \"orderList\": [{\"dir\": \"desc\", \"field\": \"营收\"}], \"dimensions\": [{\"field\": \"region\", \"label\": \"区域\"}]}','{\"chart\": {\"legend\": false, \"markLines\": [{\"kind\": \"avg\", \"label\": \"平均\"}], \"orientation\": \"horizontal\"}, \"chartType\": \"bar\", \"showTitle\": true, \"allowDetail\": true}','EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_card` (`id`, `card_name`, `card_desc`, `dataset_id`, `chart_type`, `query_json`, `visual_json`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9210,'本月区域构成','本月实收占比',9101,'pie','{\"filters\": [{\"combineOp\": \"and\", \"conditions\": [{\"field\": \"order_date\", \"valueExp\": \"current_month\"}]}], \"metrics\": [{\"agg\": \"SUM\", \"field\": \"revenue\", \"label\": \"营收\"}], \"asOfDate\": \"2026-06-15\", \"datasetId\": \"9101\", \"orderList\": [{\"dir\": \"desc\", \"field\": \"营收\"}], \"dimensions\": [{\"field\": \"region\", \"label\": \"区域\"}]}','{\"chart\": {\"donut\": true, \"legendPosition\": \"left\"}, \"chartType\": \"pie\", \"showTitle\": true, \"allowDetail\": true}','EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_card` (`id`, `card_name`, `card_desc`, `dataset_id`, `chart_type`, `query_json`, `visual_json`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9211,'本月品类结构','品类件数构成',9101,'pie','{\"filters\": [{\"combineOp\": \"and\", \"conditions\": [{\"field\": \"order_date\", \"valueExp\": \"current_month\"}]}], \"metrics\": [{\"agg\": \"SUM\", \"field\": \"qty\", \"label\": \"件数\"}], \"asOfDate\": \"2026-06-15\", \"datasetId\": \"9101\", \"orderList\": [{\"dir\": \"desc\", \"field\": \"件数\"}], \"dimensions\": [{\"field\": \"category\", \"label\": \"品类\"}]}','{\"chart\": {\"donut\": true}, \"chartType\": \"pie\", \"showTitle\": true, \"allowDetail\": true}','EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_card` (`id`, `card_name`, `card_desc`, `dataset_id`, `chart_type`, `query_json`, `visual_json`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9212,'区域品类经营表','本月实收、毛利、会员与利润率',9101,'table','{\"limit\": 50, \"params\": [], \"filters\": [{\"combineOp\": \"and\", \"conditions\": [{\"field\": \"order_date\", \"valueExp\": \"current_month\"}]}], \"metrics\": [{\"agg\": \"SUM\", \"field\": \"revenue\", \"label\": \"营收\"}, {\"agg\": \"SUM\", \"field\": \"profit\", \"label\": \"毛利\"}, {\"agg\": \"SUM\", \"field\": \"qty\", \"label\": \"件数\"}, {\"agg\": \"COUNT_DISTINCT\", \"field\": \"user_id\", \"label\": \"会员数\"}, {\"field\": \"利润率\", \"label\": \"利润率\", \"formula\": \"SUM(profit)/SUM(revenue)*100\"}], \"asOfDate\": \"2026-06-15\", \"datasetId\": \"9101\", \"orderList\": [{\"dir\": \"desc\", \"field\": \"营收\"}], \"dimensions\": [{\"field\": \"region\", \"label\": \"区域\"}, {\"field\": \"category\", \"label\": \"品类\"}], \"havingFilters\": []}','{\"table\": {\"marks\": [{\"style\": {\"color\": \"#047857\", \"italic\": true}, \"fields\": [\"利润率\"]}, {\"style\": {\"bold\": true, \"color\": \"#F5222D\", \"bgColor\": \"#FFCCC7\"}, \"fields\": [\"营收\"], \"filters\": [{\"op\": \"gt\", \"field\": \"营收\", \"value\": [400000]}], \"combineOp\": \"and\"}], \"striped\": true, \"showFilter\": true, \"showRowNumber\": true}, \"chartType\": \"table\", \"showTitle\": true, \"chartTheme\": \"CONTRAST\", \"allowDetail\": true, \"allowDownload\": true}','EBL',NULL,NULL,1788882894321,1);
INSERT INTO `vis_card` (`id`, `card_name`, `card_desc`, `dataset_id`, `chart_type`, `query_json`, `visual_json`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9213,'渠道同比分析','本月渠道实收及同比',9101,'table','{\"params\": [], \"filters\": [{\"combineOp\": \"and\", \"conditions\": [{\"field\": \"order_date\", \"valueExp\": \"current_month\"}]}], \"metrics\": [{\"agg\": \"SUM\", \"field\": \"revenue\", \"label\": \"营收\"}, {\"agg\": \"SUM\", \"field\": \"revenue\", \"label\": \"同比\", \"contrast\": {\"calcType\": \"diffRate\", \"valueExp\": \"current_month\", \"timeField\": \"order_date\", \"calcMethod\": \"shift_year\"}}, {\"agg\": \"SUM\", \"field\": \"revenue\", \"label\": \"环比\", \"contrast\": {\"calcType\": \"diffRate\", \"valueExp\": \"current_month\", \"timeField\": \"order_date\", \"calcMethod\": \"shift_month\"}}], \"asOfDate\": \"2026-06-15\", \"datasetId\": \"9101\", \"orderList\": [{\"dir\": \"desc\", \"field\": \"营收\"}], \"dimensions\": [{\"field\": \"region\", \"label\": \"区域\"}, {\"field\": \"channel\", \"label\": \"渠道\"}], \"havingFilters\": []}','{\"table\": {\"striped\": true, \"showFilter\": true}, \"chartType\": \"table\", \"showTitle\": true, \"allowDetail\": true, \"fieldStyles\": [{\"key\": \"m:revenue:SUM:order_date:shift_year:diffRate:current_month\", \"kind\": \"metric\", \"format\": {\"suffix\": \"%\"}, \"sourceUid\": \"m:revenue:SUM:order_date:shift_year:diffRate:current_month\"}, {\"key\": \"m:revenue:SUM:order_date:shift_month:diffRate:current_month\", \"kind\": \"metric\", \"format\": {\"suffix\": \"%\"}, \"sourceUid\": \"m:revenue:SUM:order_date:shift_month:diffRate:current_month\"}], \"allowDownload\": true}','EBL',NULL,NULL,1788431251589,1);
INSERT INTO `vis_card` (`id`, `card_name`, `card_desc`, `dataset_id`, `chart_type`, `query_json`, `visual_json`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9214,'区域品类透视','本月区域×品类×渠道',9101,'pivot','{\"filters\": [{\"combineOp\": \"and\", \"conditions\": [{\"field\": \"order_date\", \"valueExp\": \"current_month\"}]}], \"metrics\": [{\"agg\": \"SUM\", \"field\": \"revenue\", \"label\": \"营收\"}], \"asOfDate\": \"2026-06-15\", \"datasetId\": \"9101\", \"colDimensions\": [{\"field\": \"channel\", \"label\": \"渠道\"}], \"rowDimensions\": [{\"field\": \"region\", \"label\": \"区域\"}, {\"field\": \"category\", \"label\": \"品类\"}]}','{\"table\": {\"sortColumn\": true, \"treeDisplay\": true}, \"rowTotal\": true, \"chartType\": \"pivot\", \"showTitle\": true, \"allowDetail\": true, \"columnTotal\": true, \"rowSubtotal\": true}','EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_card` (`id`, `card_name`, `card_desc`, `dataset_id`, `chart_type`, `query_json`, `visual_json`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9215,'本年区域月度透视','各大区月度实收',9101,'pivot','{\"filters\": [{\"combineOp\": \"and\", \"conditions\": [{\"field\": \"order_date\", \"valueExp\": \"current_year\"}]}], \"metrics\": [{\"agg\": \"SUM\", \"field\": \"revenue\", \"label\": \"营收\"}], \"asOfDate\": \"2026-06-15\", \"datasetId\": \"9101\", \"colDimensions\": [{\"field\": \"order_date\", \"label\": \"月份\", \"timeGrain\": \"month\"}], \"rowDimensions\": [{\"field\": \"region\", \"label\": \"区域\"}]}','{\"table\": {\"striped\": true}, \"rowTotal\": true, \"chartType\": \"pivot\", \"showTitle\": true, \"allowDetail\": true, \"columnTotal\": true}','EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_card` (`id`, `card_name`, `card_desc`, `dataset_id`, `chart_type`, `query_json`, `visual_json`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9216,'本月商品销量榜','件数 Top 10',9101,'rank','{\"limit\": 10, \"filters\": [{\"combineOp\": \"and\", \"conditions\": [{\"field\": \"order_date\", \"valueExp\": \"current_month\"}]}], \"metrics\": [{\"agg\": \"SUM\", \"field\": \"qty\", \"label\": \"件数\"}], \"asOfDate\": \"2026-06-15\", \"datasetId\": \"9101\", \"orderList\": [{\"dir\": \"desc\", \"field\": \"件数\"}], \"dimensions\": [{\"field\": \"product\", \"label\": \"商品\"}]}','{\"rank\": {\"size\": \"md\", \"showPercent\": true}, \"chartType\": \"rank\", \"showTitle\": true, \"allowDetail\": true}','EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_card` (`id`, `card_name`, `card_desc`, `dataset_id`, `chart_type`, `query_json`, `visual_json`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9217,'本月区域营收排行','各大区实收占比',9101,'rank','{\"filters\": [{\"combineOp\": \"and\", \"conditions\": [{\"field\": \"order_date\", \"valueExp\": \"current_month\"}]}], \"metrics\": [{\"agg\": \"SUM\", \"field\": \"revenue\", \"label\": \"营收\"}], \"asOfDate\": \"2026-06-15\", \"datasetId\": \"9101\", \"orderList\": [{\"dir\": \"desc\", \"field\": \"营收\"}], \"dimensions\": [{\"field\": \"region\", \"label\": \"区域\"}]}','{\"rank\": {\"size\": \"lg\", \"prefix\": \"¥\", \"compact\": true, \"showPercent\": true}, \"chartType\": \"rank\", \"showTitle\": true, \"allowDetail\": true}','EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_card` (`id`, `card_name`, `card_desc`, `dataset_id`, `chart_type`, `query_json`, `visual_json`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9218,'订单履约漏斗','本月订单状态件数',9101,'funnel','{\"filters\": [{\"combineOp\": \"and\", \"conditions\": [{\"field\": \"order_date\", \"valueExp\": \"current_month\"}]}], \"metrics\": [{\"agg\": \"SUM\", \"field\": \"qty\", \"label\": \"件数\"}], \"asOfDate\": \"2026-06-15\", \"datasetId\": \"9101\", \"orderList\": [{\"dir\": \"desc\", \"field\": \"件数\"}], \"dimensions\": [{\"field\": \"status\", \"label\": \"状态\"}]}','{\"chart\": {\"showRate\": true}, \"chartType\": \"funnel\", \"showTitle\": true, \"allowDetail\": true}','EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_card` (`id`, `card_name`, `card_desc`, `dataset_id`, `chart_type`, `query_json`, `visual_json`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9219,'区域经营雷达','营收、毛利、件数',9101,'radar','{\"filters\": [{\"combineOp\": \"and\", \"conditions\": [{\"field\": \"order_date\", \"valueExp\": \"current_month\"}]}], \"metrics\": [{\"agg\": \"SUM\", \"field\": \"revenue\", \"label\": \"营收\"}, {\"agg\": \"SUM\", \"field\": \"profit\", \"label\": \"毛利\"}, {\"agg\": \"SUM\", \"field\": \"qty\", \"label\": \"件数\"}], \"asOfDate\": \"2026-06-15\", \"datasetId\": \"9101\", \"dimensions\": [{\"field\": \"region\", \"label\": \"区域\"}]}','{\"chartType\": \"radar\", \"showTitle\": true, \"allowDetail\": true}','EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_card` (`id`, `card_name`, `card_desc`, `dataset_id`, `chart_type`, `query_json`, `visual_json`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9220,'品类件量与营收','本年品类散点',9101,'scatter','{\"filters\": [{\"combineOp\": \"and\", \"conditions\": [{\"field\": \"order_date\", \"valueExp\": \"current_year\"}]}], \"metrics\": [{\"agg\": \"SUM\", \"field\": \"qty\", \"label\": \"件数\"}, {\"agg\": \"SUM\", \"field\": \"revenue\", \"label\": \"营收\"}], \"asOfDate\": \"2026-06-15\", \"datasetId\": \"9101\", \"dimensions\": [{\"field\": \"category\", \"label\": \"品类\"}]}','{\"chart\": {\"crosshair\": true, \"dataLabel\": true}, \"chartType\": \"scatter\", \"showTitle\": true, \"allowDetail\": true}','EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_card` (`id`, `card_name`, `card_desc`, `dataset_id`, `chart_type`, `query_json`, `visual_json`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9221,'本年营收与订单量','月度组合图',9101,'combo','{\"filters\": [{\"combineOp\": \"and\", \"conditions\": [{\"field\": \"order_date\", \"valueExp\": \"current_year\"}]}], \"metrics\": [{\"agg\": \"SUM\", \"field\": \"revenue\", \"label\": \"营收\"}, {\"agg\": \"SUM\", \"field\": \"qty\", \"label\": \"件数\"}], \"asOfDate\": \"2026-06-15\", \"datasetId\": \"9101\", \"orderList\": [{\"dir\": \"asc\", \"field\": \"月份\"}], \"dimensions\": [{\"field\": \"order_date\", \"label\": \"月份\", \"timeGrain\": \"month\"}]}','{\"chart\": {\"smooth\": true}, \"chartType\": \"combo\", \"showTitle\": true, \"allowDetail\": true}','EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_card` (`id`, `card_name`, `card_desc`, `dataset_id`, `chart_type`, `query_json`, `visual_json`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9222,'区域营收成本对比','本月各大区',9101,'tornado','{\"filters\": [{\"combineOp\": \"and\", \"conditions\": [{\"field\": \"order_date\", \"valueExp\": \"current_month\"}]}], \"metrics\": [{\"agg\": \"SUM\", \"field\": \"revenue\", \"label\": \"营收\"}, {\"agg\": \"SUM\", \"field\": \"cost\", \"label\": \"成本\"}], \"asOfDate\": \"2026-06-15\", \"datasetId\": \"9101\", \"orderList\": [{\"dir\": \"desc\", \"field\": \"营收\"}], \"dimensions\": [{\"field\": \"region\", \"label\": \"区域\"}]}','{\"chartType\": \"tornado\", \"showTitle\": true, \"allowDetail\": true}','EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_card` (`id`, `card_name`, `card_desc`, `dataset_id`, `chart_type`, `query_json`, `visual_json`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9223,'本年营收累计','月度累加',9101,'waterfall','{\"filters\": [{\"combineOp\": \"and\", \"conditions\": [{\"field\": \"order_date\", \"valueExp\": \"current_year\"}]}], \"metrics\": [{\"agg\": \"SUM\", \"field\": \"revenue\", \"label\": \"营收\"}], \"asOfDate\": \"2026-06-15\", \"datasetId\": \"9101\", \"orderList\": [{\"dir\": \"asc\", \"field\": \"月份\"}], \"dimensions\": [{\"field\": \"order_date\", \"label\": \"月份\", \"timeGrain\": \"month\"}]}','{\"chart\": {\"dataLabel\": true, \"markLines\": [{\"kind\": \"avg\", \"label\": \"月均\"}]}, \"chartType\": \"waterfall\", \"showTitle\": true, \"allowDetail\": true}','EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_card` (`id`, `card_name`, `card_desc`, `dataset_id`, `chart_type`, `query_json`, `visual_json`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9224,'区域渠道热力','本月实收分布',9101,'heatmap','{\"filters\": [{\"combineOp\": \"and\", \"conditions\": [{\"field\": \"order_date\", \"valueExp\": \"current_month\"}]}], \"metrics\": [{\"agg\": \"SUM\", \"field\": \"revenue\", \"label\": \"营收\"}], \"asOfDate\": \"2026-06-15\", \"datasetId\": \"9101\", \"dimensions\": [{\"field\": \"region\", \"label\": \"区域\"}, {\"field\": \"channel\", \"label\": \"渠道\"}]}','{\"chartType\": \"heatmap\", \"showTitle\": true, \"allowDetail\": true}','EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_card` (`id`, `card_name`, `card_desc`, `dataset_id`, `chart_type`, `query_json`, `visual_json`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9225,'区域品类结构','本月实收矩形树',9101,'treemap','{\"filters\": [{\"combineOp\": \"and\", \"conditions\": [{\"field\": \"order_date\", \"valueExp\": \"current_month\"}]}], \"metrics\": [{\"agg\": \"SUM\", \"field\": \"revenue\", \"label\": \"营收\"}], \"asOfDate\": \"2026-06-15\", \"datasetId\": \"9101\", \"dimensions\": [{\"field\": \"region\", \"label\": \"区域\"}, {\"field\": \"category\", \"label\": \"品类\"}]}','{\"chart\": {\"dataLabel\": true}, \"chartType\": \"treemap\", \"showTitle\": true, \"allowDetail\": true}','EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_card` (`id`, `card_name`, `card_desc`, `dataset_id`, `chart_type`, `query_json`, `visual_json`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9226,'本月热销商品','按件数',9101,'wordcloud','{\"limit\": 20, \"filters\": [{\"combineOp\": \"and\", \"conditions\": [{\"field\": \"order_date\", \"valueExp\": \"current_month\"}]}], \"metrics\": [{\"agg\": \"SUM\", \"field\": \"qty\", \"label\": \"件数\"}], \"asOfDate\": \"2026-06-15\", \"datasetId\": \"9101\", \"orderList\": [{\"dir\": \"desc\", \"field\": \"件数\"}], \"dimensions\": [{\"field\": \"product\", \"label\": \"商品\"}]}','{\"chartType\": \"wordcloud\", \"showTitle\": true, \"allowDetail\": true}','EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_card` (`id`, `card_name`, `card_desc`, `dataset_id`, `chart_type`, `query_json`, `visual_json`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9227,'区域目标进度','本月各大区完成率',9101,'kpi','{\"filters\": [{\"combineOp\": \"and\", \"conditions\": [{\"field\": \"order_date\", \"valueExp\": \"current_month\"}]}], \"metrics\": [{\"agg\": \"SUM\", \"field\": \"revenue\", \"label\": \"营收\"}, {\"field\": \"目标\", \"label\": \"目标\", \"formula\": \"SUM(revenue)*1.15\"}], \"asOfDate\": \"2026-06-15\", \"datasetId\": \"9101\", \"orderList\": [{\"dir\": \"desc\", \"field\": \"营收\"}], \"dimensions\": [{\"field\": \"region\", \"label\": \"区域\"}]}','{\"kpi\": {\"prefix\": \"¥\", \"showValue\": true, \"periodMode\": \"month\"}, \"chartType\": \"kpi\", \"showTitle\": true, \"allowDetail\": true}','EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_card` (`id`, `card_name`, `card_desc`, `dataset_id`, `chart_type`, `query_json`, `visual_json`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9228,'渠道目标进度','本季渠道对照固定目标',9101,'kpi','{\"filters\": [{\"combineOp\": \"and\", \"conditions\": [{\"field\": \"order_date\", \"valueExp\": \"current_month\"}]}], \"metrics\": [{\"agg\": \"SUM\", \"field\": \"revenue\", \"label\": \"营收\"}], \"asOfDate\": \"2026-06-15\", \"datasetId\": \"9101\", \"orderList\": [{\"dir\": \"desc\", \"field\": \"营收\"}], \"dimensions\": [{\"field\": \"channel\", \"label\": \"渠道\"}]}','{\"kpi\": {\"prefix\": \"¥\", \"target\": 250000, \"decimals\": 0, \"periodMode\": \"month\"}, \"chartType\": \"kpi\", \"showTitle\": true, \"allowDetail\": true}','EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_card` (`id`, `card_name`, `card_desc`, `dataset_id`, `chart_type`, `query_json`, `visual_json`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9229,'品类贡献','本月品类实收拆解',9101,'waterfall','{\"filters\": [{\"combineOp\": \"and\", \"conditions\": [{\"field\": \"order_date\", \"valueExp\": \"current_month\"}]}], \"metrics\": [{\"agg\": \"SUM\", \"field\": \"revenue\", \"label\": \"营收\"}], \"asOfDate\": \"2026-06-15\", \"datasetId\": \"9101\", \"orderList\": [{\"dir\": \"desc\", \"field\": \"营收\"}], \"dimensions\": [{\"field\": \"category\", \"label\": \"品类\"}]}','{\"chart\": {\"dataLabel\": true, \"orientation\": \"horizontal\"}, \"chartType\": \"waterfall\", \"showTitle\": true, \"allowDetail\": true}','EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_card` (`id`, `card_name`, `card_desc`, `dataset_id`, `chart_type`, `query_json`, `visual_json`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9230,'品类月度热力','本年品类×月份件数',9101,'heatmap','{\"filters\": [{\"combineOp\": \"and\", \"conditions\": [{\"field\": \"order_date\", \"valueExp\": \"current_year\"}]}], \"metrics\": [{\"agg\": \"SUM\", \"field\": \"qty\", \"label\": \"件数\"}], \"asOfDate\": \"2026-06-15\", \"datasetId\": \"9101\", \"dimensions\": [{\"field\": \"category\", \"label\": \"品类\"}, {\"field\": \"order_date\", \"label\": \"月份\", \"timeGrain\": \"month\"}]}','{\"chartType\": \"heatmap\", \"showTitle\": true, \"allowDetail\": true}','EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_card` (`id`, `card_name`, `card_desc`, `dataset_id`, `chart_type`, `query_json`, `visual_json`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9231,'重点区域渠道对比','默认看华东、华南线上',9102,'bar','{\"params\": [{\"field\": \"region\", \"value\": [\"华东\", \"华南\"]}, {\"field\": \"order_date\", \"valueExp\": \"current_month\"}], \"metrics\": [{\"agg\": \"SUM\", \"field\": \"revenue\", \"label\": \"营收\"}], \"asOfDate\": \"2026-06-15\", \"datasetId\": \"9102\", \"dimensions\": [{\"field\": \"channel\", \"label\": \"渠道\"}]}','{\"chartType\": \"bar\", \"showTitle\": true, \"allowDetail\": true, \"description\": \"可按大区、渠道、日期收窄\", \"showDescription\": true}','EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_card` (`id`, `card_name`, `card_desc`, `dataset_id`, `chart_type`, `query_json`, `visual_json`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9232,'经营简报','6 月经营口径说明',0,'richtext','{\"datasetId\": \"\"}','{\"richtext\": {\"html\": \"<h3>启明零售 · 6 月经营快报</h3><p>口径为全渠道实收（含税），基准日 <b>2026-06-15</b>。</p><ul><li>关注本月目标完成与同比、环比</li><li>华东、华南仍是线上主力，西部看门店与经销补量</li><li>数码件均高、服饰与美妆毛利更好</li></ul>\"}, \"chartType\": \"richtext\", \"showTitle\": true}','EBL',NULL,NULL,NULL,NULL);

-- vis_dash_group：当前数据 3 条
DROP TABLE IF EXISTS `vis_dash_group`;
CREATE TABLE `vis_dash_group` (
  `id` bigint NOT NULL,
  `pid` bigint NOT NULL DEFAULT '0',
  `group_name` varchar(50) NOT NULL,
  `icon` varchar(50) DEFAULT NULL,
  `sort_num` int DEFAULT '0',
  `status` char(3) NOT NULL DEFAULT 'EBL',
  `create_at` bigint DEFAULT NULL,
  `create_by` bigint DEFAULT NULL,
  `modify_at` bigint DEFAULT NULL,
  `modify_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_pid` (`pid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='çœ‹æ¿åˆ†ç»„';
INSERT INTO `vis_dash_group` (`id`, `pid`, `group_name`, `icon`, `sort_num`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9601,0,'经营分析','board-line',10,'EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_dash_group` (`id`, `pid`, `group_name`, `icon`, `sort_num`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9602,0,'销售运营','chart-line-line',20,'EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_dash_group` (`id`, `pid`, `group_name`, `icon`, `sort_num`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9603,0,'商品洞察','box-2-line',30,'EBL',NULL,NULL,NULL,NULL);

-- vis_dashboard：当前数据 4 条
DROP TABLE IF EXISTS `vis_dashboard`;
CREATE TABLE `vis_dashboard` (
  `id` bigint NOT NULL,
  `group_id` bigint NOT NULL DEFAULT '0',
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
INSERT INTO `vis_dashboard` (`id`, `group_id`, `dash_name`, `dash_desc`, `icon`, `config_json`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9501,9601,'经营驾驶舱','管理层周会：目标、结构、近30日走势',NULL,'{\"filters\": [{\"op\": \"in\", \"uid\": \"f-region\", \"field\": \"region\", \"label\": \"大区\", \"applyAs\": \"filter\", \"formType\": \"inputTag\", \"datasetId\": \"9101\"}, {\"op\": \"in\", \"uid\": \"f-channel\", \"field\": \"channel\", \"label\": \"渠道\", \"applyAs\": \"filter\", \"formType\": \"inputTag\", \"datasetId\": \"9101\"}], \"widgets\": [{\"h\": 5, \"w\": 5, \"x\": 0, \"y\": 0, \"kind\": \"card\", \"cardId\": \"9201\"}, {\"h\": 5, \"w\": 7, \"x\": 5, \"y\": 0, \"kind\": \"card\", \"cardId\": \"9202\"}, {\"h\": 5, \"w\": 6, \"x\": 18, \"y\": 0, \"kind\": \"card\", \"cardId\": \"9204\"}, {\"h\": 5, \"w\": 6, \"x\": 12, \"y\": 0, \"kind\": \"card\", \"cardId\": \"9205\"}, {\"h\": 16, \"w\": 24, \"x\": 0, \"y\": 5, \"id\": \"g-sales\", \"kind\": \"group\", \"mode\": \"tabs\", \"pages\": [{\"id\": \"p-mthbp4im-ez4vyg\", \"items\": [{\"h\": 14, \"w\": 24, \"x\": 0, \"y\": 0, \"cardId\": \"9208\"}]}, {\"id\": \"p-mthbp4im-m7td2i\", \"items\": [{\"h\": 14, \"w\": 24, \"x\": 0, \"y\": 0, \"cardId\": \"9210\"}]}], \"title\": \"销售结构\", \"description\": \"本年渠道堆叠与本月区域构成\", \"showCardTitle\": false}, {\"h\": 8, \"w\": 8, \"x\": 0, \"y\": 21, \"kind\": \"card\", \"cardId\": \"9206\"}, {\"h\": 10, \"w\": 8, \"x\": 0, \"y\": 29, \"kind\": \"card\", \"cardId\": \"9217\"}, {\"h\": 18, \"w\": 16, \"x\": 8, \"y\": 21, \"kind\": \"card\", \"cardId\": \"9207\"}, {\"h\": 12, \"w\": 16, \"x\": 0, \"y\": 39, \"kind\": \"card\", \"cardId\": \"9223\"}, {\"h\": 12, \"w\": 8, \"x\": 16, \"y\": 39, \"kind\": \"card\", \"cardId\": \"9232\"}, {\"h\": 4, \"w\": 24, \"x\": 0, \"y\": 51, \"id\": \"t-mtlcrjb4-vzivet\", \"html\": \"<p><span style=\\\"color:rgb( 250 , 140 , 22 )\\\"><strong>hello world</strong></span></p><p></p>\", \"kind\": \"text\", \"appearance\": {\"padding\": \"md\", \"surface\": \"card\", \"verticalAlign\": \"start\"}}], \"cardRadius\": \"xl\"}','EBL',1787832902000,1,1789011096433,1);
INSERT INTO `vis_dashboard` (`id`, `group_id`, `dash_name`, `dash_desc`, `icon`, `config_json`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9502,9602,'销售分析','区域品类明细、透视与同比',NULL,'{\"filters\": [{\"op\": \"in\", \"uid\": \"f-region\", \"field\": \"region\", \"label\": \"大区\", \"applyAs\": \"filter\", \"formType\": \"multiSelect\", \"datasetId\": \"9101\"}, {\"uid\": \"f-dateexp\", \"field\": \"order_date\", \"label\": \"下单日\", \"applyAs\": \"filter\", \"formType\": \"dateExp\", \"datasetId\": \"9101\"}, {\"uid\": \"f-region-p\", \"field\": \"region\", \"label\": \"专题大区\", \"applyAs\": \"param\", \"formType\": \"multiSelect\", \"datasetId\": \"9102\"}], \"widgets\": [{\"h\": 14, \"w\": 16, \"x\": 0, \"y\": 0, \"kind\": \"card\", \"cardId\": \"9212\"}, {\"h\": 14, \"w\": 8, \"x\": 16, \"y\": 0, \"kind\": \"card\", \"cardId\": \"9214\"}, {\"h\": 12, \"w\": 12, \"x\": 0, \"y\": 14, \"kind\": \"card\", \"cardId\": \"9213\"}, {\"h\": 12, \"w\": 12, \"x\": 12, \"y\": 14, \"kind\": \"card\", \"cardId\": \"9221\"}, {\"h\": 14, \"w\": 12, \"x\": 0, \"y\": 26, \"kind\": \"card\", \"cardId\": \"9215\"}, {\"h\": 14, \"w\": 12, \"x\": 12, \"y\": 26, \"kind\": \"card\", \"cardId\": \"9231\"}]}','EBL',1787832902000,1,1788270582912,1);
INSERT INTO `vis_dashboard` (`id`, `group_id`, `dash_name`, `dash_desc`, `icon`, `config_json`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9503,9603,'商品洞察','榜单、结构、季节热力',NULL,'{\"filters\": [{\"op\": \"in\", \"uid\": \"f-region\", \"field\": \"region\", \"label\": \"大区\", \"applyAs\": \"filter\", \"formType\": \"multiSelect\", \"datasetId\": \"9101\"}, {\"op\": \"in\", \"uid\": \"f-category\", \"field\": \"category\", \"label\": \"品类\", \"applyAs\": \"filter\", \"formType\": \"multiSelect\", \"datasetId\": \"9101\"}], \"widgets\": [{\"h\": 16, \"w\": 8, \"x\": 0, \"y\": 0, \"kind\": \"card\", \"cardId\": \"9216\"}, {\"h\": 16, \"w\": 8, \"x\": 8, \"y\": 0, \"kind\": \"card\", \"cardId\": \"9226\"}, {\"h\": 16, \"w\": 8, \"x\": 16, \"y\": 0, \"kind\": \"card\", \"cardId\": \"9211\"}, {\"h\": 14, \"w\": 8, \"x\": 0, \"y\": 16, \"kind\": \"card\", \"cardId\": \"9220\"}, {\"h\": 14, \"w\": 8, \"x\": 8, \"y\": 16, \"kind\": \"card\", \"cardId\": \"9225\"}, {\"h\": 14, \"w\": 8, \"x\": 16, \"y\": 16, \"kind\": \"card\", \"cardId\": \"9229\"}, {\"h\": 14, \"w\": 24, \"x\": 0, \"y\": 30, \"kind\": \"card\", \"cardId\": \"9230\"}]}','EBL',1787832902000,1,1788270606707,1);
INSERT INTO `vis_dashboard` (`id`, `group_id`, `dash_name`, `dash_desc`, `icon`, `config_json`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9504,9602,'渠道与履约','渠道目标、成本对比、订单状态',NULL,'{\"filters\": [{\"op\": \"in\", \"uid\": \"f-region\", \"field\": \"region\", \"label\": \"大区\", \"applyAs\": \"filter\", \"formType\": \"multiSelect\", \"datasetId\": \"9101\"}, {\"op\": \"in\", \"uid\": \"f-channel\", \"field\": \"channel\", \"label\": \"渠道\", \"applyAs\": \"filter\", \"formType\": \"multiSelect\", \"datasetId\": \"9101\"}], \"widgets\": [{\"h\": 8, \"w\": 6, \"x\": 0, \"y\": 0, \"kind\": \"card\", \"cardId\": \"9203\"}, {\"h\": 12, \"w\": 9, \"x\": 6, \"y\": 0, \"kind\": \"card\", \"cardId\": \"9227\"}, {\"h\": 12, \"w\": 9, \"x\": 15, \"y\": 0, \"kind\": \"card\", \"cardId\": \"9228\"}, {\"h\": 14, \"w\": 8, \"x\": 0, \"y\": 12, \"kind\": \"card\", \"cardId\": \"9218\"}, {\"h\": 14, \"w\": 8, \"x\": 8, \"y\": 12, \"kind\": \"card\", \"cardId\": \"9222\"}, {\"h\": 14, \"w\": 8, \"x\": 16, \"y\": 12, \"kind\": \"card\", \"cardId\": \"9224\"}, {\"h\": 14, \"w\": 12, \"x\": 0, \"y\": 26, \"kind\": \"card\", \"cardId\": \"9219\"}, {\"h\": 14, \"w\": 12, \"x\": 12, \"y\": 26, \"kind\": \"card\", \"cardId\": \"9209\"}]}','EBL',1787832902000,1,1788270569150,1);

-- vis_dashboard_card：当前数据 32 条
DROP TABLE IF EXISTS `vis_dashboard_card`;
CREATE TABLE `vis_dashboard_card` (
  `id` bigint NOT NULL,
  `dashboard_id` bigint NOT NULL,
  `card_id` bigint NOT NULL,
  `create_at` bigint DEFAULT NULL,
  `create_by` bigint DEFAULT NULL,
  `modify_at` bigint DEFAULT NULL,
  `modify_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dash_card` (`dashboard_id`,`card_id`),
  KEY `idx_card` (`card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='看板卡片索引';
INSERT INTO `vis_dashboard_card` (`id`, `dashboard_id`, `card_id`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (950201,9502,9212,NULL,NULL,NULL,NULL);
INSERT INTO `vis_dashboard_card` (`id`, `dashboard_id`, `card_id`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (950202,9502,9214,NULL,NULL,NULL,NULL);
INSERT INTO `vis_dashboard_card` (`id`, `dashboard_id`, `card_id`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (950203,9502,9213,NULL,NULL,NULL,NULL);
INSERT INTO `vis_dashboard_card` (`id`, `dashboard_id`, `card_id`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (950204,9502,9221,NULL,NULL,NULL,NULL);
INSERT INTO `vis_dashboard_card` (`id`, `dashboard_id`, `card_id`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (950205,9502,9215,NULL,NULL,NULL,NULL);
INSERT INTO `vis_dashboard_card` (`id`, `dashboard_id`, `card_id`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (950206,9502,9231,NULL,NULL,NULL,NULL);
INSERT INTO `vis_dashboard_card` (`id`, `dashboard_id`, `card_id`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (950301,9503,9216,NULL,NULL,NULL,NULL);
INSERT INTO `vis_dashboard_card` (`id`, `dashboard_id`, `card_id`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (950302,9503,9226,NULL,NULL,NULL,NULL);
INSERT INTO `vis_dashboard_card` (`id`, `dashboard_id`, `card_id`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (950303,9503,9211,NULL,NULL,NULL,NULL);
INSERT INTO `vis_dashboard_card` (`id`, `dashboard_id`, `card_id`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (950304,9503,9220,NULL,NULL,NULL,NULL);
INSERT INTO `vis_dashboard_card` (`id`, `dashboard_id`, `card_id`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (950305,9503,9225,NULL,NULL,NULL,NULL);
INSERT INTO `vis_dashboard_card` (`id`, `dashboard_id`, `card_id`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (950306,9503,9229,NULL,NULL,NULL,NULL);
INSERT INTO `vis_dashboard_card` (`id`, `dashboard_id`, `card_id`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (950307,9503,9230,NULL,NULL,NULL,NULL);
INSERT INTO `vis_dashboard_card` (`id`, `dashboard_id`, `card_id`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (950401,9504,9203,NULL,NULL,NULL,NULL);
INSERT INTO `vis_dashboard_card` (`id`, `dashboard_id`, `card_id`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (950402,9504,9227,NULL,NULL,NULL,NULL);
INSERT INTO `vis_dashboard_card` (`id`, `dashboard_id`, `card_id`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (950403,9504,9228,NULL,NULL,NULL,NULL);
INSERT INTO `vis_dashboard_card` (`id`, `dashboard_id`, `card_id`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (950404,9504,9218,NULL,NULL,NULL,NULL);
INSERT INTO `vis_dashboard_card` (`id`, `dashboard_id`, `card_id`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (950405,9504,9222,NULL,NULL,NULL,NULL);
INSERT INTO `vis_dashboard_card` (`id`, `dashboard_id`, `card_id`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (950406,9504,9224,NULL,NULL,NULL,NULL);
INSERT INTO `vis_dashboard_card` (`id`, `dashboard_id`, `card_id`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (950407,9504,9219,NULL,NULL,NULL,NULL);
INSERT INTO `vis_dashboard_card` (`id`, `dashboard_id`, `card_id`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (950408,9504,9209,NULL,NULL,NULL,NULL);
INSERT INTO `vis_dashboard_card` (`id`, `dashboard_id`, `card_id`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (2097890708303106050,9501,9201,1789011096440,1,1789011096440,1);
INSERT INTO `vis_dashboard_card` (`id`, `dashboard_id`, `card_id`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (2097890708311494657,9501,9202,1789011096442,1,1789011096442,1);
INSERT INTO `vis_dashboard_card` (`id`, `dashboard_id`, `card_id`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (2097890708336660481,9501,9204,1789011096448,1,1789011096448,1);
INSERT INTO `vis_dashboard_card` (`id`, `dashboard_id`, `card_id`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (2097890708340854786,9501,9205,1789011096449,1,1789011096449,1);
INSERT INTO `vis_dashboard_card` (`id`, `dashboard_id`, `card_id`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (2097890708345049090,9501,9208,1789011096450,1,1789011096450,1);
INSERT INTO `vis_dashboard_card` (`id`, `dashboard_id`, `card_id`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (2097890708349243393,9501,9210,1789011096451,1,1789011096451,1);
INSERT INTO `vis_dashboard_card` (`id`, `dashboard_id`, `card_id`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (2097890708349243394,9501,9206,1789011096452,1,1789011096452,1);
INSERT INTO `vis_dashboard_card` (`id`, `dashboard_id`, `card_id`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (2097890708366020610,9501,9217,1789011096455,1,1789011096455,1);
INSERT INTO `vis_dashboard_card` (`id`, `dashboard_id`, `card_id`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (2097890708378603521,9501,9207,1789011096458,1,1789011096458,1);
INSERT INTO `vis_dashboard_card` (`id`, `dashboard_id`, `card_id`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (2097890708391186434,9501,9223,1789011096462,1,1789011096462,1);
INSERT INTO `vis_dashboard_card` (`id`, `dashboard_id`, `card_id`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (2097890708395380738,9501,9232,1789011096463,1,1789011096463,1);

-- vis_dashboard_subscription：当前数据 1 条
DROP TABLE IF EXISTS `vis_dashboard_subscription`;
CREATE TABLE `vis_dashboard_subscription` (
  `id` bigint NOT NULL,
  `dashboard_id` bigint NOT NULL,
  `owner_id` bigint unsigned NOT NULL COMMENT '订阅所属用户，发送到其当前绑定邮箱',
  `subscription_name` varchar(100) NOT NULL,
  `schedule_type` varchar(16) NOT NULL COMMENT 'DAILY每天 WEEKDAY周一至周五 WEEKLY每周 MONTHLY每月',
  `schedule_json` json NOT NULL COMMENT 'time为HH:mm；dayOfWeek为1至7；dayOfMonth为1至28',
  `timezone` varchar(64) NOT NULL DEFAULT 'Asia/Shanghai' COMMENT '发送时间使用的IANA时区',
  `channel_type` varchar(16) NOT NULL DEFAULT 'EMAIL' COMMENT '发送渠道，当前为EMAIL',
  `target_json` json NOT NULL COMMENT '接收目标，当前保存ownerId，不保存邮箱',
  `next_fire_at` bigint NOT NULL COMMENT '下次计划触发时间，毫秒时间戳',
  `last_fire_at` bigint DEFAULT NULL COMMENT '最近领取的计划触发时间，非发送成功时间；毫秒时间戳',
  `status` char(3) NOT NULL DEFAULT 'EBL' COMMENT 'EBL启用 DBL停用 DEL删除',
  `create_at` bigint DEFAULT NULL,
  `create_by` bigint DEFAULT NULL,
  `modify_at` bigint DEFAULT NULL,
  `modify_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_subscription_due` (`status`,`next_fire_at`),
  KEY `idx_subscription_owner_dash` (`owner_id`,`dashboard_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='看板定时订阅';
INSERT INTO `vis_dashboard_subscription` (`id`, `dashboard_id`, `owner_id`, `subscription_name`, `schedule_type`, `schedule_json`, `timezone`, `channel_type`, `target_json`, `next_fire_at`, `last_fire_at`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (2097996437852626945,9501,1,'经营看板测试邮件','DAILY','{\"time\": \"09:00\", \"dayOfWeek\": 1, \"dayOfMonth\": 1}','Asia/Shanghai','EMAIL','{\"ownerId\": \"1\"}',1789088400000,NULL,'DBL',1789036304322,1,1789037081558,0);

-- vis_dashboard_subscription_run：当前数据 8 条
DROP TABLE IF EXISTS `vis_dashboard_subscription_run`;
CREATE TABLE `vis_dashboard_subscription_run` (
  `id` bigint NOT NULL,
  `subscription_id` bigint NOT NULL,
  `scheduled_at` bigint NOT NULL COMMENT '计划触发时间，手动测试为入队时间；毫秒时间戳',
  `trigger_type` varchar(16) NOT NULL COMMENT 'SCHEDULED定时 MANUAL手动测试',
  `run_status` varchar(16) NOT NULL COMMENT 'QUEUED待执行 RUNNING执行中 SUCCESS发送成功 FAILED失败 SKIPPED跳过',
  `attempt_count` int NOT NULL DEFAULT '0',
  `screenshot_size` bigint DEFAULT NULL COMMENT '截图大小，单位字节，不存储图片内容',
  `error_message` varchar(500) DEFAULT NULL COMMENT '脱敏后的失败或跳过原因',
  `started_at` bigint DEFAULT NULL COMMENT '实际开始执行时间，毫秒时间戳',
  `heartbeat_at` bigint DEFAULT NULL COMMENT '执行心跳时间，用于检测任务中断；毫秒时间戳',
  `finished_at` bigint DEFAULT NULL COMMENT '执行结束时间，毫秒时间戳',
  `create_at` bigint DEFAULT NULL,
  `create_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_subscription_run` (`subscription_id`,`scheduled_at`,`trigger_type`),
  KEY `idx_subscription_run_history` (`subscription_id`,`create_at`),
  KEY `idx_subscription_run_queue` (`run_status`,`create_at`),
  KEY `idx_subscription_run_heartbeat` (`run_status`,`heartbeat_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='看板订阅执行记录';
INSERT INTO `vis_dashboard_subscription_run` (`id`, `subscription_id`, `scheduled_at`, `trigger_type`, `run_status`, `attempt_count`, `screenshot_size`, `error_message`, `started_at`, `heartbeat_at`, `finished_at`, `create_at`, `create_by`) VALUES (2097996676927930369,2097996437852626945,1789036361328,'MANUAL','FAILED',2,NULL,'看板截图失败: Failed to create driver',1789036361335,NULL,1789036390307,1789036361328,1);
INSERT INTO `vis_dashboard_subscription_run` (`id`, `subscription_id`, `scheduled_at`, `trigger_type`, `run_status`, `attempt_count`, `screenshot_size`, `error_message`, `started_at`, `heartbeat_at`, `finished_at`, `create_at`, `create_by`) VALUES (2097998717242945538,2097996437852626945,1789036847777,'MANUAL','FAILED',2,NULL,'邮件发送失败: Authentication failed',1789036847791,NULL,1789036878054,1789036847777,1);
INSERT INTO `vis_dashboard_subscription_run` (`id`, `subscription_id`, `scheduled_at`, `trigger_type`, `run_status`, `attempt_count`, `screenshot_size`, `error_message`, `started_at`, `heartbeat_at`, `finished_at`, `create_at`, `create_by`) VALUES (2097999697690865666,2097996437852626945,1789037081533,'MANUAL','FAILED',0,NULL,'订阅不存在或已停用',1789037081540,NULL,1789037081564,1789037081533,1);
INSERT INTO `vis_dashboard_subscription_run` (`id`, `subscription_id`, `scheduled_at`, `trigger_type`, `run_status`, `attempt_count`, `screenshot_size`, `error_message`, `started_at`, `heartbeat_at`, `finished_at`, `create_at`, `create_by`) VALUES (2098000075622834178,2097996437852626945,1789037171639,'MANUAL','SUCCESS',1,318434,NULL,1789037171650,NULL,1789037186003,1789037171639,1);
INSERT INTO `vis_dashboard_subscription_run` (`id`, `subscription_id`, `scheduled_at`, `trigger_type`, `run_status`, `attempt_count`, `screenshot_size`, `error_message`, `started_at`, `heartbeat_at`, `finished_at`, `create_at`, `create_by`) VALUES (2098001905534746625,2097996437852626945,1789037607925,'MANUAL','FAILED',2,NULL,'看板截图失败: Error {   message=\'net::ERR_CONNECTION_REFUSED at http://127.0.0.1:5173/vis/dashboards/view?id=9501   name=\'Error   stack=\'Error: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:5173/vis/dashboards/view?id=9501     at _FrameSession._navigate (/private/var/folders/bd/0mykyhvs54v2h37lnbzd9b4h0000gp/T/playwright-java-16392230765101509970/package/lib/coreBundle.js:37451:17)     at async _Frame.gotoImpl (/private/var/folders/bd/0mykyhvs54v2h37lnbzd9b4h0000gp/T/playwright-java-1639223076510150',1789037607934,NULL,1789037612225,1789037607925,1);
INSERT INTO `vis_dashboard_subscription_run` (`id`, `subscription_id`, `scheduled_at`, `trigger_type`, `run_status`, `attempt_count`, `screenshot_size`, `error_message`, `started_at`, `heartbeat_at`, `finished_at`, `create_at`, `create_by`) VALUES (2098002040515837953,2097996437852626945,1789037640109,'MANUAL','FAILED',2,NULL,'看板截图失败: Error {   message=\'net::ERR_CONNECTION_REFUSED at http://127.0.0.1:5173/vis/dashboards/view?id=9501   name=\'Error   stack=\'Error: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:5173/vis/dashboards/view?id=9501     at _FrameSession._navigate (/private/var/folders/bd/0mykyhvs54v2h37lnbzd9b4h0000gp/T/playwright-java-16392230765101509970/package/lib/coreBundle.js:37451:17)     at async _Frame.gotoImpl (/private/var/folders/bd/0mykyhvs54v2h37lnbzd9b4h0000gp/T/playwright-java-1639223076510150',1789037640115,NULL,1789037642158,1789037640109,1);
INSERT INTO `vis_dashboard_subscription_run` (`id`, `subscription_id`, `scheduled_at`, `trigger_type`, `run_status`, `attempt_count`, `screenshot_size`, `error_message`, `started_at`, `heartbeat_at`, `finished_at`, `create_at`, `create_by`) VALUES (2098002207310725121,2097996437852626945,1789037679876,'MANUAL','SUCCESS',1,340523,NULL,1789037679881,NULL,1789037689706,1789037679876,1);
INSERT INTO `vis_dashboard_subscription_run` (`id`, `subscription_id`, `scheduled_at`, `trigger_type`, `run_status`, `attempt_count`, `screenshot_size`, `error_message`, `started_at`, `heartbeat_at`, `finished_at`, `create_at`, `create_by`) VALUES (2098002743204356098,2097996437852626945,1789037807641,'MANUAL','SUCCESS',1,341608,NULL,1789037807650,NULL,1789037822796,1789037807641,1);

-- vis_dataset：当前数据 2 条
DROP TABLE IF EXISTS `vis_dataset`;
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
INSERT INTO `vis_dataset` (`id`, `source_id`, `dataset_name`, `dataset_desc`, `sql_content`, `param_demo`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9101,1,'零售订单明细','启明零售全渠道订单，含大区、城市、渠道、门店、会员与履约状态','SELECT * FROM dwd_retail_order','{}','EBL',1787832902000,1,1787832902000,1);
INSERT INTO `vis_dataset` (`id`, `source_id`, `dataset_name`, `dataset_desc`, `sql_content`, `param_demo`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (9102,1,'零售订单（区域渠道可筛）','同一订单明细，SQL 按大区、渠道、下单日过滤，供区域专题使用','SELECT * FROM dwd_retail_order\nWHERE 1 = 1\n#if(region && !region.isEmpty())\n  AND region IN #para(region, \'in\')\n#end\n#if(channel && !channel.isEmpty())\n  AND channel IN #para(channel, \'in\')\n#end\n#if(order_date && order_date.size() >= 2)\n  AND order_date >= #para(order_date.get(0))\n  AND order_date <= #para(order_date.get(1))\n#end','{\"region\":[\"华东\",\"华南\"],\"channel\":[\"线上\"]}','EBL',1787832902000,1,1787832902000,1);

-- vis_dataset_field：当前数据 32 条
DROP TABLE IF EXISTS `vis_dataset_field`;
CREATE TABLE `vis_dataset_field` (
  `id` bigint NOT NULL,
  `dataset_id` bigint NOT NULL,
  `field` varchar(64) NOT NULL,
  `data_type` varchar(16) NOT NULL COMMENT 'STRING|NUMBER|DATE|DATETIME',
  `suggest_role` varchar(16) NOT NULL COMMENT 'DIMENSION|METRIC',
  `remark` varchar(200) DEFAULT NULL COMMENT 'è¡¥å……è¯´æ˜Ž',
  `sort_num` int DEFAULT '0',
  `status` char(3) NOT NULL DEFAULT 'EBL',
  `create_at` bigint DEFAULT NULL,
  `create_by` bigint DEFAULT NULL,
  `modify_at` bigint DEFAULT NULL,
  `modify_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dataset_field` (`dataset_id`,`field`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='数据集字段';
INSERT INTO `vis_dataset_field` (`id`, `dataset_id`, `field`, `data_type`, `suggest_role`, `remark`, `sort_num`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (910101,9101,'order_date','DATE','DIMENSION','业务日，用于日/周/月汇总',1,'EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_dataset_field` (`id`, `dataset_id`, `field`, `data_type`, `suggest_role`, `remark`, `sort_num`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (910102,9101,'order_at','DATETIME','DIMENSION','下单时刻，可看本周时段',2,'EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_dataset_field` (`id`, `dataset_id`, `field`, `data_type`, `suggest_role`, `remark`, `sort_num`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (910103,9101,'region','STRING','DIMENSION','华东 / 华南 / 华北 / 西部',3,'EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_dataset_field` (`id`, `dataset_id`, `field`, `data_type`, `suggest_role`, `remark`, `sort_num`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (910104,9101,'city','STRING','DIMENSION','订单归属城市',4,'EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_dataset_field` (`id`, `dataset_id`, `field`, `data_type`, `suggest_role`, `remark`, `sort_num`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (910105,9101,'channel','STRING','DIMENSION','线上、门店、经销',5,'EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_dataset_field` (`id`, `dataset_id`, `field`, `data_type`, `suggest_role`, `remark`, `sort_num`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (910106,9101,'store_name','STRING','DIMENSION','店铺或体验店名称',6,'EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_dataset_field` (`id`, `dataset_id`, `field`, `data_type`, `suggest_role`, `remark`, `sort_num`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (910107,9101,'category','STRING','DIMENSION','服饰 / 数码 / 家居 / 食品 / 美妆',7,'EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_dataset_field` (`id`, `dataset_id`, `field`, `data_type`, `suggest_role`, `remark`, `sort_num`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (910108,9101,'product','STRING','DIMENSION','商品名称',8,'EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_dataset_field` (`id`, `dataset_id`, `field`, `data_type`, `suggest_role`, `remark`, `sort_num`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (910109,9101,'member_level','STRING','DIMENSION','普通会员 / 银卡 / 金卡 / 黑金',9,'EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_dataset_field` (`id`, `dataset_id`, `field`, `data_type`, `suggest_role`, `remark`, `sort_num`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (910110,9101,'status','STRING','DIMENSION','已支付 / 待发货 / 已完成 / 已取消',10,'EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_dataset_field` (`id`, `dataset_id`, `field`, `data_type`, `suggest_role`, `remark`, `sort_num`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (910111,9101,'user_id','NUMBER','METRIC','去重后为购买会员数',11,'EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_dataset_field` (`id`, `dataset_id`, `field`, `data_type`, `suggest_role`, `remark`, `sort_num`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (910112,9101,'qty','NUMBER','METRIC','销售件数',12,'EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_dataset_field` (`id`, `dataset_id`, `field`, `data_type`, `suggest_role`, `remark`, `sort_num`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (910113,9101,'revenue','NUMBER','METRIC','实收金额，含税口径',13,'EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_dataset_field` (`id`, `dataset_id`, `field`, `data_type`, `suggest_role`, `remark`, `sort_num`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (910114,9101,'cost','NUMBER','METRIC','商品采购成本',14,'EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_dataset_field` (`id`, `dataset_id`, `field`, `data_type`, `suggest_role`, `remark`, `sort_num`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (910115,9101,'profit','NUMBER','METRIC','实收减成本',15,'EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_dataset_field` (`id`, `dataset_id`, `field`, `data_type`, `suggest_role`, `remark`, `sort_num`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (910116,9101,'score','NUMBER','METRIC','售后评分 1–5',16,'EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_dataset_field` (`id`, `dataset_id`, `field`, `data_type`, `suggest_role`, `remark`, `sort_num`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (910201,9102,'order_date','DATE','DIMENSION','业务日，用于日/周/月汇总',1,'EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_dataset_field` (`id`, `dataset_id`, `field`, `data_type`, `suggest_role`, `remark`, `sort_num`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (910202,9102,'order_at','DATETIME','DIMENSION','下单时刻，可看本周时段',2,'EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_dataset_field` (`id`, `dataset_id`, `field`, `data_type`, `suggest_role`, `remark`, `sort_num`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (910203,9102,'region','STRING','DIMENSION','华东 / 华南 / 华北 / 西部',3,'EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_dataset_field` (`id`, `dataset_id`, `field`, `data_type`, `suggest_role`, `remark`, `sort_num`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (910204,9102,'city','STRING','DIMENSION','订单归属城市',4,'EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_dataset_field` (`id`, `dataset_id`, `field`, `data_type`, `suggest_role`, `remark`, `sort_num`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (910205,9102,'channel','STRING','DIMENSION','线上、门店、经销',5,'EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_dataset_field` (`id`, `dataset_id`, `field`, `data_type`, `suggest_role`, `remark`, `sort_num`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (910206,9102,'store_name','STRING','DIMENSION','店铺或体验店名称',6,'EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_dataset_field` (`id`, `dataset_id`, `field`, `data_type`, `suggest_role`, `remark`, `sort_num`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (910207,9102,'category','STRING','DIMENSION','服饰 / 数码 / 家居 / 食品 / 美妆',7,'EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_dataset_field` (`id`, `dataset_id`, `field`, `data_type`, `suggest_role`, `remark`, `sort_num`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (910208,9102,'product','STRING','DIMENSION','商品名称',8,'EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_dataset_field` (`id`, `dataset_id`, `field`, `data_type`, `suggest_role`, `remark`, `sort_num`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (910209,9102,'member_level','STRING','DIMENSION','普通会员 / 银卡 / 金卡 / 黑金',9,'EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_dataset_field` (`id`, `dataset_id`, `field`, `data_type`, `suggest_role`, `remark`, `sort_num`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (910210,9102,'status','STRING','DIMENSION','已支付 / 待发货 / 已完成 / 已取消',10,'EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_dataset_field` (`id`, `dataset_id`, `field`, `data_type`, `suggest_role`, `remark`, `sort_num`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (910211,9102,'user_id','NUMBER','METRIC','去重后为购买会员数',11,'EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_dataset_field` (`id`, `dataset_id`, `field`, `data_type`, `suggest_role`, `remark`, `sort_num`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (910212,9102,'qty','NUMBER','METRIC','销售件数',12,'EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_dataset_field` (`id`, `dataset_id`, `field`, `data_type`, `suggest_role`, `remark`, `sort_num`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (910213,9102,'revenue','NUMBER','METRIC','实收金额，含税口径',13,'EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_dataset_field` (`id`, `dataset_id`, `field`, `data_type`, `suggest_role`, `remark`, `sort_num`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (910214,9102,'cost','NUMBER','METRIC','商品采购成本',14,'EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_dataset_field` (`id`, `dataset_id`, `field`, `data_type`, `suggest_role`, `remark`, `sort_num`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (910215,9102,'profit','NUMBER','METRIC','实收减成本',15,'EBL',NULL,NULL,NULL,NULL);
INSERT INTO `vis_dataset_field` (`id`, `dataset_id`, `field`, `data_type`, `suggest_role`, `remark`, `sort_num`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (910216,9102,'score','NUMBER','METRIC','售后评分 1–5',16,'EBL',NULL,NULL,NULL,NULL);

-- vis_datasource：当前数据 1 条
DROP TABLE IF EXISTS `vis_datasource`;
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
INSERT INTO `vis_datasource` (`id`, `source_name`, `db_type`, `jdbc_url`, `username`, `password`, `status`, `create_at`, `create_by`, `modify_at`, `modify_by`) VALUES (1,'零售经营库','MYSQL','jdbc:mysql://127.0.0.1:3306/lens?useUnicode=true&characterEncoding=UTF-8&serverTimezone=Asia/Shanghai','root','Aa123456','EBL',1787646081946,0,1787646081946,0);

SET FOREIGN_KEY_CHECKS = @LENS_OLD_FOREIGN_KEY_CHECKS;
SET TIME_ZONE = @LENS_OLD_TIME_ZONE;
SET SQL_MODE = @LENS_OLD_SQL_MODE;

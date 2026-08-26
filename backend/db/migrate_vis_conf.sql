-- 数据集 / 卡片 / 看板各留一个 vis:*:conf（已有库执行一次）
UPDATE `sys_menu`
SET `menu_name` = CONVERT(UNHEX('E9858DE7BDAE') USING utf8mb4),
    `perm_code` = 'vis:dataset:conf'
WHERE `id` = 1100;

UPDATE `sys_menu`
SET `menu_name` = CONVERT(UNHEX('E9858DE7BDAE') USING utf8mb4),
    `perm_code` = 'vis:card:conf'
WHERE `id` = 1700;

UPDATE `sys_menu`
SET `menu_name` = CONVERT(UNHEX('E9858DE7BDAE') USING utf8mb4),
    `perm_code` = 'vis:dashboard:conf'
WHERE `id` = 1800;

INSERT IGNORE INTO `sys_role_menu` (`id`, `role_id`, `menu_id`, `create_at`, `create_by`)
SELECT UUID_SHORT(), r.role_id, 1100, 0, 0
FROM (SELECT DISTINCT `role_id` FROM `sys_role_menu` WHERE `menu_id` = 1101) r
WHERE NOT EXISTS (
  SELECT 1 FROM `sys_role_menu` x WHERE x.role_id = r.role_id AND x.menu_id = 1100
);

INSERT IGNORE INTO `sys_role_menu` (`id`, `role_id`, `menu_id`, `create_at`, `create_by`)
SELECT UUID_SHORT(), r.role_id, 1700, 0, 0
FROM (SELECT DISTINCT `role_id` FROM `sys_role_menu` WHERE `menu_id` = 1701) r
WHERE NOT EXISTS (
  SELECT 1 FROM `sys_role_menu` x WHERE x.role_id = r.role_id AND x.menu_id = 1700
);

INSERT IGNORE INTO `sys_role_menu` (`id`, `role_id`, `menu_id`, `create_at`, `create_by`)
SELECT UUID_SHORT(), r.role_id, 1800, 0, 0
FROM (SELECT DISTINCT `role_id` FROM `sys_role_menu` WHERE `menu_id` = 1801) r
WHERE NOT EXISTS (
  SELECT 1 FROM `sys_role_menu` x WHERE x.role_id = r.role_id AND x.menu_id = 1800
);

DELETE FROM `sys_role_menu` WHERE `menu_id` IN (1101, 1701, 1801);
DELETE FROM `sys_menu` WHERE `id` IN (1101, 1701, 1801);

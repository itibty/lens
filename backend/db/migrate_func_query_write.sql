-- 每个菜单只留查看/编辑。原先只有配置类功能点的角色补上编辑。
INSERT IGNORE INTO `sys_role_menu` (`id`, `role_id`, `menu_id`, `create_at`, `create_by`)
SELECT UUID_SHORT(), r.role_id, 201, 0, 0
FROM (SELECT DISTINCT `role_id` FROM `sys_role_menu` WHERE `menu_id` IN (202, 203)) r
WHERE NOT EXISTS (
  SELECT 1 FROM `sys_role_menu` x WHERE x.role_id = r.role_id AND x.menu_id = 201
);

INSERT IGNORE INTO `sys_role_menu` (`id`, `role_id`, `menu_id`, `create_at`, `create_by`)
SELECT UUID_SHORT(), r.role_id, 301, 0, 0
FROM (SELECT DISTINCT `role_id` FROM `sys_role_menu` WHERE `menu_id` IN (302, 303)) r
WHERE NOT EXISTS (
  SELECT 1 FROM `sys_role_menu` x WHERE x.role_id = r.role_id AND x.menu_id = 301
);

DELETE FROM `sys_role_menu` WHERE `menu_id` IN (202, 203, 302, 303);
DELETE FROM `sys_menu` WHERE `id` IN (202, 203, 302, 303);

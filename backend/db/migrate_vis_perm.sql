-- 功能点：修好查看/编辑乱码，并把 ds:* 改成 vis:*（已有库执行一次）
-- 中文用 UNHEX，避免客户端字符集再次写坏
UPDATE `sys_menu`
SET `menu_name` = CONVERT(UNHEX('E69FA5E79C8B') USING utf8mb4)
WHERE `id` IN (200, 300, 400, 1100, 1700, 1800);

UPDATE `sys_menu`
SET `menu_name` = CONVERT(UNHEX('E7BC96E8BE91') USING utf8mb4)
WHERE `id` IN (201, 301, 401, 1101, 1701, 1801);

UPDATE `sys_menu` SET `perm_code` = 'vis:dataset:query' WHERE `id` = 1100;
UPDATE `sys_menu` SET `perm_code` = 'vis:dataset:write' WHERE `id` = 1101;
UPDATE `sys_menu` SET `perm_code` = 'vis:card:query' WHERE `id` = 1700;
UPDATE `sys_menu` SET `perm_code` = 'vis:card:write' WHERE `id` = 1701;
UPDATE `sys_menu` SET `perm_code` = 'vis:dashboard:query' WHERE `id` = 1800;
UPDATE `sys_menu` SET `perm_code` = 'vis:dashboard:write' WHERE `id` = 1801;

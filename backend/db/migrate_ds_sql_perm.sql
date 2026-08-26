-- 数据集功能点拆成 query / write（已有库执行一次）
UPDATE `sys_menu` SET `perm_code` = 'ds:sql:query' WHERE `id` = 1100 AND `perm_code` = 'ds:sql:conf';
UPDATE `sys_menu` SET `perm_code` = 'ds:sql:write' WHERE `id` = 1101 AND `perm_code` = 'ds:sql:conf';

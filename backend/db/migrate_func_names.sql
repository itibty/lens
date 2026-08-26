-- 功能点名称统一为「查看」「编辑」，不再带资源后缀（已有库执行一次）
-- 中文用 UNHEX，避免客户端字符集写成乱码
UPDATE `sys_menu`
SET `menu_name` = CONVERT(UNHEX('E69FA5E79C8B') USING utf8mb4)
WHERE `id` IN (200, 300, 400, 1100, 1700, 1800);
UPDATE `sys_menu`
SET `menu_name` = CONVERT(UNHEX('E7BC96E8BE91') USING utf8mb4)
WHERE `id` IN (201, 301, 401, 1101, 1701, 1801);

-- 看板图标（已有库执行一次）
ALTER TABLE `vis_dashboard`
  ADD COLUMN `icon` varchar(50) DEFAULT NULL AFTER `dash_desc`;

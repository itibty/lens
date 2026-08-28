-- Lens 零售经营样例：订单明细 + 数据集 + 卡片 + 看板
-- 在 lens 库执行（先跑 schema.sql，并保证 vis_datasource.id=1 已存在，或本脚本会补一条）
--   mysql -u root -p lens < backend/db/demo.sql
--
-- 固定 id：
--   数据源 1；数据集 9101 / 9102；卡片 9201–9232；看板 9501–9504
-- 查询基准日 asOfDate=2026-06-15（周一）
-- 虚构主体：启明零售

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

INSERT INTO `vis_datasource` (
  `id`, `source_name`, `db_type`, `jdbc_url`, `username`, `password`, `status`,
  `create_at`, `create_by`, `modify_at`, `modify_by`
)
SELECT
  1, '零售经营库', 'MYSQL',
  'jdbc:mysql://127.0.0.1:3306/lens?useUnicode=true&characterEncoding=UTF-8&serverTimezone=Asia/Shanghai',
  'root', 'Aa123456', 'EBL',
  UNIX_TIMESTAMP()*1000, 1, UNIX_TIMESTAMP()*1000, 1
WHERE NOT EXISTS (SELECT 1 FROM `vis_datasource` WHERE `id` = 1);

UPDATE `vis_datasource` SET `source_name` = '零售经营库' WHERE `id` = 1 AND `source_name` = 'lens';

DROP TABLE IF EXISTS `vis_demo_order`;
DROP TABLE IF EXISTS `dwd_retail_order`;
CREATE TABLE `dwd_retail_order` (
  `id` bigint NOT NULL,
  `order_date` date NOT NULL COMMENT '下单日',
  `order_at` datetime NOT NULL COMMENT '下单时间',
  `region` varchar(16) NOT NULL COMMENT '销售大区',
  `city` varchar(16) NOT NULL COMMENT '城市',
  `channel` varchar(16) NOT NULL COMMENT '销售渠道',
  `store_name` varchar(32) NOT NULL COMMENT '门店/店铺',
  `category` varchar(16) NOT NULL COMMENT '品类',
  `product` varchar(32) NOT NULL COMMENT '商品',
  `member_level` varchar(16) NOT NULL COMMENT '会员等级',
  `user_id` bigint NOT NULL COMMENT '会员',
  `qty` int NOT NULL COMMENT '件数',
  `revenue` decimal(12,2) NOT NULL COMMENT '实收金额',
  `cost` decimal(12,2) NOT NULL COMMENT '商品成本',
  `profit` decimal(12,2) NOT NULL COMMENT '毛利',
  `score` decimal(6,2) NOT NULL COMMENT '售后评分',
  `status` varchar(16) NOT NULL COMMENT '订单状态',
  PRIMARY KEY (`id`),
  KEY `idx_order_date` (`order_date`),
  KEY `idx_region_channel` (`region`, `channel`),
  KEY `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='零售订单明细';

INSERT INTO `dwd_retail_order` (
  `id`, `order_date`, `order_at`, `region`, `city`, `channel`, `store_name`,
  `category`, `product`, `member_level`, `user_id`,
  `qty`, `revenue`, `cost`, `profit`, `score`, `status`
)
WITH `d` AS (
  SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
  UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
),
`nums` AS (
  SELECT a.n + b.n * 10 + c.n * 100 AS n
  FROM `d` a
  CROSS JOIN `d` b
  CROSS JOIN `d` c
),
`dates` AS (
  SELECT DATE('2024-01-01') + INTERVAL n DAY AS dt
  FROM `nums`
  WHERE n <= DATEDIFF('2026-08-31', '2024-01-01')
),
`regions` AS (
  SELECT 1 AS ri, '华东' AS region, 1.22 AS rf UNION ALL
  SELECT 2, '华南', 1.12 UNION ALL
  SELECT 3, '华北', 1.00 UNION ALL
  SELECT 4, '西部', 0.82
),
`channels` AS (
  SELECT 1 AS ci, '线上' AS channel, 1.18 AS cf UNION ALL
  SELECT 2, '门店', 1.00 UNION ALL
  SELECT 3, '经销', 0.88
),
`sku` AS (
  SELECT 1 AS si, '服饰' AS category, '云织连帽卫衣' AS product, 199.00 AS price, 0.46 AS cr UNION ALL
  SELECT 2, '服饰', '通勤直筒西裤', 259.00, 0.48 UNION ALL
  SELECT 3, '服饰', '轻暖羽绒服', 699.00, 0.52 UNION ALL
  SELECT 4, '服饰', '亚麻休闲衬衫', 179.00, 0.44 UNION ALL
  SELECT 5, '数码', '极光降噪耳机', 899.00, 0.71 UNION ALL
  SELECT 6, '数码', '星河平板电脑', 2499.00, 0.74 UNION ALL
  SELECT 7, '数码', '疾风充电宝', 159.00, 0.62 UNION ALL
  SELECT 8, '数码', '磁吸键盘套装', 429.00, 0.68 UNION ALL
  SELECT 9, '家居', '北境三人沙发', 3299.00, 0.58 UNION ALL
  SELECT 10, '家居', '原木餐桌', 1899.00, 0.56 UNION ALL
  SELECT 11, '家居', '云感床垫', 2199.00, 0.54 UNION ALL
  SELECT 12, '家居', '暖光落地灯', 329.00, 0.50 UNION ALL
  SELECT 13, '食品', '谷田每日坚果', 69.00, 0.61 UNION ALL
  SELECT 14, '食品', '山野冻干草莓', 39.00, 0.58 UNION ALL
  SELECT 15, '食品', '醇香挂耳咖啡', 89.00, 0.55 UNION ALL
  SELECT 16, '食品', '海盐苏打饼干', 19.90, 0.52 UNION ALL
  SELECT 17, '美妆', '花序修护精华', 359.00, 0.38 UNION ALL
  SELECT 18, '美妆', '清颜防晒乳', 129.00, 0.42 UNION ALL
  SELECT 19, '美妆', '绒雾口红', 159.00, 0.36 UNION ALL
  SELECT 20, '美妆', '氨基酸洁面乳', 79.00, 0.40
)
SELECT
  TO_DAYS(dt) * 1000 + ri * 100 + ci * 10 + slot AS id,
  dt AS order_date,
  TIMESTAMP(dt)
    + INTERVAL ((ci * 5 + DAY(dt) * 3 + slot * 2) % 12 + 9) HOUR
    + INTERVAL ((DAY(dt) * 7 + ci * 11 + slot * 5) % 60) MINUTE AS order_at,
  region,
  CASE region
    WHEN '华东' THEN ELT((DAY(dt) + ci) % 3 + 1, '上海', '杭州', '南京')
    WHEN '华南' THEN ELT((DAY(dt) + ci) % 3 + 1, '广州', '深圳', '厦门')
    WHEN '华北' THEN ELT((DAY(dt) + ci) % 3 + 1, '北京', '天津', '青岛')
    ELSE ELT((DAY(dt) + ci) % 3 + 1, '成都', '西安', '重庆')
  END AS city,
  channel,
  CASE channel
    WHEN '线上' THEN ELT(ci, '启明官方商城', '启明旗舰店', '启明官方商城')
    WHEN '门店' THEN CONCAT(
      CASE region
        WHEN '华东' THEN ELT((DAY(dt) + ci) % 3 + 1, '上海', '杭州', '南京')
        WHEN '华南' THEN ELT((DAY(dt) + ci) % 3 + 1, '广州', '深圳', '厦门')
        WHEN '华北' THEN ELT((DAY(dt) + ci) % 3 + 1, '北京', '天津', '青岛')
        ELSE ELT((DAY(dt) + ci) % 3 + 1, '成都', '西安', '重庆')
      END,
      '体验店'
    )
    ELSE CONCAT(region, '总代仓')
  END AS store_name,
  s.category,
  s.product,
  ELT((TO_DAYS(dt) + ri + ci + slot) % 10 + 1,
    '普通会员', '普通会员', '普通会员', '普通会员',
    '银卡', '银卡', '银卡',
    '金卡', '金卡',
    '黑金') AS member_level,
  100000 + ri * 10000 + (DAYOFYEAR(dt) * 17 + ci * 31 + slot * 13) % 8000 AS user_id,
  CASE channel
    WHEN '经销' THEN 2 + (DAYOFYEAR(dt) + ri * 5 + ci + slot * 3) % 5
    WHEN '门店' THEN 1 + (DAYOFYEAR(dt) + ri + ci + slot) % 3
    ELSE 1 + (DAYOFYEAR(dt) + ri + ci + slot * 2) % 2
  END AS qty,
  ROUND(
    s.price
    * (CASE channel
        WHEN '经销' THEN 2 + (DAYOFYEAR(dt) + ri * 5 + ci + slot * 3) % 5
        WHEN '门店' THEN 1 + (DAYOFYEAR(dt) + ri + ci + slot) % 3
        ELSE 1 + (DAYOFYEAR(dt) + ri + ci + slot * 2) % 2
      END)
    * (CASE channel WHEN '经销' THEN 0.78 ELSE 1.00 END)
    * (CASE WHEN WEEKDAY(dt) < 5 THEN 1.08 ELSE 1.22 END)
    * (1.00 + MONTH(dt) * 0.03)
    * rf * cf,
    2
  ) AS revenue,
  ROUND(
    s.price
    * (CASE channel
        WHEN '经销' THEN 2 + (DAYOFYEAR(dt) + ri * 5 + ci + slot * 3) % 5
        WHEN '门店' THEN 1 + (DAYOFYEAR(dt) + ri + ci + slot) % 3
        ELSE 1 + (DAYOFYEAR(dt) + ri + ci + slot * 2) % 2
      END)
    * (CASE channel WHEN '经销' THEN 0.78 ELSE 1.00 END)
    * (CASE WHEN WEEKDAY(dt) < 5 THEN 1.08 ELSE 1.22 END)
    * (1.00 + MONTH(dt) * 0.03)
    * rf * cf
    * s.cr,
    2
  ) AS cost,
  ROUND(
    s.price
    * (CASE channel
        WHEN '经销' THEN 2 + (DAYOFYEAR(dt) + ri * 5 + ci + slot * 3) % 5
        WHEN '门店' THEN 1 + (DAYOFYEAR(dt) + ri + ci + slot) % 3
        ELSE 1 + (DAYOFYEAR(dt) + ri + ci + slot * 2) % 2
      END)
    * (CASE channel WHEN '经销' THEN 0.78 ELSE 1.00 END)
    * (CASE WHEN WEEKDAY(dt) < 5 THEN 1.08 ELSE 1.22 END)
    * (1.00 + MONTH(dt) * 0.03)
    * rf * cf
    * (1 - s.cr),
    2
  ) AS profit,
  ROUND(3.6 + ((DAY(dt) + ri * 7 + ci * 3 + slot) % 14) * 0.1, 1) AS score,
  ELT((TO_DAYS(dt) + ri + ci + slot) % 20 + 1,
    '已完成', '已完成', '已完成', '已完成', '已完成', '已完成', '已完成', '已完成', '已完成', '已完成',
    '已完成', '已完成', '已完成', '已完成',
    '已支付', '已支付',
    '待发货',
    '已完成',
    '已取消',
    '已完成') AS status
FROM `dates`
CROSS JOIN `regions`
CROSS JOIN `channels`
CROSS JOIN (SELECT 0 AS slot UNION ALL SELECT 1) slots
JOIN `sku` s ON s.si = ((DAYOFYEAR(dt) + ri * 3 + ci * 7 + slot * 11) % 20) + 1
WHERE (DAYOFYEAR(dt) + ri * 17 + ci * 31 + slot * 5) % 11 <> 0;


DELETE FROM `sys_role_dashboard`;
DELETE FROM `vis_dashboard_card`;
DELETE FROM `vis_dashboard`;
DELETE FROM `vis_card`;
DELETE FROM `vis_dataset_field`;
DELETE FROM `vis_dataset`;

UPDATE `vis_dash_group` SET `group_name` = '经营分析', `icon` = 'board-line', `sort_num` = 10, `pid` = 0 WHERE `id` = 9601;
UPDATE `vis_dash_group` SET `group_name` = '销售运营', `icon` = 'chart-line-line', `sort_num` = 20, `pid` = 0 WHERE `id` = 9602;
UPDATE `vis_dash_group` SET `group_name` = '商品洞察', `icon` = 'box-2-line', `sort_num` = 30, `pid` = 0 WHERE `id` = 9603;

INSERT INTO `vis_dataset` (
  `id`, `source_id`, `dataset_name`, `dataset_desc`, `sql_content`, `param_demo`,
  `status`, `create_at`, `create_by`, `modify_at`, `modify_by`
) VALUES
(
  9101, 1, '零售订单明细',
  '启明零售全渠道订单，含大区、城市、渠道、门店、会员与履约状态',
  'SELECT * FROM dwd_retail_order',
  '{}',
  'EBL', UNIX_TIMESTAMP()*1000, 1, UNIX_TIMESTAMP()*1000, 1
),
(
  9102, 1, '零售订单（区域渠道可筛）',
  '同一订单明细，SQL 按大区、渠道、下单日过滤，供区域专题使用',
  'SELECT * FROM dwd_retail_order
WHERE 1 = 1
#if(region && !region.isEmpty())
  AND region IN #para(region, ''in'')
#end
#if(channel && !channel.isEmpty())
  AND channel IN #para(channel, ''in'')
#end
#if(order_date && order_date.size() >= 2)
  AND order_date >= #para(order_date.get(0))
  AND order_date <= #para(order_date.get(1))
#end',
  '{"region":["华东","华南"],"channel":["线上"]}',
  'EBL', UNIX_TIMESTAMP()*1000, 1, UNIX_TIMESTAMP()*1000, 1
);

INSERT INTO `vis_dataset_field` (
  `id`, `dataset_id`, `field`, `data_type`, `suggest_role`, `remark`, `sort_num`, `status`,
  `create_at`, `create_by`, `modify_at`, `modify_by`
) VALUES
  (910101, 9101, 'order_date', 'DATE', 'DIMENSION', '业务日，用于日/周/月汇总', 1, 'EBL', NULL, NULL, NULL, NULL),
  (910102, 9101, 'order_at', 'DATETIME', 'DIMENSION', '下单时刻，可看本周时段', 2, 'EBL', NULL, NULL, NULL, NULL),
  (910103, 9101, 'region', 'STRING', 'DIMENSION', '华东 / 华南 / 华北 / 西部', 3, 'EBL', NULL, NULL, NULL, NULL),
  (910104, 9101, 'city', 'STRING', 'DIMENSION', '订单归属城市', 4, 'EBL', NULL, NULL, NULL, NULL),
  (910105, 9101, 'channel', 'STRING', 'DIMENSION', '线上、门店、经销', 5, 'EBL', NULL, NULL, NULL, NULL),
  (910106, 9101, 'store_name', 'STRING', 'DIMENSION', '店铺或体验店名称', 6, 'EBL', NULL, NULL, NULL, NULL),
  (910107, 9101, 'category', 'STRING', 'DIMENSION', '服饰 / 数码 / 家居 / 食品 / 美妆', 7, 'EBL', NULL, NULL, NULL, NULL),
  (910108, 9101, 'product', 'STRING', 'DIMENSION', '商品名称', 8, 'EBL', NULL, NULL, NULL, NULL),
  (910109, 9101, 'member_level', 'STRING', 'DIMENSION', '普通会员 / 银卡 / 金卡 / 黑金', 9, 'EBL', NULL, NULL, NULL, NULL),
  (910110, 9101, 'status', 'STRING', 'DIMENSION', '已支付 / 待发货 / 已完成 / 已取消', 10, 'EBL', NULL, NULL, NULL, NULL),
  (910111, 9101, 'user_id', 'NUMBER', 'METRIC', '去重后为购买会员数', 11, 'EBL', NULL, NULL, NULL, NULL),
  (910112, 9101, 'qty', 'NUMBER', 'METRIC', '销售件数', 12, 'EBL', NULL, NULL, NULL, NULL),
  (910113, 9101, 'revenue', 'NUMBER', 'METRIC', '实收金额，含税口径', 13, 'EBL', NULL, NULL, NULL, NULL),
  (910114, 9101, 'cost', 'NUMBER', 'METRIC', '商品采购成本', 14, 'EBL', NULL, NULL, NULL, NULL),
  (910115, 9101, 'profit', 'NUMBER', 'METRIC', '实收减成本', 15, 'EBL', NULL, NULL, NULL, NULL),
  (910116, 9101, 'score', 'NUMBER', 'METRIC', '售后评分 1–5', 16, 'EBL', NULL, NULL, NULL, NULL),
  (910201, 9102, 'order_date', 'DATE', 'DIMENSION', '业务日，用于日/周/月汇总', 1, 'EBL', NULL, NULL, NULL, NULL),
  (910202, 9102, 'order_at', 'DATETIME', 'DIMENSION', '下单时刻，可看本周时段', 2, 'EBL', NULL, NULL, NULL, NULL),
  (910203, 9102, 'region', 'STRING', 'DIMENSION', '华东 / 华南 / 华北 / 西部', 3, 'EBL', NULL, NULL, NULL, NULL),
  (910204, 9102, 'city', 'STRING', 'DIMENSION', '订单归属城市', 4, 'EBL', NULL, NULL, NULL, NULL),
  (910205, 9102, 'channel', 'STRING', 'DIMENSION', '线上、门店、经销', 5, 'EBL', NULL, NULL, NULL, NULL),
  (910206, 9102, 'store_name', 'STRING', 'DIMENSION', '店铺或体验店名称', 6, 'EBL', NULL, NULL, NULL, NULL),
  (910207, 9102, 'category', 'STRING', 'DIMENSION', '服饰 / 数码 / 家居 / 食品 / 美妆', 7, 'EBL', NULL, NULL, NULL, NULL),
  (910208, 9102, 'product', 'STRING', 'DIMENSION', '商品名称', 8, 'EBL', NULL, NULL, NULL, NULL),
  (910209, 9102, 'member_level', 'STRING', 'DIMENSION', '普通会员 / 银卡 / 金卡 / 黑金', 9, 'EBL', NULL, NULL, NULL, NULL),
  (910210, 9102, 'status', 'STRING', 'DIMENSION', '已支付 / 待发货 / 已完成 / 已取消', 10, 'EBL', NULL, NULL, NULL, NULL),
  (910211, 9102, 'user_id', 'NUMBER', 'METRIC', '去重后为购买会员数', 11, 'EBL', NULL, NULL, NULL, NULL),
  (910212, 9102, 'qty', 'NUMBER', 'METRIC', '销售件数', 12, 'EBL', NULL, NULL, NULL, NULL),
  (910213, 9102, 'revenue', 'NUMBER', 'METRIC', '实收金额，含税口径', 13, 'EBL', NULL, NULL, NULL, NULL),
  (910214, 9102, 'cost', 'NUMBER', 'METRIC', '商品采购成本', 14, 'EBL', NULL, NULL, NULL, NULL),
  (910215, 9102, 'profit', 'NUMBER', 'METRIC', '实收减成本', 15, 'EBL', NULL, NULL, NULL, NULL),
  (910216, 9102, 'score', 'NUMBER', 'METRIC', '售后评分 1–5', 16, 'EBL', NULL, NULL, NULL, NULL);

INSERT INTO `vis_card` (
  `id`, `card_name`, `card_desc`, `dataset_id`, `chart_type`, `query_json`, `visual_json`,
  `status`, `create_at`, `create_by`, `modify_at`, `modify_by`
) VALUES
(
  9201, '本月营收', '本月实收，辅指标毛利',
  9101, 'number',
  '{"datasetId":"9101","asOfDate":"2026-06-15","metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"profit","agg":"SUM","label":"毛利"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}]}',
  '{"chartType":"number","showTitle":true,"allowDetail":true,"allowDownload":true,"number":{"showLabel":true,"showAuxLabel":true,"prefix":"¥","size":"lg"}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9202, '本月营收同比环比', '相对去年同期与上月',
  9101, 'number',
  '{"datasetId":"9101","asOfDate":"2026-06-15","metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"profit","agg":"SUM","label":"毛利"},{"field":"revenue","agg":"SUM","label":"同比","contrast":{"timeField":"order_date","calcMethod":"shift_year","calcType":"diffRate","valueExp":"current_month"}},{"field":"revenue","agg":"SUM","label":"环比","contrast":{"timeField":"order_date","calcMethod":"shift_month","calcType":"diffRate","valueExp":"current_month"}}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}]}',
  '{"chartType":"number","showTitle":true,"allowDetail":true,"number":{"showLabel":true,"showAuxLabel":true,"prefix":"¥","decimals":1}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9203, '今日成交', '当日实收与件数',
  9101, 'number',
  '{"datasetId":"9101","asOfDate":"2026-06-15","metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"qty","agg":"SUM","label":"件数"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_day"}]}]}',
  '{"chartType":"number","showTitle":true,"allowDetail":true,"number":{"showLabel":true,"showAuxLabel":true,"prefix":"¥","size":"sm"}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9204, '本月目标完成率', '本月实收对照固定目标',
  9101, 'progress',
  '{"datasetId":"9101","asOfDate":"2026-06-15","metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}]}',
  '{"chartType":"progress","showTitle":true,"allowDetail":true,"progress":{"shape":"ring","target":1000000,"decimals":0,"prefix":"¥","color":"#1677FF","trackColor":"#E6F4FF","size":"lg","showLabel":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9205, '本月毛利率', '毛利占实收',
  9101, 'progress',
  '{"datasetId":"9101","asOfDate":"2026-06-15","metrics":[{"field":"profit","agg":"SUM","label":"毛利"},{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}]}',
  '{"chartType":"progress","showTitle":true,"allowDetail":true,"progress":{"showLabel":true,"color":"#52C41A","trackColor":"#F6FFED","decimals":0,"prefix":"¥"}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9206, '近30日营收趋势', '最新一日实收与近30日走势',
  9101, 'trend',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"order_date","label":"日","timeGrain":"day"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"profit","agg":"SUM","label":"毛利"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"last_days","value":[30]}]}],"orderList":[{"field":"日","dir":"asc"}]}',
  '{"chartType":"trend","showTitle":true,"allowDetail":true,"number":{"showLabel":true,"showAuxLabel":true,"prefix":"¥","size":"lg"}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9207, '近30日日销走势', '实收与件数双轴',
  9101, 'line',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"order_date","label":"日","timeGrain":"day"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"qty","agg":"SUM","label":"件数"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"last_days","value":[30]}]}],"orderList":[{"field":"日","dir":"asc"}]}',
  '{"chartType":"line","showTitle":true,"allowDetail":true,"chart":{"area":true,"smooth":true,"dualAxis":true,"legendPosition":"top"}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9208, '本年渠道营收', '月度渠道堆叠',
  9101, 'bar',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"order_date","label":"月份","timeGrain":"month"},{"field":"channel","label":"渠道"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_year"}]}],"orderList":[{"field":"月份","dir":"asc"}]}',
  '{"chartType":"bar","showTitle":true,"allowDetail":true,"chart":{"stacked":true,"dataLabel":false}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9209, '本月区域营收', '各大区本月实收',
  9101, 'bar',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"region","label":"区域"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}],"orderList":[{"field":"营收","dir":"desc"}]}',
  '{"chartType":"bar","showTitle":true,"allowDetail":true,"chart":{"orientation":"horizontal","legend":false,"markLines":[{"kind":"avg","label":"平均"}]}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9210, '本月区域构成', '本月实收占比',
  9101, 'pie',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"region","label":"区域"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}],"orderList":[{"field":"营收","dir":"desc"}]}',
  '{"chartType":"pie","showTitle":true,"allowDetail":true,"chart":{"donut":true,"legendPosition":"left"}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9211, '本月品类结构', '品类件数构成',
  9101, 'pie',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"category","label":"品类"}],"metrics":[{"field":"qty","agg":"SUM","label":"件数"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}],"orderList":[{"field":"件数","dir":"desc"}]}',
  '{"chartType":"pie","showTitle":true,"allowDetail":true,"chart":{"donut":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9212, '区域品类经营表', '本月实收、毛利、会员与利润率',
  9101, 'table',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"region","label":"区域"},{"field":"category","label":"品类"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"profit","agg":"SUM","label":"毛利"},{"field":"qty","agg":"SUM","label":"件数"},{"field":"user_id","agg":"COUNT_DISTINCT","label":"会员数"},{"field":"利润率","formula":"SUM(profit)/SUM(revenue)*100","label":"利润率"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}],"orderList":[{"field":"营收","dir":"desc"}],"limit":50}',
  '{"chartType":"table","showTitle":true,"allowDetail":true,"allowDownload":true,"table":{"showFilter":true,"striped":true,"showRowNumber":true,"marks":[{"fields":["利润率"],"style":{"color":"#047857","italic":true}},{"fields":["营收"],"combineOp":"and","filters":[{"field":"营收","op":"gt","value":[400000]}],"style":{"color":"#F5222D","bgColor":"#FFCCC7","bold":true}}]}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9213, '渠道同比分析', '本月渠道实收及同比',
  9101, 'table',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"region","label":"区域"},{"field":"channel","label":"渠道"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"revenue","agg":"SUM","label":"同比","contrast":{"timeField":"order_date","calcMethod":"shift_year","calcType":"diffRate","valueExp":"current_month"}},{"field":"revenue","agg":"SUM","label":"环比","contrast":{"timeField":"order_date","calcMethod":"shift_month","calcType":"diffRate","valueExp":"current_month"}}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}],"orderList":[{"field":"营收","dir":"desc"}]}',
  '{"chartType":"table","showTitle":true,"allowDetail":true,"allowDownload":true,"table":{"showFilter":true,"striped":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9214, '区域品类透视', '本月区域×品类×渠道',
  9101, 'pivot',
  '{"datasetId":"9101","asOfDate":"2026-06-15","rowDimensions":[{"field":"region","label":"区域"},{"field":"category","label":"品类"}],"colDimensions":[{"field":"channel","label":"渠道"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}]}',
  '{"chartType":"pivot","showTitle":true,"allowDetail":true,"rowSubtotal":true,"rowTotal":true,"columnTotal":true,"table":{"treeDisplay":true,"sortColumn":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9215, '本年区域月度透视', '各大区月度实收',
  9101, 'pivot',
  '{"datasetId":"9101","asOfDate":"2026-06-15","rowDimensions":[{"field":"region","label":"区域"}],"colDimensions":[{"field":"order_date","label":"月份","timeGrain":"month"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_year"}]}]}',
  '{"chartType":"pivot","showTitle":true,"allowDetail":true,"rowTotal":true,"columnTotal":true,"table":{"striped":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9216, '本月商品销量榜', '件数 Top 10',
  9101, 'rank',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"product","label":"商品"}],"metrics":[{"field":"qty","agg":"SUM","label":"件数"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}],"orderList":[{"field":"件数","dir":"desc"}],"limit":10}',
  '{"chartType":"rank","showTitle":true,"allowDetail":true,"rank":{"showPercent":true,"size":"md"}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9217, '本月区域营收排行', '各大区实收占比',
  9101, 'rank',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"region","label":"区域"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}],"orderList":[{"field":"营收","dir":"desc"}]}',
  '{"chartType":"rank","showTitle":true,"allowDetail":true,"rank":{"showPercent":true,"prefix":"¥","compact":true,"size":"lg"}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9218, '订单履约漏斗', '本月订单状态件数',
  9101, 'funnel',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"status","label":"状态"}],"metrics":[{"field":"qty","agg":"SUM","label":"件数"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}],"orderList":[{"field":"件数","dir":"desc"}]}',
  '{"chartType":"funnel","showTitle":true,"allowDetail":true,"chart":{"showRate":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9219, '区域经营雷达', '营收、毛利、件数',
  9101, 'radar',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"region","label":"区域"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"profit","agg":"SUM","label":"毛利"},{"field":"qty","agg":"SUM","label":"件数"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}]}',
  '{"chartType":"radar","showTitle":true,"allowDetail":true}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9220, '品类件量与营收', '本年品类散点',
  9101, 'scatter',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"category","label":"品类"}],"metrics":[{"field":"qty","agg":"SUM","label":"件数"},{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_year"}]}]}',
  '{"chartType":"scatter","showTitle":true,"allowDetail":true,"chart":{"dataLabel":true,"crosshair":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9221, '本年营收与订单量', '月度组合图',
  9101, 'combo',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"order_date","label":"月份","timeGrain":"month"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"qty","agg":"SUM","label":"件数"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_year"}]}],"orderList":[{"field":"月份","dir":"asc"}]}',
  '{"chartType":"combo","showTitle":true,"allowDetail":true,"chart":{"smooth":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9222, '区域营收成本对比', '本月各大区',
  9101, 'tornado',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"region","label":"区域"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"cost","agg":"SUM","label":"成本"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}],"orderList":[{"field":"营收","dir":"desc"}]}',
  '{"chartType":"tornado","showTitle":true,"allowDetail":true}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9223, '本年营收累计', '月度累加',
  9101, 'waterfall',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"order_date","label":"月份","timeGrain":"month"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_year"}]}],"orderList":[{"field":"月份","dir":"asc"}]}',
  '{"chartType":"waterfall","showTitle":true,"allowDetail":true,"chart":{"dataLabel":true,"markLines":[{"kind":"avg","label":"月均"}]}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9224, '区域渠道热力', '本月实收分布',
  9101, 'heatmap',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"region","label":"区域"},{"field":"channel","label":"渠道"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}]}',
  '{"chartType":"heatmap","showTitle":true,"allowDetail":true}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9225, '区域品类结构', '本月实收矩形树',
  9101, 'treemap',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"region","label":"区域"},{"field":"category","label":"品类"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}]}',
  '{"chartType":"treemap","showTitle":true,"allowDetail":true,"chart":{"dataLabel":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9226, '本月热销商品', '按件数',
  9101, 'wordcloud',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"product","label":"商品"}],"metrics":[{"field":"qty","agg":"SUM","label":"件数"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}],"orderList":[{"field":"件数","dir":"desc"}],"limit":20}',
  '{"chartType":"wordcloud","showTitle":true,"allowDetail":true}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9227, '区域目标进度', '本月各大区完成率',
  9101, 'kpi',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"region","label":"区域"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"目标","formula":"SUM(revenue)*1.15","label":"目标"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}],"orderList":[{"field":"营收","dir":"desc"}]}',
  '{"chartType":"kpi","showTitle":true,"allowDetail":true,"kpi":{"periodMode":"month","prefix":"¥","showValue":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9228, '渠道目标进度', '本季渠道对照固定目标',
  9101, 'kpi',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"channel","label":"渠道"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}],"orderList":[{"field":"营收","dir":"desc"}]}',
  '{"chartType":"kpi","showTitle":true,"allowDetail":true,"kpi":{"target":250000,"periodMode":"month","prefix":"¥","decimals":0}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9229, '品类贡献', '本月品类实收拆解',
  9101, 'waterfall',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"category","label":"品类"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}],"orderList":[{"field":"营收","dir":"desc"}]}',
  '{"chartType":"waterfall","showTitle":true,"allowDetail":true,"chart":{"orientation":"horizontal","dataLabel":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9230, '品类月度热力', '本年品类×月份件数',
  9101, 'heatmap',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"category","label":"品类"},{"field":"order_date","label":"月份","timeGrain":"month"}],"metrics":[{"field":"qty","agg":"SUM","label":"件数"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_year"}]}]}',
  '{"chartType":"heatmap","showTitle":true,"allowDetail":true}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9231, '重点区域渠道对比', '默认看华东、华南线上',
  9102, 'bar',
  '{"datasetId":"9102","asOfDate":"2026-06-15","dimensions":[{"field":"channel","label":"渠道"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"params":[{"field":"region","value":["华东","华南"]},{"field":"order_date","valueExp":"current_month"}]}',
  '{"chartType":"bar","showTitle":true,"showDescription":true,"description":"可按大区、渠道、日期收窄","allowDetail":true}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9232, '经营简报', '6 月经营口径说明',
  0, 'richtext',
  '{"datasetId":""}',
  '{"chartType":"richtext","showTitle":true,"richtext":{"html":"<h3>启明零售 · 6 月经营快报</h3><p>口径为全渠道实收（含税），基准日 <b>2026-06-15</b>。</p><ul><li>关注本月目标完成与同比、环比</li><li>华东、华南仍是线上主力，西部看门店与经销补量</li><li>数码件均高、服饰与美妆毛利更好</li></ul>"}}',
  'EBL', NULL, NULL, NULL, NULL
);

INSERT INTO `vis_dashboard` (
  `id`, `group_id`, `dash_name`, `dash_desc`, `icon`, `config_json`, `status`,
  `create_at`, `create_by`, `modify_at`, `modify_by`
) VALUES
(
  9501, 9601, '经营驾驶舱', '管理层周会：目标、结构、近30日走势',
  'dashboard-3-line',
  '{"filters":[{"uid":"f-region","datasetId":"9101","field":"region","label":"大区","applyAs":"filter","formType":"multiSelect","op":"in"},{"uid":"f-channel","datasetId":"9101","field":"channel","label":"渠道","applyAs":"filter","formType":"multiSelect","op":"in"}],"widgets":[{"kind":"card","cardId":"9201","x":0,"y":0,"w":6,"h":8},{"kind":"card","cardId":"9202","x":6,"y":0,"w":6,"h":8},{"kind":"card","cardId":"9204","x":12,"y":0,"w":6,"h":8},{"kind":"card","cardId":"9205","x":18,"y":0,"w":6,"h":8},{"kind":"group","id":"g-sales","title":"销售结构","description":"本年渠道堆叠与本月区域构成","mode":"tile","x":0,"y":8,"w":24,"h":16,"pages":[{"id":"p-default","items":[{"cardId":"9208","x":0,"y":0,"w":16,"h":14},{"cardId":"9210","x":16,"y":0,"w":8,"h":14}]}]},{"kind":"card","cardId":"9206","x":0,"y":24,"w":8,"h":8},{"kind":"card","cardId":"9217","x":0,"y":32,"w":8,"h":10},{"kind":"card","cardId":"9207","x":8,"y":24,"w":16,"h":18},{"kind":"card","cardId":"9223","x":0,"y":42,"w":16,"h":12},{"kind":"card","cardId":"9232","x":16,"y":42,"w":8,"h":12}]}',
  'EBL', UNIX_TIMESTAMP()*1000, 1, UNIX_TIMESTAMP()*1000, 1
),
(
  9502, 9602, '销售分析', '区域品类明细、透视与同比',
  'chart-line-line',
  '{"filters":[{"uid":"f-region","datasetId":"9101","field":"region","label":"大区","applyAs":"filter","formType":"multiSelect","op":"in"},{"uid":"f-dateexp","datasetId":"9101","field":"order_date","label":"下单日","applyAs":"filter","formType":"dateExp"},{"uid":"f-region-p","datasetId":"9102","field":"region","label":"专题大区","applyAs":"param","formType":"multiSelect"}],"widgets":[{"kind":"card","cardId":"9212","x":0,"y":0,"w":16,"h":14},{"kind":"card","cardId":"9214","x":16,"y":0,"w":8,"h":14},{"kind":"card","cardId":"9213","x":0,"y":14,"w":12,"h":12},{"kind":"card","cardId":"9221","x":12,"y":14,"w":12,"h":12},{"kind":"card","cardId":"9215","x":0,"y":26,"w":12,"h":14},{"kind":"card","cardId":"9231","x":12,"y":26,"w":12,"h":14}]}',
  'EBL', UNIX_TIMESTAMP()*1000, 1, UNIX_TIMESTAMP()*1000, 1
),
(
  9503, 9603, '商品洞察', '榜单、结构、季节热力',
  'box-2-line',
  '{"filters":[{"uid":"f-region","datasetId":"9101","field":"region","label":"大区","applyAs":"filter","formType":"multiSelect","op":"in"},{"uid":"f-category","datasetId":"9101","field":"category","label":"品类","applyAs":"filter","formType":"multiSelect","op":"in"}],"widgets":[{"kind":"card","cardId":"9216","x":0,"y":0,"w":8,"h":16},{"kind":"card","cardId":"9226","x":8,"y":0,"w":8,"h":16},{"kind":"card","cardId":"9211","x":16,"y":0,"w":8,"h":16},{"kind":"card","cardId":"9220","x":0,"y":16,"w":8,"h":14},{"kind":"card","cardId":"9225","x":8,"y":16,"w":8,"h":14},{"kind":"card","cardId":"9229","x":16,"y":16,"w":8,"h":14},{"kind":"card","cardId":"9230","x":0,"y":30,"w":24,"h":14}]}',
  'EBL', UNIX_TIMESTAMP()*1000, 1, UNIX_TIMESTAMP()*1000, 1
),
(
  9504, 9602, '渠道与履约', '渠道目标、成本对比、订单状态',
  'layers-line',
  '{"filters":[{"uid":"f-region","datasetId":"9101","field":"region","label":"大区","applyAs":"filter","formType":"multiSelect","op":"in"},{"uid":"f-channel","datasetId":"9101","field":"channel","label":"渠道","applyAs":"filter","formType":"multiSelect","op":"in"}],"widgets":[{"kind":"card","cardId":"9203","x":0,"y":0,"w":6,"h":8},{"kind":"card","cardId":"9227","x":6,"y":0,"w":9,"h":12},{"kind":"card","cardId":"9228","x":15,"y":0,"w":9,"h":12},{"kind":"card","cardId":"9218","x":0,"y":12,"w":8,"h":14},{"kind":"card","cardId":"9222","x":8,"y":12,"w":8,"h":14},{"kind":"card","cardId":"9224","x":16,"y":12,"w":8,"h":14},{"kind":"card","cardId":"9219","x":0,"y":26,"w":12,"h":14},{"kind":"card","cardId":"9209","x":12,"y":26,"w":12,"h":14}]}',
  'EBL', UNIX_TIMESTAMP()*1000, 1, UNIX_TIMESTAMP()*1000, 1
);

INSERT INTO `vis_dashboard_card` (
  `id`, `dashboard_id`, `card_id`,
  `create_at`, `create_by`, `modify_at`, `modify_by`
) VALUES
(950101, 9501, 9201, NULL, NULL, NULL, NULL),
(950102, 9501, 9202, NULL, NULL, NULL, NULL),
(950103, 9501, 9204, NULL, NULL, NULL, NULL),
(950104, 9501, 9205, NULL, NULL, NULL, NULL),
(950105, 9501, 9208, NULL, NULL, NULL, NULL),
(950106, 9501, 9210, NULL, NULL, NULL, NULL),
(950107, 9501, 9206, NULL, NULL, NULL, NULL),
(950108, 9501, 9207, NULL, NULL, NULL, NULL),
(950109, 9501, 9217, NULL, NULL, NULL, NULL),
(950110, 9501, 9223, NULL, NULL, NULL, NULL),
(950111, 9501, 9232, NULL, NULL, NULL, NULL),
(950201, 9502, 9212, NULL, NULL, NULL, NULL),
(950202, 9502, 9214, NULL, NULL, NULL, NULL),
(950203, 9502, 9213, NULL, NULL, NULL, NULL),
(950204, 9502, 9221, NULL, NULL, NULL, NULL),
(950205, 9502, 9215, NULL, NULL, NULL, NULL),
(950206, 9502, 9231, NULL, NULL, NULL, NULL),
(950301, 9503, 9216, NULL, NULL, NULL, NULL),
(950302, 9503, 9226, NULL, NULL, NULL, NULL),
(950303, 9503, 9211, NULL, NULL, NULL, NULL),
(950304, 9503, 9220, NULL, NULL, NULL, NULL),
(950305, 9503, 9225, NULL, NULL, NULL, NULL),
(950306, 9503, 9229, NULL, NULL, NULL, NULL),
(950307, 9503, 9230, NULL, NULL, NULL, NULL),
(950401, 9504, 9203, NULL, NULL, NULL, NULL),
(950402, 9504, 9227, NULL, NULL, NULL, NULL),
(950403, 9504, 9228, NULL, NULL, NULL, NULL),
(950404, 9504, 9218, NULL, NULL, NULL, NULL),
(950405, 9504, 9222, NULL, NULL, NULL, NULL),
(950406, 9504, 9224, NULL, NULL, NULL, NULL),
(950407, 9504, 9219, NULL, NULL, NULL, NULL),
(950408, 9504, 9209, NULL, NULL, NULL, NULL);

INSERT IGNORE INTO `sys_role_dashboard` (`id`, `role_id`, `dashboard_id`, `create_at`, `create_by`)
SELECT `id`, 1, `id`, 0, 0 FROM `vis_dashboard`;

SET FOREIGN_KEY_CHECKS = 1;

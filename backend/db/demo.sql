-- Lens 可视化 demo：订单明细 + 数据集 + 卡片 + 看板
-- 在 lens 库执行（先跑 schema.sql，并保证 vis_datasource.id=1 已存在，或本脚本会补一条）
--   mysql -u root -p lens < backend/db/demo.sql
--
-- 固定 id：
--   数据源 1；数据集 9101 / 9102；卡片 9201–9276；看板 9501–9510
-- 卡片名 / 看板名搜 demo_
-- 查询基准日建议 asOfDate=2026-06-15（周一）
-- 图表类型覆盖：指标卡 / 趋势 / 进度 / KPI / 排行 / 表格 / 透视 /
--   柱 / 线 / 组合 / 瀑布 / 对比条 / 饼 / 树图 / 散点 / 热力 / 雷达 / 漏斗 / 词云 / 富文本 / 网页

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 默认数据源（和应用配置一致；已有 id=1 则跳过）
INSERT INTO `vis_datasource` (
  `id`, `source_name`, `db_type`, `jdbc_url`, `username`, `password`, `status`,
  `create_at`, `create_by`, `modify_at`, `modify_by`
)
SELECT
  1, 'lens', 'MYSQL',
  'jdbc:mysql://127.0.0.1:3306/lens?useUnicode=true&characterEncoding=UTF-8&serverTimezone=Asia/Shanghai',
  'root', 'Aa123456', 'EBL',
  UNIX_TIMESTAMP()*1000, 1, UNIX_TIMESTAMP()*1000, 1
WHERE NOT EXISTS (SELECT 1 FROM `vis_datasource` WHERE `id` = 1);

DROP TABLE IF EXISTS `vis_demo_order`;
CREATE TABLE `vis_demo_order` (
  `id` bigint NOT NULL,
  `order_date` date NOT NULL COMMENT '下单日',
  `order_at` datetime NOT NULL COMMENT '下单时间',
  `region` varchar(16) DEFAULT NULL COMMENT '区域',
  `channel` varchar(16) NOT NULL COMMENT '渠道',
  `category` varchar(16) NOT NULL COMMENT '品类',
  `product` varchar(32) NOT NULL COMMENT '商品',
  `user_id` bigint NOT NULL COMMENT '用户',
  `qty` int NOT NULL COMMENT '件数',
  `revenue` decimal(12,2) NOT NULL COMMENT '营收',
  `cost` decimal(12,2) NOT NULL COMMENT '成本',
  `profit` decimal(12,2) NOT NULL COMMENT '毛利',
  `score` decimal(6,2) NOT NULL COMMENT '评分',
  `status` varchar(16) DEFAULT NULL COMMENT '状态',
  PRIMARY KEY (`id`),
  KEY `idx_order_date` (`order_date`),
  KEY `idx_region_channel` (`region`, `channel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='vis demo 订单明细';

INSERT INTO `vis_demo_order` (
  `id`, `order_date`, `order_at`, `region`, `channel`, `category`, `product`,
  `user_id`, `qty`, `revenue`, `cost`, `profit`, `score`, `status`
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
  SELECT 1 AS ri, '华东' AS region, 1.20 AS rf UNION ALL
  SELECT 2, '华南', 1.10 UNION ALL
  SELECT 3, '华北', 1.00 UNION ALL
  SELECT 4, '西部', 0.80
),
`channels` AS (
  SELECT 1 AS ci, '线上' AS channel, 1.15 AS cf UNION ALL
  SELECT 2, '门店', 1.00 UNION ALL
  SELECT 3, '经销', 0.85
)
SELECT
  TO_DAYS(dt) * 100 + ri * 10 + ci AS id,
  dt AS order_date,
  TIMESTAMP(dt)
    + INTERVAL ((ci * 5 + DAY(dt) * 3) % 12 + 9) HOUR
    + INTERVAL ((DAY(dt) * 7 + ci * 11) % 60) MINUTE AS order_at,
  CASE WHEN (TO_DAYS(dt) + ci) % 50 = 0 THEN NULL ELSE region END AS region,
  channel,
  ELT(((DAYOFYEAR(dt) + ri + ci) % 5) + 1, '服饰', '数码', '家居', '食品', '美妆') AS category,
  CONCAT(
    ELT(((DAYOFYEAR(dt) + ri + ci) % 5) + 1, '服饰', '数码', '家居', '食品', '美妆'),
    '-',
    LPAD(((DAYOFYEAR(dt) * 3 + ri * 7 + ci * 11) % 4) + 1, 2, '0')
  ) AS product,
  1000 + ri * 100 + (DAYOFYEAR(dt) + ci * 13) % 80 AS user_id,
  CASE
    WHEN (TO_DAYS(dt) + ri + ci) % 97 = 0 THEN 0
    ELSE 10 + (DAYOFYEAR(dt) + ri * 5 + ci) % 20
  END AS qty,
  CASE
    WHEN (TO_DAYS(dt) + ri + ci) % 97 = 0 THEN 0.00
    ELSE ROUND(
      100
      * (CASE WHEN WEEKDAY(dt) < 5 THEN 1.15 ELSE 0.85 END)
      * (1.00 + MONTH(dt) * 0.04)
      * rf * cf,
      2)
  END AS revenue,
  CASE
    WHEN (TO_DAYS(dt) + ri + ci) % 97 = 0 THEN 0.00
    ELSE ROUND(
      ROUND(
        100
        * (CASE WHEN WEEKDAY(dt) < 5 THEN 1.15 ELSE 0.85 END)
        * (1.00 + MONTH(dt) * 0.04)
        * rf * cf,
        2) * 0.65,
      2)
  END AS cost,
  CASE
    WHEN (TO_DAYS(dt) + ri + ci) % 97 = 0 THEN 0.00
    ELSE ROUND(
      100
      * (CASE WHEN WEEKDAY(dt) < 5 THEN 1.15 ELSE 0.85 END)
      * (1.00 + MONTH(dt) * 0.04)
      * rf * cf,
      2)
      - ROUND(
        ROUND(
          100
          * (CASE WHEN WEEKDAY(dt) < 5 THEN 1.15 ELSE 0.85 END)
          * (1.00 + MONTH(dt) * 0.04)
          * rf * cf,
          2) * 0.65,
        2)
  END AS profit,
  60 + (DAY(dt) + ri * 7 + ci * 3) % 40 AS score,
  CASE (TO_DAYS(dt) + ri + ci) % 10
    WHEN 0 THEN NULL
    WHEN 1 THEN '已取消'
    WHEN 2 THEN '待发货'
    ELSE '已支付'
  END AS status
FROM `dates`
CROSS JOIN `regions`
CROSS JOIN `channels`
WHERE (DAYOFYEAR(dt) + ri * 17 + ci * 31) % 10 <> 0;


-- ---------- 数据集 ----------
DELETE FROM `vis_dataset_field` WHERE `dataset_id` IN (9101, 9102);
DELETE FROM `vis_dataset` WHERE `id` IN (9101, 9102);

INSERT INTO `vis_dataset` (
  `id`, `source_id`, `dataset_name`, `dataset_desc`, `sql_content`, `param_demo`,
  `status`, `create_at`, `create_by`, `modify_at`, `modify_by`
) VALUES
(
  9101, 1, 'vis_demo_订单明细',
  'vis 演示：无参订单明细。建议 asOfDate=2026-06-15',
  'SELECT * FROM vis_demo_order',
  '{}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9102, 1, 'vis_demo_订单明细_条件',
  'vis 演示：Enjoy 条件（region/channel/order_date）。order_date 为闭区间两日期',
  'SELECT * FROM vis_demo_order
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
  '{"region":["华东"],"channel":["线上"]}',
  'EBL', NULL, NULL, NULL, NULL
);

INSERT INTO `vis_dataset_field` (
  `id`, `dataset_id`, `field`, `data_type`, `suggest_role`, `sort_num`, `status`,
  `create_at`, `create_by`, `modify_at`, `modify_by`
) VALUES
  (910101, 9101, 'order_date', 'DATE', 'DIMENSION', 1, 'EBL', NULL, NULL, NULL, NULL),
  (910102, 9101, 'order_at', 'DATETIME', 'DIMENSION', 2, 'EBL', NULL, NULL, NULL, NULL),
  (910103, 9101, 'region', 'STRING', 'DIMENSION', 3, 'EBL', NULL, NULL, NULL, NULL),
  (910104, 9101, 'channel', 'STRING', 'DIMENSION', 4, 'EBL', NULL, NULL, NULL, NULL),
  (910105, 9101, 'category', 'STRING', 'DIMENSION', 5, 'EBL', NULL, NULL, NULL, NULL),
  (910106, 9101, 'product', 'STRING', 'DIMENSION', 6, 'EBL', NULL, NULL, NULL, NULL),
  (910107, 9101, 'status', 'STRING', 'DIMENSION', 7, 'EBL', NULL, NULL, NULL, NULL),
  (910108, 9101, 'user_id', 'NUMBER', 'METRIC', 8, 'EBL', NULL, NULL, NULL, NULL),
  (910109, 9101, 'qty', 'NUMBER', 'METRIC', 9, 'EBL', NULL, NULL, NULL, NULL),
  (910110, 9101, 'revenue', 'NUMBER', 'METRIC', 10, 'EBL', NULL, NULL, NULL, NULL),
  (910111, 9101, 'cost', 'NUMBER', 'METRIC', 11, 'EBL', NULL, NULL, NULL, NULL),
  (910112, 9101, 'profit', 'NUMBER', 'METRIC', 12, 'EBL', NULL, NULL, NULL, NULL),
  (910113, 9101, 'score', 'NUMBER', 'METRIC', 13, 'EBL', NULL, NULL, NULL, NULL),
  (910201, 9102, 'order_date', 'DATE', 'DIMENSION', 1, 'EBL', NULL, NULL, NULL, NULL),
  (910202, 9102, 'order_at', 'DATETIME', 'DIMENSION', 2, 'EBL', NULL, NULL, NULL, NULL),
  (910203, 9102, 'region', 'STRING', 'DIMENSION', 3, 'EBL', NULL, NULL, NULL, NULL),
  (910204, 9102, 'channel', 'STRING', 'DIMENSION', 4, 'EBL', NULL, NULL, NULL, NULL),
  (910205, 9102, 'category', 'STRING', 'DIMENSION', 5, 'EBL', NULL, NULL, NULL, NULL),
  (910206, 9102, 'product', 'STRING', 'DIMENSION', 6, 'EBL', NULL, NULL, NULL, NULL),
  (910207, 9102, 'status', 'STRING', 'DIMENSION', 7, 'EBL', NULL, NULL, NULL, NULL),
  (910208, 9102, 'user_id', 'NUMBER', 'METRIC', 8, 'EBL', NULL, NULL, NULL, NULL),
  (910209, 9102, 'qty', 'NUMBER', 'METRIC', 9, 'EBL', NULL, NULL, NULL, NULL),
  (910210, 9102, 'revenue', 'NUMBER', 'METRIC', 10, 'EBL', NULL, NULL, NULL, NULL),
  (910211, 9102, 'cost', 'NUMBER', 'METRIC', 11, 'EBL', NULL, NULL, NULL, NULL),
  (910212, 9102, 'profit', 'NUMBER', 'METRIC', 12, 'EBL', NULL, NULL, NULL, NULL),
  (910213, 9102, 'score', 'NUMBER', 'METRIC', 13, 'EBL', NULL, NULL, NULL, NULL);


-- ---------- 卡片 ----------
DELETE FROM `vis_dashboard_card` WHERE `card_id` BETWEEN 9201 AND 9419;
DELETE FROM `vis_card` WHERE `id` BETWEEN 9201 AND 9419;

INSERT INTO `vis_card` (
  `id`, `card_name`, `card_desc`, `dataset_id`, `chart_type`, `query_json`, `visual_json`,
  `status`, `create_at`, `create_by`, `modify_at`, `modify_by`
) VALUES
-- ---------- 指标卡 ----------
(
  9201, 'demo_指标卡_本月营收', '主/辅指标、前缀、大字、明细+下载',
  9101, 'number',
  '{"datasetId":"9101","asOfDate":"2026-06-15","metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"profit","agg":"SUM","label":"毛利"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}]}',
  '{"chartType":"number","showTitle":true,"showDescription":true,"description":"本月合计，辅指标为毛利","allowDetail":true,"allowDownload":true,"number":{"showLabel":true,"showAuxLabel":true,"prefix":"¥","size":"lg"}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9202, 'demo_指标卡_同环比', '同比 shift_year / 环比 shift_month',
  9101, 'number',
  '{"datasetId":"9101","asOfDate":"2026-06-15","metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"profit","agg":"SUM","label":"毛利"},{"field":"revenue","agg":"SUM","label":"营收同比","contrast":{"timeField":"order_date","calcMethod":"shift_year","calcType":"diffRate","valueExp":"current_month"}},{"field":"revenue","agg":"SUM","label":"营收环比","contrast":{"timeField":"order_date","calcMethod":"shift_month","calcType":"diff","valueExp":"current_month"}}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}]}',
  '{"chartType":"number","showTitle":true,"allowDetail":true,"number":{"showLabel":true,"showAuxLabel":true,"decimals":1}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9203, 'demo_指标卡_紧凑着色', '万/亿紧凑、主值色、深色卡片壳',
  9101, 'number',
  '{"datasetId":"9101","asOfDate":"2026-06-15","metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"qty","agg":"SUM","label":"件数"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_year"}]}]}',
  '{"chartType":"number","showTitle":true,"title":"今年营收","cardBg":"#0f172a","cardColor":"#e2e8f0","number":{"compact":true,"decimals":2,"color":"#1677FF","size":"sm","showLabel":true,"showAuxLabel":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9204, 'demo_指标卡_上月', '日期快捷 last_month',
  9101, 'number',
  '{"datasetId":"9101","asOfDate":"2026-06-15","metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"qty","agg":"SUM","label":"件数"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"last_month"}]}]}',
  '{"chartType":"number","showTitle":true,"allowDetail":true,"number":{"showLabel":true,"prefix":"¥"}}',
  'EBL', NULL, NULL, NULL, NULL
),
-- ---------- 进度条 ----------
(
  9205, 'demo_进度条_指标目标', '第 2 个指标作目标（营收×1.2）',
  9101, 'progress',
  '{"datasetId":"9101","asOfDate":"2026-06-15","metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"目标","formula":"SUM(revenue)*1.2","label":"目标"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}]}',
  '{"chartType":"progress","showTitle":true,"showDescription":true,"description":"第 2 个指标作目标","allowDetail":true,"progress":{"showLabel":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9206, 'demo_进度条_环形固定目标', 'ring + 固定 target',
  9101, 'progress',
  '{"datasetId":"9101","asOfDate":"2026-06-15","metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}]}',
  '{"chartType":"progress","showTitle":true,"allowDetail":true,"progress":{"shape":"ring","target":50000,"decimals":0,"prefix":"¥","color":"#1677FF","trackColor":"#E6F4FF","size":"lg"}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9207, 'demo_进度条_着色', '毛利/营收作当前/目标',
  9101, 'progress',
  '{"datasetId":"9101","asOfDate":"2026-06-15","metrics":[{"field":"profit","agg":"SUM","label":"毛利"},{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}]}',
  '{"chartType":"progress","showTitle":true,"progress":{"showLabel":true,"color":"#52C41A","trackColor":"#F6FFED","decimals":1,"prefix":"¥"}}',
  'EBL', NULL, NULL, NULL, NULL
),
-- ---------- 表格 ----------
(
  9208, 'demo_表格_聚合公式', '多聚合/公式、关排序、列头过滤、斑马纹、易辨色',
  9101, 'table',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"region","label":"区域"},{"field":"category","label":"品类"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"profit","agg":"SUM","label":"毛利"},{"field":"qty","agg":"AVG","label":"件均"},{"field":"score","agg":"MIN","label":"最低分"},{"field":"score","agg":"MAX","label":"最高分"},{"field":"user_id","agg":"COUNT_DISTINCT","label":"用户数"},{"field":"利润率","formula":"SUM(profit)/SUM(revenue)*100","label":"利润率"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"},{"field":"region","op":"is_not_null"}]}],"orderList":[{"field":"营收","dir":"desc"}],"limit":50}',
  '{"chartType":"table","showTitle":true,"allowDetail":true,"allowDownload":true,"chartTheme":"COLORBLIND","table":{"showFilter":true,"sortable":false,"striped":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9209, 'demo_表格_数据标注', '整列/条件/OR 涂色',
  9101, 'table',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"region","label":"区域"},{"field":"channel","label":"渠道"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"profit","agg":"SUM","label":"毛利"},{"field":"利润率","formula":"SUM(profit)/SUM(revenue)*100","label":"利润率"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"},{"field":"region","op":"is_not_null"}]}],"orderList":[{"field":"营收","dir":"desc"}]}',
  '{"chartType":"table","showTitle":true,"showDescription":true,"description":"整列涂利润率；营收过高标红；华东或西部标区域","allowDetail":true,"table":{"showFilter":true,"striped":true,"marks":[{"fields":["利润率"],"style":{"color":"#047857","italic":true}},{"fields":["营收"],"combineOp":"and","filters":[{"field":"营收","op":"gt","value":[20000]}],"style":{"color":"#F5222D","bgColor":"#FFCCC7","bold":true}},{"fields":["区域"],"combineOp":"or","filters":[{"field":"区域","op":"eq","value":["华东"]},{"field":"区域","op":"eq","value":["西部"]}],"style":{"bgColor":"#BAE0FF"}}]}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9210, 'demo_表格_同环比', '同比 + last_days 环比；对比格不应出明细菜单',
  9101, 'table',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"region","label":"区域"},{"field":"channel","label":"渠道"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"revenue","agg":"SUM","label":"营收同比","contrast":{"timeField":"order_date","calcMethod":"shift_year","calcType":"diffRate","valueExp":"current_month"}},{"field":"revenue","agg":"SUM","label":"营收环比","contrast":{"timeField":"order_date","calcMethod":"shift_period","calcType":"diffRate","valueExp":"last_days","value":[7]}}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"},{"field":"region","op":"is_not_null"}]}],"orderList":[{"field":"营收","dir":"desc"}]}',
  '{"chartType":"table","showTitle":true,"allowDetail":true,"table":{"showFilter":true,"striped":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9211, 'demo_表格_行级过滤', 'AND/OR、between/like/in/is_null',
  9101, 'table',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"region","label":"区域"},{"field":"status","label":"状态"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"qty","agg":"COUNT","label":"行数"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","op":"between","value":["2026-01-01","2026-06-15"]},{"field":"qty","op":"between","value":[10,30]},{"field":"product","op":"like","value":["服饰"]}]},{"combineOp":"or","conditions":[{"field":"region","op":"in","value":["华东","华南"]},{"field":"status","op":"is_null"}]}],"orderList":[{"field":"营收","dir":"desc"}]}',
  '{"chartType":"table","showTitle":true,"allowDetail":true,"table":{"showFilter":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9212, 'demo_表格_having', 'having + resultFilters',
  9101, 'table',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"region","label":"区域"},{"field":"category","label":"品类"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"user_id","agg":"COUNT_DISTINCT","label":"用户数"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_year"},{"field":"region","op":"is_not_null"}]}],"havingFilters":[{"field":"revenue","agg":"SUM","op":"gt","value":[20000]},{"field":"用户数","formula":"COUNT(DISTINCT user_id)","op":"gte","value":[10]}],"resultFilters":[{"field":"营收","op":"lt","value":[500000]}],"orderList":[{"field":"营收","dir":"desc"}]}',
  '{"chartType":"table","showTitle":true,"allowDetail":true,"table":{"showFilter":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9213, 'demo_表格_序号合并', '行号 + 相邻相同值合并',
  9101, 'table',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"region","label":"区域"},{"field":"channel","label":"渠道"},{"field":"category","label":"品类"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"},{"field":"region","op":"is_not_null"}]}],"orderList":[{"field":"区域","dir":"asc"},{"field":"营收","dir":"desc"}]}',
  '{"chartType":"table","showTitle":true,"allowDetail":true,"table":{"showRowNumber":true,"mergeCell":true,"striped":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
-- ---------- 透视 ----------
(
  9214, 'demo_透视_合计位置', '行/列小计总计在开头 + 高对比',
  9101, 'pivot',
  '{"datasetId":"9101","asOfDate":"2026-06-15","rowDimensions":[{"field":"region","label":"区域"},{"field":"category","label":"品类"}],"colDimensions":[{"field":"channel","label":"渠道"},{"field":"status","label":"状态"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"qty","agg":"SUM","label":"件数"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"},{"field":"region","op":"is_not_null"},{"field":"status","op":"is_not_null"}]}],"orderList":[{"field":"营收","dir":"desc"}]}',
  '{"chartType":"pivot","showTitle":true,"showDescription":true,"description":"行总计顶部、列总计左侧，小计在组前/组左","allowDetail":true,"rowSubtotal":true,"rowTotal":true,"columnSubtotal":true,"columnTotal":true,"chartTheme":"CONTRAST","table":{"rowTotalPlace":"start","columnTotalPlace":"start","rowSubtotalPlace":"start","columnSubtotalPlace":"start"}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9215, 'demo_透视_树形', '树形时行小计挂在父行',
  9101, 'pivot',
  '{"datasetId":"9101","asOfDate":"2026-06-15","rowDimensions":[{"field":"region","label":"区域"},{"field":"category","label":"品类"}],"colDimensions":[{"field":"channel","label":"渠道"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"},{"field":"region","op":"is_not_null"}]}]}',
  '{"chartType":"pivot","showTitle":true,"allowDetail":true,"rowSubtotal":true,"rowTotal":true,"columnTotal":true,"table":{"treeDisplay":true,"sortColumn":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9216, 'demo_透视_月列维标注', '月粒度列维 + 标注',
  9101, 'pivot',
  '{"datasetId":"9101","asOfDate":"2026-06-15","rowDimensions":[{"field":"region","label":"区域"}],"colDimensions":[{"field":"order_date","label":"月份","timeGrain":"month"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_year"},{"field":"region","op":"is_not_null"}]}]}',
  '{"chartType":"pivot","showTitle":true,"allowDetail":true,"rowTotal":true,"columnTotal":true,"table":{"striped":true,"marks":[{"fields":["营收"],"combineOp":"and","filters":[{"field":"营收","op":"gt","value":[8000]}],"style":{"bgColor":"#D9F7BE","bold":true}}]}}',
  'EBL', NULL, NULL, NULL, NULL
),
-- ---------- 柱 ----------
(
  9217, 'demo_柱状_堆叠', '月×渠道堆叠 + 数据标签 + 高对比',
  9101, 'bar',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"order_date","label":"月份","timeGrain":"month"},{"field":"channel","label":"渠道"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_year"}]}],"orderList":[{"field":"月份","dir":"asc"}]}',
  '{"chartType":"bar","showTitle":true,"allowDetail":true,"chartTheme":"CONTRAST","chart":{"stacked":true,"dataLabel":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9218, 'demo_柱状_横向', 'horizontal + 关图例',
  9101, 'bar',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"region","label":"区域"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"},{"field":"region","op":"is_not_null"}]}],"orderList":[{"field":"营收","dir":"desc"}]}',
  '{"chartType":"bar","showTitle":true,"allowDetail":true,"chart":{"orientation":"horizontal","legend":false}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9219, 'demo_柱状_双轴', '营收上副轴',
  9101, 'bar',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"region","label":"区域"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"qty","agg":"SUM","label":"件数"},{"field":"profit","agg":"SUM","label":"毛利"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"},{"field":"region","op":"is_not_null"}]}]}',
  '{"chartType":"bar","showTitle":true,"showDescription":true,"description":"营收上副轴，件数/毛利在主轴","allowDetail":true,"chart":{"dualAxis":true,"secondaryFields":["营收"]}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9220, 'demo_柱状_XY天', 'last_xy_days 14–7',
  9101, 'bar',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"channel","label":"渠道"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"last_xy_days","value":[14,7]}]}]}',
  '{"chartType":"bar","showTitle":true,"allowDetail":true}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9221, 'demo_柱状_百分比堆叠', 'stacked + percent',
  9101, 'bar',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"order_date","label":"月份","timeGrain":"month"},{"field":"channel","label":"渠道"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_year"}]}],"orderList":[{"field":"月份","dir":"asc"}]}',
  '{"chartType":"bar","showTitle":true,"allowDetail":true,"chart":{"stacked":true,"percent":true,"dataLabel":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9222, 'demo_柱状_滚动十字', '类目滚动条 + 十字辅助线',
  9101, 'bar',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"product","label":"商品"}],"metrics":[{"field":"qty","agg":"SUM","label":"件数"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}],"orderList":[{"field":"件数","dir":"desc"}],"limit":30}',
  '{"chartType":"bar","showTitle":true,"allowDetail":true,"chart":{"scrollbar":true,"crosshair":true,"legend":false}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9223, 'demo_柱状_Enjoy条件', '数据集 9102 模板参数',
  9102, 'bar',
  '{"datasetId":"9102","asOfDate":"2026-06-15","dimensions":[{"field":"channel","label":"渠道"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"params":[{"field":"region","value":["华东","华南"]},{"field":"order_date","valueExp":"current_month"}]}',
  '{"chartType":"bar","showTitle":true,"showDescription":true,"description":"9102 Enjoy：region / order_date","allowDetail":true}',
  'EBL', NULL, NULL, NULL, NULL
),
-- ---------- 折线 ----------
(
  9224, 'demo_折线_面积平滑', 'area + smooth + 图例在上 + 易辨色',
  9101, 'line',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"order_date","label":"日","timeGrain":"day"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"qty","agg":"SUM","label":"件数"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"last_days","value":[30]}]}],"orderList":[{"field":"日","dir":"asc"}]}',
  '{"chartType":"line","showTitle":true,"allowDetail":true,"chartTheme":"COLORBLIND","chart":{"area":true,"smooth":true,"legendPosition":"top"}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9225, 'demo_折线_双轴', 'dualAxis + smooth',
  9101, 'line',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"order_date","label":"日","timeGrain":"day"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"qty","agg":"SUM","label":"件数"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"last_days","value":[30]}]}],"orderList":[{"field":"日","dir":"asc"}]}',
  '{"chartType":"line","showTitle":true,"allowDetail":true,"chart":{"dualAxis":true,"smooth":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9226, 'demo_折线_本周时刻', 'DATETIME 快捷打在 order_at / current_week',
  9101, 'line',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"order_date","label":"日","timeGrain":"day"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_at","valueExp":"current_week"}]}],"orderList":[{"field":"日","dir":"asc"}]}',
  '{"chartType":"line","showTitle":true,"allowDetail":true}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9227, 'demo_折线_周粒度', 'timeGrain=week + 今年至今',
  9101, 'line',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"order_date","label":"周","timeGrain":"week"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_year"}]}],"orderList":[{"field":"周","dir":"asc"}]}',
  '{"chartType":"line","showTitle":true,"allowDetail":true,"chart":{"area":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9228, 'demo_折线_去年', 'last_year + year 粒度',
  9101, 'line',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"order_date","label":"月份","timeGrain":"month"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"last_year"}]}],"orderList":[{"field":"月份","dir":"asc"}]}',
  '{"chartType":"line","showTitle":true,"allowDetail":true,"chart":{"smooth":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
-- ---------- 组合 / 饼 / 散点 / 雷达 / 漏斗 / 词云 ----------
(
  9229, 'demo_组合_月营收件数', '未指定折线时末项画折线，双轴默认开',
  9101, 'combo',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"order_date","label":"月份","timeGrain":"month"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"qty","agg":"SUM","label":"件数"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_year"}]}],"orderList":[{"field":"月份","dir":"asc"}]}',
  '{"chartType":"combo","showTitle":true,"showDescription":true,"description":"件数画折线","allowDetail":true,"chart":{"smooth":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9230, 'demo_组合_指定折线', 'lineFields + secondaryFields',
  9101, 'combo',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"region","label":"区域"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"profit","agg":"SUM","label":"毛利"},{"field":"qty","agg":"SUM","label":"件数"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"},{"field":"region","op":"is_not_null"}]}]}',
  '{"chartType":"combo","showTitle":true,"allowDetail":true,"chartTheme":"CONTRAST","chart":{"lineFields":["营收"],"secondaryFields":["营收"]}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9231, 'demo_饼图_圆环', 'donut + 图例在左 + 高对比',
  9101, 'pie',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"region","label":"区域"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"},{"field":"region","op":"is_not_null"}]}],"orderList":[{"field":"营收","dir":"desc"}]}',
  '{"chartType":"pie","showTitle":true,"allowDetail":true,"chartTheme":"CONTRAST","chart":{"donut":true,"legendPosition":"left"}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9232, 'demo_散点_品类', '件数×营收 + 数据标签',
  9101, 'scatter',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"category","label":"品类"}],"metrics":[{"field":"qty","agg":"SUM","label":"件数"},{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_year"}]}]}',
  '{"chartType":"scatter","showTitle":true,"allowDetail":true,"chartTheme":"COLORBLIND","chart":{"dataLabel":true,"crosshair":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9233, 'demo_雷达_多指标', '1 维多指标，面积默认开',
  9101, 'radar',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"region","label":"区域"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"profit","agg":"SUM","label":"毛利"},{"field":"qty","agg":"SUM","label":"件数"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"},{"field":"region","op":"is_not_null"}]}]}',
  '{"chartType":"radar","showTitle":true,"allowDetail":true}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9234, 'demo_雷达_无面积', 'area=false + 数据标签',
  9101, 'radar',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"category","label":"品类"}],"metrics":[{"field":"score","agg":"AVG","label":"评分"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}]}',
  '{"chartType":"radar","showTitle":true,"allowDetail":true,"chart":{"area":false,"dataLabel":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9235, 'demo_漏斗_状态转化', 'showRate 相邻阶段转化',
  9101, 'funnel',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"status","label":"状态"}],"metrics":[{"field":"qty","agg":"SUM","label":"件数"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"},{"field":"status","op":"is_not_null"}]}],"orderList":[{"field":"件数","dir":"desc"}]}',
  '{"chartType":"funnel","showTitle":true,"allowDetail":true,"chart":{"showRate":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9236, 'demo_词云_商品', '商品 × 件数',
  9101, 'wordcloud',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"product","label":"商品"}],"metrics":[{"field":"qty","agg":"SUM","label":"件数"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}],"orderList":[{"field":"件数","dir":"desc"}],"limit":40}',
  '{"chartType":"wordcloud","showTitle":true,"allowDetail":true,"chartTheme":"COLORBLIND"}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9237, 'demo_词云_旋转轮廓', 'randomRotate + shapeText',
  9101, 'wordcloud',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"category","label":"品类"}],"metrics":[{"field":"qty","agg":"SUM","label":"件数"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_year"}]}]}',
  '{"chartType":"wordcloud","showTitle":true,"chart":{"randomRotate":true,"shapeText":"SALE"}}',
  'EBL', NULL, NULL, NULL, NULL
),
-- ---------- 静态 / 状态 ----------
(
  9238, 'demo_富文本_说明', '无需数据集',
  0, 'richtext',
  '{"datasetId":""}',
  '{"chartType":"richtext","showTitle":true,"showDescription":true,"description":"无需数据集","cardBg":"#f8fafc","cardColor":"#0f172a","richtext":{"html":"<h2>vis 测试卡片</h2><p>查询基准日建议 <b>2026-06-15</b>。搜卡片名 <code>demo_</code>。</p><ul><li>指标卡 / 趋势 / 进度 / KPI / 排行</li><li>表格 / 透视</li><li>柱 / 线 / 组合 / 饼 / 散点 / 雷达 / 漏斗 / 词云</li><li>瀑布 / 对比条 / 热力 / 矩形树</li><li>富文本 / 套用网页</li></ul>"}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9239, 'demo_网页_示例', '无需数据集',
  0, 'url',
  '{"datasetId":""}',
  '{"chartType":"url","showTitle":true,"web":{"url":"https://example.com"}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9240, 'demo_指标卡_已禁用', 'status=DBL，看板上应显示已禁用',
  9101, 'number',
  '{"datasetId":"9101","asOfDate":"2026-06-15","metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_day"}]}]}',
  '{"chartType":"number","showTitle":true,"number":{"showLabel":true,"prefix":"¥"}}',
  'DBL', NULL, NULL, NULL, NULL
),
-- ---------- 补缺：同环比 / 日期快捷 / 样式 ----------
(
  9241, 'demo_指标卡_无标题大字', 'showTitle=false、xl、关千分位',
  9101, 'number',
  '{"datasetId":"9101","asOfDate":"2026-06-15","metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"profit","agg":"SUM","label":"毛利"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}]}',
  '{"chartType":"number","showTitle":false,"allowDetail":true,"number":{"showLabel":true,"showAuxLabel":true,"prefix":"¥","decimals":2,"separator":false,"size":"xl","color":"#1677FF"}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9242, 'demo_指标卡_日环比', 'current_day + shift_day',
  9101, 'number',
  '{"datasetId":"9101","asOfDate":"2026-06-15","metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"revenue","agg":"SUM","label":"日环比","contrast":{"timeField":"order_date","calcMethod":"shift_day","calcType":"diffRate","valueExp":"current_day"}}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_day"}]}]}',
  '{"chartType":"number","showTitle":true,"allowDetail":true,"number":{"showLabel":true,"decimals":1,"prefix":"¥"}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9243, 'demo_指标卡_近7天对比', 'last_days + shift_period',
  9101, 'number',
  '{"datasetId":"9101","asOfDate":"2026-06-15","metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"revenue","agg":"SUM","label":"近7天对比","contrast":{"timeField":"order_date","calcMethod":"shift_period","calcType":"diffRate","valueExp":"last_days","value":[7]}}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"last_days","value":[7]}]}]}',
  '{"chartType":"number","showTitle":true,"allowDetail":true,"number":{"showLabel":true,"decimals":1}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9244, 'demo_指标卡_上周', 'last_week + shift_week',
  9101, 'number',
  '{"datasetId":"9101","asOfDate":"2026-06-15","metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"revenue","agg":"SUM","label":"周同比","contrast":{"timeField":"order_date","calcMethod":"shift_week","calcType":"diff","valueExp":"last_week"}}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"last_week"}]}]}',
  '{"chartType":"number","showTitle":true,"allowDetail":true,"number":{"showLabel":true,"prefix":"¥"}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9245, 'demo_进度条_细条', 'bar + xs + 完成率小数',
  9101, 'progress',
  '{"datasetId":"9101","asOfDate":"2026-06-15","metrics":[{"field":"profit","agg":"SUM","label":"毛利"},{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}]}',
  '{"chartType":"progress","showTitle":true,"allowDetail":true,"progress":{"shape":"bar","size":"xs","showLabel":true,"percentDecimals":0,"prefix":"¥","color":"#722ED1","trackColor":"#F9F0FF"}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9246, 'demo_进度条_粗条', 'bar + xl + compact',
  9101, 'progress',
  '{"datasetId":"9101","asOfDate":"2026-06-15","metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_year"}]}]}',
  '{"chartType":"progress","showTitle":true,"title":"今年营收进度","showDescription":true,"description":"固定目标 200 万","allowDetail":true,"progress":{"shape":"bar","size":"xl","target":2000000,"compact":true,"decimals":1,"prefix":"¥","showLabel":true,"percentDecimals":1}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9247, 'demo_折线_堆叠面积', '日期×渠道 stacked + area',
  9101, 'line',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"order_date","label":"日","timeGrain":"day"},{"field":"channel","label":"渠道"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"last_days","value":[14]}]}],"orderList":[{"field":"日","dir":"asc"}]}',
  '{"chartType":"line","showTitle":true,"allowDetail":true,"chart":{"stacked":true,"area":true,"legendPosition":"top"}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9248, 'demo_柱状_关提示', 'tooltip=false、图例在右、数据标签',
  9101, 'bar',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"region","label":"区域"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"profit","agg":"SUM","label":"毛利"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"},{"field":"region","op":"is_not_null"}]}]}',
  '{"chartType":"bar","showTitle":true,"title":"区域营收/毛利","showDescription":true,"description":"关掉 tooltip，图例在右","allowDetail":true,"chartTheme":"CONTRAST","chart":{"tooltip":false,"dataLabel":true,"legendPosition":"right"}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9249, 'demo_饼图_暖渐变', 'WARM_GRADIENT + 关中心文字',
  9101, 'pie',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"category","label":"品类"}],"metrics":[{"field":"qty","agg":"SUM","label":"件数"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}],"orderList":[{"field":"件数","dir":"desc"}]}',
  '{"chartType":"pie","showTitle":true,"allowDetail":true,"chartTheme":"WARM_GRADIENT","chart":{"donut":true,"centerText":false}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9250, 'demo_饼图_冷渐变', 'GRADIENT + 关图例',
  9101, 'pie',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"channel","label":"渠道"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}]}',
  '{"chartType":"pie","showTitle":true,"allowDetail":true,"chartTheme":"GRADIENT","chart":{"legend":false}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9251, 'demo_词云_冷渐变', 'chartTheme=GRADIENT',
  9101, 'wordcloud',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"product","label":"商品"}],"metrics":[{"field":"qty","agg":"SUM","label":"件数"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_year"}]}],"orderList":[{"field":"件数","dir":"desc"}],"limit":36}',
  '{"chartType":"wordcloud","showTitle":true,"allowDetail":true,"chartTheme":"GRADIENT"}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9252, 'demo_组合_堆叠面积', 'stacked + area + smooth',
  9101, 'combo',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"order_date","label":"月份","timeGrain":"month"},{"field":"channel","label":"渠道"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"qty","agg":"SUM","label":"件数"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_year"}]}],"orderList":[{"field":"月份","dir":"asc"}]}',
  '{"chartType":"combo","showTitle":true,"allowDetail":true,"chart":{"stacked":true,"area":true,"smooth":true,"lineFields":["件数"]}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9253, 'demo_漏斗_无转化率', 'showRate=false、关数据标签',
  9101, 'funnel',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"status","label":"状态"}],"metrics":[{"field":"qty","agg":"SUM","label":"件数"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_year"},{"field":"status","op":"is_not_null"}]}],"orderList":[{"field":"件数","dir":"desc"}]}',
  '{"chartType":"funnel","showTitle":true,"allowDetail":true,"chart":{"showRate":false,"dataLabel":false}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9254, 'demo_柱状_日粒度', 'timeGrain=day + last_days 14',
  9101, 'bar',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"order_date","label":"日","timeGrain":"day"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"last_days","value":[14]}]}],"orderList":[{"field":"日","dir":"asc"}]}',
  '{"chartType":"bar","showTitle":true,"allowDetail":true,"chart":{"scrollbar":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9255, 'demo_折线_上周', 'last_week + day',
  9101, 'line',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"order_date","label":"日","timeGrain":"day"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"last_week"}]}],"orderList":[{"field":"日","dir":"asc"}]}',
  '{"chartType":"line","showTitle":true,"allowDetail":true,"chart":{"smooth":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9256, 'demo_表格_昨天', 'last_day + 可排序',
  9101, 'table',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"region","label":"区域"},{"field":"product","label":"商品"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"qty","agg":"SUM","label":"件数"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"last_day"},{"field":"region","op":"is_not_null"}]}],"orderList":[{"field":"营收","dir":"desc"}],"limit":40}',
  '{"chartType":"table","showTitle":true,"allowDetail":true,"allowDownload":true,"chartTheme":"COLORBLIND","table":{"showFilter":true,"sortable":true,"striped":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9257, 'demo_表格_筛选底表', '看板 9504 用：今年明细，吃全局筛选',
  9101, 'table',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"region","label":"区域"},{"field":"channel","label":"渠道"},{"field":"product","label":"商品"},{"field":"order_date","label":"日期","timeGrain":"day"}],"metrics":[{"field":"qty","agg":"SUM","label":"件数"},{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_year"},{"field":"region","op":"is_not_null"}]}],"orderList":[{"field":"日期","dir":"desc"}],"limit":80}',
  '{"chartType":"table","showTitle":true,"allowDetail":true,"allowDownload":true,"table":{"showFilter":true,"sortable":true,"striped":true,"showRowNumber":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9258, 'demo_指标卡_今天', 'current_day',
  9101, 'number',
  '{"datasetId":"9101","asOfDate":"2026-06-15","metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"qty","agg":"SUM","label":"件数"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_day"}]}]}',
  '{"chartType":"number","showTitle":true,"allowDetail":true,"number":{"showLabel":true,"showAuxLabel":true,"prefix":"¥","size":"sm"}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9259, 'demo_柱状_年粒度', 'timeGrain=year + current_year（一点）',
  9101, 'bar',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"order_date","label":"年","timeGrain":"year"},{"field":"region","label":"区域"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_year"},{"field":"region","op":"is_not_null"}]}]}',
  '{"chartType":"bar","showTitle":true,"allowDetail":true,"chart":{"dataLabel":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9260, 'demo_富文本_深色壳', 'cardBg/cardColor',
  0, 'richtext',
  '{"datasetId":""}',
  '{"chartType":"richtext","showTitle":true,"cardBg":"#0f172a","cardColor":"#e2e8f0","richtext":{"html":"<h3>深色卡片壳</h3><p>搜 <code>demo_</code>。看板筛选见 <b>demo_筛选表单</b>。</p><p>基准日 <b>2026-06-15</b>。</p>"}}',
  'EBL', NULL, NULL, NULL, NULL
),
-- ---------- 目标进度 ----------
(
  9261, 'demo_目标进度_区域本月', '区域完成率 + 本月时间线',
  9101, 'kpi',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"region","label":"区域"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"目标","formula":"SUM(revenue)*1.2","label":"目标"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"},{"field":"region","op":"is_not_null"}]}],"orderList":[{"field":"营收","dir":"desc"}]}',
  '{"chartType":"kpi","showTitle":true,"allowDetail":true,"kpi":{"periodMode":"month","prefix":"¥","showValue":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9262, 'demo_目标进度_渠道固定目标', '渠道 + 固定目标 + 本季',
  9101, 'kpi',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"channel","label":"渠道"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"},{"field":"channel","op":"is_not_null"}]}],"orderList":[{"field":"营收","dir":"desc"}]}',
  '{"chartType":"kpi","showTitle":true,"allowDetail":true,"kpi":{"target":80000,"periodMode":"quarter","prefix":"¥","decimals":0}}',
  'EBL', NULL, NULL, NULL, NULL
),
-- ---------- 趋势 / 排行 / 瀑布 / 对比条 / 热力 / 树图 ----------
(
  9263, 'demo_瀑布_月累计', '月营收累加 + 末项合计 + 平均线',
  9101, 'waterfall',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"order_date","label":"月份","timeGrain":"month"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_year"}]}],"orderList":[{"field":"月份","dir":"asc"}]}',
  '{"chartType":"waterfall","showTitle":true,"allowDetail":true,"chart":{"dataLabel":true,"markLines":[{"kind":"avg","label":"平均"}]}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9264, 'demo_瀑布_品类横向', '横向 + 关掉末项合计',
  9101, 'waterfall',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"category","label":"品类"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}],"orderList":[{"field":"营收","dir":"desc"}]}',
  '{"chartType":"waterfall","showTitle":true,"allowDetail":true,"chart":{"orientation":"horizontal","waterfallTotal":false,"dataLabel":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9265, 'demo_趋势_近30日', '主值取最后一天，迷你走势 + 较上期',
  9101, 'trend',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"order_date","label":"日","timeGrain":"day"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"profit","agg":"SUM","label":"毛利"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"last_days","value":[30]}]}],"orderList":[{"field":"日","dir":"asc"}]}',
  '{"chartType":"trend","showTitle":true,"allowDetail":true,"number":{"showLabel":true,"showAuxLabel":true,"prefix":"¥","size":"lg"}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9266, 'demo_趋势_关走势', 'showSparkline=false，只看较上期',
  9101, 'trend',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"order_date","label":"日","timeGrain":"day"}],"metrics":[{"field":"qty","agg":"SUM","label":"件数"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"last_days","value":[14]}]}],"orderList":[{"field":"日","dir":"asc"}]}',
  '{"chartType":"trend","showTitle":true,"number":{"showLabel":true,"size":"md"},"trend":{"showSparkline":false}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9267, 'demo_对比条_区域营收成本', '左营收、右成本',
  9101, 'tornado',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"region","label":"区域"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"cost","agg":"SUM","label":"成本"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"},{"field":"region","op":"is_not_null"}]}],"orderList":[{"field":"营收","dir":"desc"}]}',
  '{"chartType":"tornado","showTitle":true,"allowDetail":true,"chartTheme":"CONTRAST"}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9268, 'demo_对比条_渠道滚动', '件数 vs 营收 + scrollbar',
  9101, 'tornado',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"channel","label":"渠道"}],"metrics":[{"field":"qty","agg":"SUM","label":"件数"},{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}]}',
  '{"chartType":"tornado","showTitle":true,"allowDetail":true,"chart":{"scrollbar":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9269, 'demo_排行_商品件数', '名次 + 占比条',
  9101, 'rank',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"product","label":"商品"}],"metrics":[{"field":"qty","agg":"SUM","label":"件数"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}],"orderList":[{"field":"件数","dir":"desc"}],"limit":10}',
  '{"chartType":"rank","showTitle":true,"allowDetail":true,"rank":{"showPercent":true,"size":"md"}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9270, 'demo_排行_区域营收', '占比、关占比条、紧凑金额',
  9101, 'rank',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"region","label":"区域"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"},{"field":"region","op":"is_not_null"}]}],"orderList":[{"field":"营收","dir":"desc"}]}',
  '{"chartType":"rank","showTitle":true,"allowDetail":true,"rank":{"showPercent":true,"showBar":false,"prefix":"¥","compact":true,"size":"lg"}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9271, 'demo_热力_区域渠道', '横轴区域、纵轴渠道',
  9101, 'heatmap',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"region","label":"区域"},{"field":"channel","label":"渠道"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"},{"field":"region","op":"is_not_null"}]}]}',
  '{"chartType":"heatmap","showTitle":true,"allowDetail":true,"chartTheme":"CONTRAST"}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9272, 'demo_热力_品类月份', '品类 × 月',
  9101, 'heatmap',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"category","label":"品类"},{"field":"order_date","label":"月份","timeGrain":"month"}],"metrics":[{"field":"qty","agg":"SUM","label":"件数"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_year"}]}]}',
  '{"chartType":"heatmap","showTitle":true,"allowDetail":true}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9273, 'demo_树图_区域品类', '2 层嵌套，面积=营收',
  9101, 'treemap',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"region","label":"区域"},{"field":"category","label":"品类"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"},{"field":"region","op":"is_not_null"}]}]}',
  '{"chartType":"treemap","showTitle":true,"allowDetail":true,"chartTheme":"COLORBLIND","chart":{"dataLabel":true}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9274, 'demo_树图_渠道暖渐变', '1 维 + WARM_GRADIENT',
  9101, 'treemap',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"channel","label":"渠道"}],"metrics":[{"field":"qty","agg":"SUM","label":"件数"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"}]}]}',
  '{"chartType":"treemap","showTitle":true,"allowDetail":true,"chartTheme":"WARM_GRADIENT"}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9275, 'demo_柱状_标记线', '平均线 + 固定目标',
  9101, 'bar',
  '{"datasetId":"9101","asOfDate":"2026-06-15","dimensions":[{"field":"region","label":"区域"}],"metrics":[{"field":"revenue","agg":"SUM","label":"营收"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_month"},{"field":"region","op":"is_not_null"}]}],"orderList":[{"field":"营收","dir":"desc"}]}',
  '{"chartType":"bar","showTitle":true,"allowDetail":true,"chart":{"markLines":[{"kind":"avg","label":"平均"},{"kind":"fixed","value":20000,"label":"目标"}]}}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9276, 'demo_指标卡_自动刷新', 'autoRefreshSec=60，仅预览页生效',
  9101, 'number',
  '{"datasetId":"9101","asOfDate":"2026-06-15","metrics":[{"field":"revenue","agg":"SUM","label":"营收"},{"field":"qty","agg":"SUM","label":"件数"}],"filters":[{"combineOp":"and","conditions":[{"field":"order_date","valueExp":"current_day"}]}]}',
  '{"chartType":"number","showTitle":true,"allowDetail":true,"autoRefreshSec":60,"number":{"showLabel":true,"showAuxLabel":true,"prefix":"¥"}}',
  'EBL', NULL, NULL, NULL, NULL
);


-- ---------- 看板 ----------
DELETE FROM `vis_dashboard_card` WHERE `dashboard_id` BETWEEN 9501 AND 9510;
DELETE FROM `vis_dashboard` WHERE `id` BETWEEN 9501 AND 9510;

INSERT INTO `vis_dashboard` (
  `id`, `dash_name`, `dash_desc`, `config_json`, `status`,
  `create_at`, `create_by`, `modify_at`, `modify_by`
) VALUES
(
  9501, 'demo_经营总览', 'KPI + 分组平铺（堆叠柱/饼）+ 趋势；全局区域/渠道',
  '{"filters":[{"uid":"f-region","datasetId":"9101","field":"region","label":"区域","applyAs":"filter","formType":"multiSelect","op":"in"},{"uid":"f-channel","datasetId":"9101","field":"channel","label":"渠道","applyAs":"filter","formType":"multiSelect","op":"in"}],"widgets":[{"kind":"card","cardId":"9201","x":0,"y":0,"w":8,"h":8},{"kind":"card","cardId":"9202","x":8,"y":0,"w":8,"h":8},{"kind":"card","cardId":"9206","x":16,"y":0,"w":8,"h":8},{"kind":"group","id":"g-sales","title":"销售结构","description":"本月渠道堆叠与区域构成","mode":"tile","x":0,"y":8,"w":24,"h":16,"pages":[{"id":"p-default","items":[{"cardId":"9217","x":0,"y":0,"w":16,"h":14},{"cardId":"9231","x":16,"y":0,"w":8,"h":14}]}]},{"kind":"card","cardId":"9224","x":0,"y":24,"w":24,"h":12}]}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9502, 'demo_结构分析', '表格 / 透视 / 组合 / Enjoy 柱；9101 过滤 / 9102 参数',
  '{"filters":[{"uid":"f-region","datasetId":"9101","field":"region","label":"区域","applyAs":"filter","formType":"multiSelect","op":"in"},{"uid":"f-region-p","datasetId":"9102","field":"region","label":"区域(参数)","applyAs":"param","formType":"multiSelect"}],"widgets":[{"kind":"card","cardId":"9208","x":0,"y":0,"w":16,"h":14},{"kind":"card","cardId":"9214","x":16,"y":0,"w":8,"h":14},{"kind":"card","cardId":"9229","x":0,"y":14,"w":12,"h":12},{"kind":"card","cardId":"9223","x":12,"y":14,"w":12,"h":12}]}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9503, 'demo_样式橱窗', 'Tab 分组：静态 / 构成 / 关系',
  '{"widgets":[{"kind":"group","id":"g-style","title":"样式橱窗","description":"静态 / 构成 / 关系","mode":"tabs","x":0,"y":0,"w":24,"h":22,"pages":[{"id":"p-static","items":[{"cardId":"9238","x":0,"y":0,"w":8,"h":16},{"cardId":"9260","x":8,"y":0,"w":8,"h":16},{"cardId":"9239","x":16,"y":0,"w":8,"h":16}],"title":"静态"},{"id":"p-compose","items":[{"cardId":"9249","x":0,"y":0,"w":8,"h":16},{"cardId":"9236","x":8,"y":0,"w":8,"h":16},{"cardId":"9235","x":16,"y":0,"w":8,"h":16}],"title":"构成"},{"id":"p-rel","items":[{"cardId":"9232","x":0,"y":0,"w":8,"h":16},{"cardId":"9233","x":8,"y":0,"w":8,"h":16},{"cardId":"9251","x":16,"y":0,"w":8,"h":16}],"title":"关系"}]}]}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9504, 'demo_筛选表单', 'input / multiSelect / number / date / dateExp 五种控件',
  '{"filters":[{"uid":"f-product","datasetId":"9101","field":"product","label":"商品","applyAs":"filter","formType":"input","op":"like"},{"uid":"f-region","datasetId":"9101","field":"region","label":"区域","applyAs":"filter","formType":"multiSelect","op":"in"},{"uid":"f-qty","datasetId":"9101","field":"qty","label":"件数≥","applyAs":"filter","formType":"number","op":"gte"},{"uid":"f-date","datasetId":"9101","field":"order_date","label":"下单日","applyAs":"filter","formType":"date","op":"eq"},{"uid":"f-dateexp","datasetId":"9101","field":"order_date","label":"下单日(快捷)","applyAs":"filter","formType":"dateExp"}],"widgets":[{"kind":"card","cardId":"9258","x":0,"y":0,"w":8,"h":8},{"kind":"card","cardId":"9241","x":8,"y":0,"w":8,"h":8},{"kind":"card","cardId":"9245","x":16,"y":0,"w":8,"h":8},{"kind":"card","cardId":"9257","x":0,"y":8,"w":24,"h":16},{"kind":"card","cardId":"9254","x":0,"y":24,"w":24,"h":12}]}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9505, 'demo_参数对照', '同字段：9101 当过滤、9102 当 Enjoy 参数；另有日期快捷参数',
  '{"filters":[{"uid":"f-region-f","datasetId":"9101","field":"region","label":"区域(过滤)","applyAs":"filter","formType":"multiSelect","op":"in"},{"uid":"f-region-p","datasetId":"9102","field":"region","label":"区域(参数)","applyAs":"param","formType":"multiSelect"},{"uid":"f-channel-p","datasetId":"9102","field":"channel","label":"渠道(参数)","applyAs":"param","formType":"multiSelect"},{"uid":"f-od-p","datasetId":"9102","field":"order_date","label":"日期(参数)","applyAs":"param","formType":"dateExp"}],"widgets":[{"kind":"card","cardId":"9218","x":0,"y":0,"w":12,"h":12},{"kind":"card","cardId":"9223","x":12,"y":0,"w":12,"h":12},{"kind":"card","cardId":"9208","x":0,"y":12,"w":14,"h":14},{"kind":"card","cardId":"9229","x":14,"y":12,"w":10,"h":14}]}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9506, 'demo_已禁用看板', 'status=DBL；含禁用卡片，列表应标禁用',
  '{"widgets":[{"kind":"card","cardId":"9240","x":0,"y":0,"w":8,"h":8},{"kind":"card","cardId":"9201","x":8,"y":0,"w":8,"h":8},{"kind":"card","cardId":"9238","x":16,"y":0,"w":8,"h":8}]}',
  'DBL', NULL, NULL, NULL, NULL
),
(
  9507, 'demo_查询橱窗', '日期快捷 / 同环比 / last_xy_days / 周年粒度 / 自动刷新',
  '{"filters":[{"uid":"f-region","datasetId":"9101","field":"region","label":"区域","applyAs":"filter","formType":"multiSelect","op":"in"}],"widgets":[{"kind":"card","cardId":"9204","x":0,"y":0,"w":6,"h":8},{"kind":"card","cardId":"9242","x":6,"y":0,"w":6,"h":8},{"kind":"card","cardId":"9243","x":12,"y":0,"w":6,"h":8},{"kind":"card","cardId":"9244","x":18,"y":0,"w":6,"h":8},{"kind":"card","cardId":"9220","x":0,"y":8,"w":8,"h":12},{"kind":"card","cardId":"9226","x":8,"y":8,"w":8,"h":12},{"kind":"card","cardId":"9227","x":16,"y":8,"w":8,"h":12},{"kind":"card","cardId":"9228","x":0,"y":20,"w":8,"h":12},{"kind":"card","cardId":"9255","x":8,"y":20,"w":8,"h":12},{"kind":"card","cardId":"9276","x":16,"y":20,"w":8,"h":12}]}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9508, 'demo_图表选项', '双轴 / 百分比 / 滚动十字 / 指定折线 / 关提示 / 标记线 / 网页',
  '{"widgets":[{"kind":"card","cardId":"9219","x":0,"y":0,"w":12,"h":12},{"kind":"card","cardId":"9221","x":12,"y":0,"w":12,"h":12},{"kind":"card","cardId":"9222","x":0,"y":12,"w":12,"h":12},{"kind":"card","cardId":"9225","x":12,"y":12,"w":12,"h":12},{"kind":"card","cardId":"9230","x":0,"y":24,"w":8,"h":12},{"kind":"card","cardId":"9248","x":8,"y":24,"w":8,"h":12},{"kind":"card","cardId":"9237","x":16,"y":24,"w":8,"h":12},{"kind":"card","cardId":"9234","x":0,"y":36,"w":8,"h":12},{"kind":"card","cardId":"9253","x":8,"y":36,"w":8,"h":12},{"kind":"card","cardId":"9239","x":16,"y":36,"w":8,"h":12},{"kind":"card","cardId":"9275","x":0,"y":48,"w":24,"h":12}]}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9509, 'demo_表格透视', '标注 / having / 合并 / 树形 / 月列维',
  '{"filters":[{"uid":"f-region","datasetId":"9101","field":"region","label":"区域","applyAs":"filter","formType":"multiSelect","op":"in"},{"uid":"f-dateexp","datasetId":"9101","field":"order_date","label":"下单日","applyAs":"filter","formType":"dateExp"}],"widgets":[{"kind":"card","cardId":"9209","x":0,"y":0,"w":12,"h":14},{"kind":"card","cardId":"9210","x":12,"y":0,"w":12,"h":14},{"kind":"card","cardId":"9212","x":0,"y":14,"w":12,"h":12},{"kind":"card","cardId":"9213","x":12,"y":14,"w":12,"h":12},{"kind":"card","cardId":"9215","x":0,"y":26,"w":12,"h":14},{"kind":"card","cardId":"9216","x":12,"y":26,"w":12,"h":14}]}',
  'EBL', NULL, NULL, NULL, NULL
),
(
  9510, 'demo_新图橱窗', '趋势/排行 + Tab（瀑布/对比条/热力树图）+ 标记线/自动刷新',
  '{"filters":[{"uid":"f-region","datasetId":"9101","field":"region","label":"区域","applyAs":"filter","formType":"multiSelect","op":"in"}],"widgets":[{"kind":"card","cardId":"9265","x":0,"y":0,"w":8,"h":8},{"kind":"card","cardId":"9266","x":8,"y":0,"w":8,"h":8},{"kind":"card","cardId":"9269","x":16,"y":0,"w":8,"h":14},{"kind":"card","cardId":"9270","x":16,"y":14,"w":8,"h":14},{"kind":"group","id":"g-new","title":"构成与对比","description":"瀑布 / 对比条 / 热力 / 矩形树","mode":"tabs","x":0,"y":8,"w":16,"h":20,"pages":[{"id":"p-wf","items":[{"cardId":"9263","x":0,"y":0,"w":12,"h":16},{"cardId":"9264","x":12,"y":0,"w":12,"h":16}],"title":"瀑布"},{"id":"p-tornado","items":[{"cardId":"9267","x":0,"y":0,"w":12,"h":16},{"cardId":"9268","x":12,"y":0,"w":12,"h":16}],"title":"对比条"},{"id":"p-heat","items":[{"cardId":"9271","x":0,"y":0,"w":12,"h":16},{"cardId":"9273","x":12,"y":0,"w":12,"h":16}],"title":"热力树图"}]},{"kind":"card","cardId":"9272","x":0,"y":28,"w":12,"h":14},{"kind":"card","cardId":"9274","x":12,"y":28,"w":12,"h":14},{"kind":"card","cardId":"9275","x":0,"y":42,"w":16,"h":12},{"kind":"card","cardId":"9276","x":16,"y":42,"w":8,"h":12}]}',
  'EBL', NULL, NULL, NULL, NULL
);

UPDATE `vis_dashboard` SET `group_id` = 9601 WHERE `id` IN (9501, 9502);
UPDATE `vis_dashboard` SET `group_id` = 9602 WHERE `id` IN (9504, 9505, 9507);
UPDATE `vis_dashboard` SET `group_id` = 9603 WHERE `id` IN (9503, 9508, 9509, 9510);

INSERT INTO `vis_dashboard_card` (
  `id`, `dashboard_id`, `card_id`,
  `create_at`, `create_by`, `modify_at`, `modify_by`
) VALUES
-- 9501 经营总览
(950101, 9501, 9201, NULL, NULL, NULL, NULL),
(950102, 9501, 9202, NULL, NULL, NULL, NULL),
(950103, 9501, 9206, NULL, NULL, NULL, NULL),
(950104, 9501, 9217, NULL, NULL, NULL, NULL),
(950105, 9501, 9231, NULL, NULL, NULL, NULL),
(950106, 9501, 9224, NULL, NULL, NULL, NULL),
-- 9502 结构分析
(950201, 9502, 9208, NULL, NULL, NULL, NULL),
(950202, 9502, 9214, NULL, NULL, NULL, NULL),
(950203, 9502, 9229, NULL, NULL, NULL, NULL),
(950204, 9502, 9223, NULL, NULL, NULL, NULL),
-- 9503 样式橱窗
(950301, 9503, 9238, NULL, NULL, NULL, NULL),
(950302, 9503, 9260, NULL, NULL, NULL, NULL),
(950303, 9503, 9239, NULL, NULL, NULL, NULL),
(950304, 9503, 9249, NULL, NULL, NULL, NULL),
(950305, 9503, 9236, NULL, NULL, NULL, NULL),
(950306, 9503, 9235, NULL, NULL, NULL, NULL),
(950307, 9503, 9232, NULL, NULL, NULL, NULL),
(950308, 9503, 9233, NULL, NULL, NULL, NULL),
(950309, 9503, 9251, NULL, NULL, NULL, NULL),
-- 9504 筛选表单
(950401, 9504, 9258, NULL, NULL, NULL, NULL),
(950402, 9504, 9241, NULL, NULL, NULL, NULL),
(950403, 9504, 9245, NULL, NULL, NULL, NULL),
(950404, 9504, 9257, NULL, NULL, NULL, NULL),
(950405, 9504, 9254, NULL, NULL, NULL, NULL),
-- 9505 参数对照
(950501, 9505, 9218, NULL, NULL, NULL, NULL),
(950502, 9505, 9223, NULL, NULL, NULL, NULL),
(950503, 9505, 9208, NULL, NULL, NULL, NULL),
(950504, 9505, 9229, NULL, NULL, NULL, NULL),
-- 9506 已禁用看板
(950601, 9506, 9240, NULL, NULL, NULL, NULL),
(950602, 9506, 9201, NULL, NULL, NULL, NULL),
(950603, 9506, 9238, NULL, NULL, NULL, NULL),
-- 9507 查询橱窗
(950701, 9507, 9204, NULL, NULL, NULL, NULL),
(950702, 9507, 9242, NULL, NULL, NULL, NULL),
(950703, 9507, 9243, NULL, NULL, NULL, NULL),
(950704, 9507, 9244, NULL, NULL, NULL, NULL),
(950705, 9507, 9220, NULL, NULL, NULL, NULL),
(950706, 9507, 9226, NULL, NULL, NULL, NULL),
(950707, 9507, 9227, NULL, NULL, NULL, NULL),
(950708, 9507, 9228, NULL, NULL, NULL, NULL),
(950709, 9507, 9255, NULL, NULL, NULL, NULL),
(950710, 9507, 9276, NULL, NULL, NULL, NULL),
-- 9508 图表选项
(950801, 9508, 9219, NULL, NULL, NULL, NULL),
(950802, 9508, 9221, NULL, NULL, NULL, NULL),
(950803, 9508, 9222, NULL, NULL, NULL, NULL),
(950804, 9508, 9225, NULL, NULL, NULL, NULL),
(950805, 9508, 9230, NULL, NULL, NULL, NULL),
(950806, 9508, 9248, NULL, NULL, NULL, NULL),
(950807, 9508, 9237, NULL, NULL, NULL, NULL),
(950808, 9508, 9234, NULL, NULL, NULL, NULL),
(950809, 9508, 9253, NULL, NULL, NULL, NULL),
(950810, 9508, 9239, NULL, NULL, NULL, NULL),
(950811, 9508, 9275, NULL, NULL, NULL, NULL),
-- 9509 表格透视
(950901, 9509, 9209, NULL, NULL, NULL, NULL),
(950902, 9509, 9210, NULL, NULL, NULL, NULL),
(950903, 9509, 9212, NULL, NULL, NULL, NULL),
(950904, 9509, 9213, NULL, NULL, NULL, NULL),
(950905, 9509, 9215, NULL, NULL, NULL, NULL),
(950906, 9509, 9216, NULL, NULL, NULL, NULL),
-- 9510 新图橱窗
(951001, 9510, 9265, NULL, NULL, NULL, NULL),
(951002, 9510, 9266, NULL, NULL, NULL, NULL),
(951003, 9510, 9269, NULL, NULL, NULL, NULL),
(951004, 9510, 9270, NULL, NULL, NULL, NULL),
(951005, 9510, 9263, NULL, NULL, NULL, NULL),
(951006, 9510, 9264, NULL, NULL, NULL, NULL),
(951007, 9510, 9267, NULL, NULL, NULL, NULL),
(951008, 9510, 9268, NULL, NULL, NULL, NULL),
(951009, 9510, 9271, NULL, NULL, NULL, NULL),
(951010, 9510, 9273, NULL, NULL, NULL, NULL),
(951011, 9510, 9272, NULL, NULL, NULL, NULL),
(951012, 9510, 9274, NULL, NULL, NULL, NULL),
(951013, 9510, 9275, NULL, NULL, NULL, NULL),
(951014, 9510, 9276, NULL, NULL, NULL, NULL);

SET FOREIGN_KEY_CHECKS = 1;

# StarRocks 数据源接入

日期：2026-09-17；状态：已实现并完成提供环境的只读联调。

## 目标

在现有数据源管理中增加 StarRocks，复用数据集、卡片和看板。支持连接测试、表字段浏览、SQL 预览、筛选、聚合、时间分组、同比环比、分页及数据更新时间查询。

本次测试连接使用外部 catalog 下的 `hive.default`，因此首期支持固定到一个 `catalog.database` 的连接；内部库使用 `default_catalog.database`。测试地址和凭据只保存在本地配置，不进入代码、DDL 或文档。

## 实现方案

### 数据源类型与连接

- 增加 `STARROCKS` 类型；沿用 `vis_datasource`，无需新增表。
- 用 `DatasourceType` 集中定义驱动、URL、允许参数和超时，连接配置不再依赖 SQL 方言判断。
- 采用官方 `com.starrocks:starrocks-connector-j:1.1.1`，驱动类 `com.starrocks.cj.jdbc.Driver`，地址使用 `jdbc:starrocks://host:9030/[catalog.]database`。
- 前端只新增数据库类型与地址示例，继续使用现有增改、测试、启停和引用保护。

### SQL 方言

- `SqlDialect` 增加 StarRocks；复用标准 SQL，单独实现必要的日期、类型转换差异。
- 数据集 SQL 及自定义公式保持原生语法。
- 验证标识符转义、空值、字符串筛选、日/周/月/年、聚合、同比环比、分页和参数绑定。
- 当前用户参数 `USER_ID` 沿用现有注入方式。

### 元数据

- 固定当前 catalog 和 database，正确保留三段式表名。
- 使用原生驱动标准元数据 API；该驱动内部通过 `SHOW` 读取表字段。
- StarRocks 暂不展示主键、索引信息：实测驱动 1.1.1 在外部 catalog 调用这两个接口会返回数据库不存在。MySQL/PostgreSQL 保留原有行为。
- 仅在用户请求字段时读取对应表，避免默认扫描外部 catalog 的全部字段。

### 查询执行

- 普通查询明确设置执行超时，保留结果行数上限。
- 连接与语句资源用 try-with-resources 释放；验证异常和超时后的连接可复用性。
- StarRocks 会话固定查询超时，避免仅网络读取超时而数据库仍长时间执行。
- 常用标量字段直接使用；复杂字段由数据集 SQL 转换或聚合。大整数和小数验证实际返回类型和序列化行为。

## 验证与交付

1. 单元测试：连接配置/URL、SQL 方言、元数据作用域和不支持的接口。
2. 回归：后端 `mvn test`，前端测试、lint、type-check、build；重新生成 API。
3. 真实 StarRocks：连接和版本、当前 catalog/database、表字段、参数查询、生成 SQL、执行超时。优先使用常量构造的小数据集验证语义，业务表只做必要且有限的读取，不修改远端数据。
4. API/UI：新增数据源、测试连接、类型筛选、数据集配置与预览、卡片查询。
5. 在本文记录最终驱动方案、验证结果和剩余限制。

## 实施与验证记录

- `DatasourceType` 集中连接驱动、地址参数及元数据能力；SQL 方言独立，新增 StarRocks 的周起始日与字符串转换实现。
- 原生驱动 1.1.1 直接读取 URL 后，`getCatalog()` 为 `default_catalog`，`getSchema()` 为完整 `hive.default`。连接池显式设置 catalog/schema 后，两者正确变为 `hive` / `default`；每个新连接都执行相同初始化。
- 元数据树使用 `catalog.database` 作用域，表选项保留三段式名称；编辑器支持三段式表名与别名解析。
- 普通 JDBC 查询执行上限 30 秒，网络读取上限 60 秒；StarRocks 会话同步设置 `query_timeout=30`。测试发现仅设 JDBC 超时时，常量 `SLEEP` 可能延迟返回；同步设置服务端超时后，一秒测试超时按预期生效，随后连接仍可查询。
- 用户提供环境返回的版本为 `UNKNOWN d8d190e`。本次验证结论针对该环境，尚未形成多个标准发行版本的兼容矩阵。
- 真实读取 `hive.default` 的 64 张表清单、选定表字段；真实表执行 `SELECT 1 ... LIMIT 1` 成功。其余语义验证用常量数据集，未修改远端表或数据。
- 六项真实集成测试通过：元数据及真实表限量查询、日/周/月/年边界、聚合及空维度同比环比、字符串筛选/分页/小数、查询超时及连接复用、应用数据更新时间服务。
- API 验证新增与测试、密码保留、类型筛选、数据集预览、卡片聚合/时间分组、候选值搜索、时间元数据和 Excel 导出；浏览器验证列表显示、测试连接和数据集运行出数。原有 MySQL 连接测试通过。
- 完整后端回归 289 项：284 通过、5 项已有订阅截图环境测试跳过；最后补充真实表读取后再次执行六项 StarRocks 集成测试通过。
- 前端 28 个文件、210 项测试通过；`pnpm lint`、`pnpm type-check`、`pnpm build` 通过，API 已重新生成。
- 本地保留“StarRocks 测试库”供后续使用，临时验证数据集已删除；连接地址与凭据不写入版本库。

## 当前边界

- 一个连接固定到一个 catalog/database。浏览其他库时新增相应连接；跨 catalog 目录导航留待实际需求。
- 复杂类型由 SQL 提取或转换。JDBC 的高精度 Decimal 已验证；图表中的数值计算仍受 JavaScript 精度约束，精确展示超大标识符或小数时应在 SQL 中转为字符串。
- 只读连接标记沿用现有行为，数据库账号自身的权限决定实际可访问范围。

## 维护入口

- `DatasourceType`：数据库产品与 SQL 方言的显式映射、驱动及允许的连接参数。
- `DatasourceConnectionFactory`：地址校验、连接池初始化及连接测试；`StarRocksScope` 明确区分 catalog 和 database。
- `SqlDialect`：Lens 自动生成 SQL 的数据库差异。
- `DatasourceMetaService`：元数据作用域与表字段读取。
- `DatasourceAdminService`：引用统计、配置修改、事务锁及提交后的连接池淘汰。
- 前端 `datasources/datasourceModel.ts`：类型名称、地址示例与提交规则；列表用单一操作状态管理测试、启停和删除。

新增类型时同步检查连接／列表请求 DTO 的类型校验，以及编辑器关键字映射；接口变更后重新生成 API。连接池失效和引用锁保留现有事务边界，维护时应运行事务、并发和真实连接测试。

### 重跑集成测试

在 `backend/` 中，通过环境变量提供连接配置，再运行：

```shell
# LENS_STARROCKS_URL / LENS_STARROCKS_USER / LENS_STARROCKS_PASSWORD
mvn -Dtest=StarRocksDatasourceTest test
```

未设置 `LENS_STARROCKS_URL` 时自动跳过远端集成测试；其余连接配置与 SQL 方言单元测试正常执行。

## 参考

- [StarRocks JDBC 驱动](https://docs.starrocks.io/docs/integrations/JDBC_driver/)
- [原生与 MySQL 驱动连接](https://docs.starrocks.io/docs/integrations/IDE_integrations/DataGrip/)
- [会话变量与查询超时](https://docs.starrocks.io/docs/sql-reference/System_variable/)

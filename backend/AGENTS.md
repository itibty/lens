# Lens 后端 — Agent 约定

先读本文件和现有实现，再改代码。

## 项目

- JDK 21 + Spring Boot 4.1.1 + MyBatis-Plus + MySQL
- 包名 `com.codet.lens`，启动类 `LensApplication`
- 浏览器 JWT（12h）。登录签发、拦截器校验、`@Permission` 对功能码
- 表前缀：`sys_*`（账号 / 角色 / 菜单 / 角色看板）、`vis_*`（可视化元数据）
- 数据集是图表用的 SELECT 定义（Enjoy 模板），连接只用于查询

范围就是上面这些。不要加组织、调度、推送、验证码改密、数据集写入接口、按行授权。

权限码按现有字面量使用（如 `ds:dashboard:write`），不要重命名。

## 鉴权（三套）

1. **系统菜单 + 功能点**：一棵 `sys_menu`。`menu_type` 为 `MENU`（页面/目录）和 `FUNC`（功能点）。角色只绑 FUNC；有任意已授权功能点才露出该菜单并补上级。`MENU` 不写 `perm_code`。
2. **报表中心**：虚拟根 `id=90`（`FieldConst.REPORT_ROOT_ID`），不入库。每个登录用户都有。和 `sys_menu`、角色功能点无关。
3. **看板分组 + 角色绑看板**：`vis_dash_group` 树；看板挂 `group_id`；`sys_role_dashboard` 记录角色可看哪些看板。`role_code=admin` 看全部启用看板；普通角色只看已分配的。空分组不进报表中心。

超级管理员保存「配置功能 / 配置看板」会被接口拒绝，这是预期。

看看板：`/vis/report/:id` 只认 admin、看板设计权限、或角色已分配。进可视化里的看板管理需要看板查看/编辑权限。

## 表

`sys_user` `sys_role` `sys_user_role` `sys_menu` `sys_role_menu` `sys_role_dashboard`

`vis_datasource` `vis_dataset` `vis_dataset_field` `vis_card` `vis_dash_group` `vis_dashboard` `vis_dashboard_card`

小写蛇形；主键 `id` bigint 雪花；状态 `EBL` / `DBL` / `DEL`；审计 `create_at` / `create_by` / `modify_at` / `modify_by` 毫秒时间戳。软删走 `DEL`。

Schema：`db/schema.sql`。导到 Docker MySQL 用 `--default-character-set=utf8mb4`。

## API

- 进程内路径没有 `/api`：`POST /auth/login`、`GET /dash-groups/tree`。前端代理才带 `/api`。
- 响应 `{ code, msg, data }`。
- `Long` / `long` / `BigInteger` 序列化成字符串。分页 `PageResponse` 的 `pageNumber` / `pageSize` / `total` / `pages` 用 `Long2Integer` 保持数字。
- 角色 / 看板 / 分组 id 当字符串处理。

| 前缀 | 职责 |
|------|------|
| `/auth/*` | 登录、当前用户、当前菜单 |
| `/sys/users` `/sys/roles` `/sys/menus` | 账号、角色、菜单 |
| `/datasources` `/datasets` | 数据源、数据集、SELECT 调试 |
| `/cards` `/dashboards` `/dash-groups` `/vis` | 卡片、看板、分组、查数 |

看板分组：

- `GET /dash-groups/tree`：`dashCount` 为本节点看板数，`descDashCount` 为子孙合计
- `POST /dashboards/query`：`groupId=0` 查未分组；`groupId!=0` 默认含子孙（`includeDescendants=false` 则精确匹配）
- `POST /dashboards/move-group`：`dashboardIds` + `groupId`（0=未分组）
- 改分组 `pid` 禁止挂到自己或自己的子孙
- 有子分组或看板不能删分组

## 两套分组

- **报表分组** `vis_dash_group`：组织看板目录。
- **画布卡片分组**：活在看板 `config_json.widgets`（`kind=group`），和 `vis_dash_group` 无关。

## 启动

```bash
export JAVA_HOME=$HOME/tools/java/openjdk21.50.19/Home
mvn -DskipTests spring-boot:run
```

库配置见 `application.yml`。种子用户 `admin` / `Aa123456`。

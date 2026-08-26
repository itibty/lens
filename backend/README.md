# Lens 后端

包名 `com.codet.lens`。一个 Maven 模块、一个 Spring Boot 进程。

约定见 [AGENTS.md](./AGENTS.md)。

## 运行

```bash
# 建库 lens 后手工执行 db/schema.sql
# 可选：db/demo.sql 写入订单明细、数据集、卡片、看板演示数据
export JAVA_HOME=$HOME/tools/java/openjdk21.50.19/Home
mvn -DskipTests spring-boot:run
```

- 地址：`http://127.0.0.1:8080`（路径没有 `/api` 前缀）
- 账号：`admin` / `Aa123456`
- Swagger：`http://127.0.0.1:8080/swagger-ui/index.html`
- 库：本机 MySQL `lens`，默认 `root` / `Aa123456`

前端 Vite 会把浏览器的 `/api/**` 剥掉 `/api` 再转到这里。

## 目录

```
src/main/java/com/codet/lens/
  LensApplication.java
  auth/          JWT 登录拦截、@Permission
  common/        统一响应、雪花 Long 序列化、权限码
  sys/           用户 / 角色 / 菜单 / 角色绑看板
  vis/           数据源、数据集、卡片、看板、查数
db/schema.sql    表结构 + 菜单种子
db/demo.sql      演示数据（可选）
```

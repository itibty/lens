# Lens 后端

JDK 21 + Spring Boot 4.1 BI 服务

. Spring Boot 4.1 / MyBatis-Plus / MySQL  
. JWT 登录、角色菜单权限；Redis 做登录态失效  
. 数据源 / 数据集 / 卡片 / 看板 / 查数  
. SpringDoc OpenAPI  

## 命令

```shell
# 建库 lens 后执行 db/schema.sql；可选 db/demo.sql

# 启动  http://127.0.0.1:8080
mvn -DskipTests spring-boot:run

# 打包
mvn -DskipTests package
```

- 账号：`admin` / `Aa123456`
- Swagger：`http://127.0.0.1:8080/swagger-ui.html`
- 库：本机 MySQL `lens`，默认 `root` / `Aa123456`
- Redis：`127.0.0.1:6379`，密码 `Aa123456`（禁用/改密/改角色后旧 token 立刻失效）

## 参考

[Spring Boot](https://docs.spring.io/spring-boot/documentation.html)  
[MyBatis-Plus](https://baomidou.com/)  
[SpringDoc](https://springdoc.org/)  

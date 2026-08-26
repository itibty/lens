package com.codet.lens.common;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.servers.Server;
import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI lensOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Lens API")
                        .description("账号权限 + 数据集 / 卡片 / 看板")
                        .version("0.0.1"))
                .servers(List.of(new Server().url("/")));
    }

    @Bean
    public GroupedOpenApi adminApi() {
        return GroupedOpenApi.builder()
                .group("admin")
                .pathsToMatch("/auth/**", "/sys/**")
                .build();
    }

    @Bean
    public GroupedOpenApi visApi() {
        return GroupedOpenApi.builder()
                .group("vis")
                .pathsToMatch("/datasources/**", "/datasets/**", "/cards/**", "/dashboards/**", "/dash-groups/**", "/vis/**")
                .build();
    }
}

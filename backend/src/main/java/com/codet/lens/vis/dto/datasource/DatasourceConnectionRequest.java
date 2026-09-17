package com.codet.lens.vis.dto.datasource;

import com.codet.lens.common.base.EnumValue;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DatasourceConnectionRequest {
    private Long id;
    @NotBlank @EnumValue(strValues = {"MYSQL", "POSTGRES", "STARROCKS"})
    private String dbType;
    @NotBlank @Size(max = 500)
    private String jdbcUrl;
    @NotBlank @Size(max = 100)
    private String username;
    @Size(max = 200)
    @Schema(description = "未传表示保留原密码，空字符串表示使用空密码")
    private String password;
}

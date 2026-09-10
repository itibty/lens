package com.codet.lens.sys.dto.user;

import com.codet.lens.common.base.EnumValue;
import com.codet.lens.common.base.Status;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "新建|编辑用户")
@Getter
@Setter
public class SaveUserRequest {

    @Schema(description = "用户 id。新增不传")
    private Long id;

    @Schema(description = "用户名", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank
    private String username;

    @Schema(description = "姓名", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank
    private String realName;

    @Schema(description = "邮箱。看板邮件订阅使用")
    @Email(message = "邮箱格式不正确")
    @Size(max = 200, message = "邮箱不能超过200个字符")
    private String email;

    @Schema(description = "状态", allowableValues = {Status.EBL, Status.DBL})
    @EnumValue(strValues = {Status.EBL, Status.DBL})
    private String status;

    @Schema(description = "密码。编辑时可空")
    @Pattern(regexp = "^\\w{8,20}$", message = "必须是8-20位数字、字母或下划线")
    private String password;

    @Schema(description = "角色 id")
    private List<Long> roleIds;
}

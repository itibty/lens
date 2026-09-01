package com.codet.lens.sys.dto.user;

import com.codet.lens.common.base.EnumValue;
import com.codet.lens.common.base.Status;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
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

    @Schema(description = "状态", allowableValues = {Status.EBL, Status.DBL})
    @EnumValue(strValues = {Status.EBL, Status.DBL})
    private String status;

    @Schema(description = "密码。编辑时可空")
    private String password;

    @Schema(description = "角色 id")
    private List<Long> roleIds;
}

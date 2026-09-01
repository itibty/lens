package com.codet.lens.sys.dto.user;

import com.codet.lens.common.base.Long2DatetimeStr;
import com.codet.lens.common.base.Status;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Getter;
import lombok.Setter;
import tools.jackson.databind.annotation.JsonSerialize;

@Schema(description = "用户")
@Getter
@Setter
public class UserInfo {

    @Schema(description = "用户 id", requiredMode = Schema.RequiredMode.REQUIRED)
    private Long id;

    @Schema(description = "用户名", requiredMode = Schema.RequiredMode.REQUIRED)
    private String username;

    @Schema(description = "姓名", requiredMode = Schema.RequiredMode.REQUIRED)
    private String realName;

    @Schema(description = "状态", allowableValues = {Status.EBL, Status.DBL},
            requiredMode = Schema.RequiredMode.REQUIRED)
    private String status;

    @JsonSerialize(using = Long2DatetimeStr.class)
    @Schema(description = "最近登录时间")
    private Long lastLoginAt;

    @Schema(description = "角色名，逗号拼接", requiredMode = Schema.RequiredMode.REQUIRED)
    private String roleNames;

    @Schema(description = "角色 id", requiredMode = Schema.RequiredMode.REQUIRED)
    private List<Long> roleIds;

    @Schema(description = "角色及生效区间", requiredMode = Schema.RequiredMode.REQUIRED)
    private List<UserRoleInfo> roleInfos;
}

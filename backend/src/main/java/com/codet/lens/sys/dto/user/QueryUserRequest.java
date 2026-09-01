package com.codet.lens.sys.dto.user;

import com.codet.lens.common.base.EnumValue;
import com.codet.lens.common.base.PageRequest;
import com.codet.lens.common.base.Status;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "分页查询用户")
@Getter
@Setter
public class QueryUserRequest extends PageRequest {

    @Schema(description = "用户名")
    private String username;

    @Schema(description = "姓名")
    private String realName;

    @Schema(description = "状态", allowableValues = {Status.EBL, Status.DBL})
    @EnumValue(strValues = {Status.EBL, Status.DBL})
    private String status;
}

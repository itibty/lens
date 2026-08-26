package com.codet.lens.vis.dto.dash;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Schema(description = "看板移入分组")
@Getter
@Setter
public class MoveDashboardsGroupRequest {

    @Schema(description = "看板 id 集合")
    @NotEmpty(message = "看板不能为空")
    private List<Long> dashboardIds;

    @Schema(description = "目标分组 id。0 为未分组")
    @NotNull(message = "分组不能为空")
    private Long groupId;
}

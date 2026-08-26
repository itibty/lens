package com.codet.lens.vis.dto.dash;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "更新看板元数据")
@Getter
@Setter
public class VisDashboardMetadataUpdateRequest {

    @Schema(description = "看板 id", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull(message = "看板id不能为空")
    private Long id;

    @Schema(description = "看板名", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "看板名不能为空")
    @Size(max = 50)
    private String dashName;

    @Schema(description = "描述")
    @Size(max = 200)
    private String dashDesc;

    @Schema(description = "分组 id。0 或不传为未分组")
    private Long groupId;
}

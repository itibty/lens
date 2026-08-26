package com.codet.lens.vis.dto.pivot;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Schema(description = "透视表列头")
@Getter
@Setter
public class PivotColumn {

    @Schema(description = "列 id", requiredMode = Schema.RequiredMode.REQUIRED)
    private String id;

    @Schema(description = "列维取值", requiredMode = Schema.RequiredMode.REQUIRED)
    private List<Object> path;

    @Schema(description = "列角色", allowableValues = {"detail", "subtotal", "total"},
            requiredMode = Schema.RequiredMode.REQUIRED)
    private String role;
}

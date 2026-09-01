package com.codet.lens.vis.dto.pivot;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import java.util.Map;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "透视表数据行")
@Getter
@Setter
public class PivotRow {

    @Schema(description = "行维取值", requiredMode = Schema.RequiredMode.REQUIRED)
    private List<Object> path;

    @Schema(description = "行角色", allowableValues = {"detail", "subtotal", "total"},
            requiredMode = Schema.RequiredMode.REQUIRED)
    private String role;

    @Schema(description = "行维层数", requiredMode = Schema.RequiredMode.REQUIRED)
    private Integer level;

    @Schema(description = "单元格", requiredMode = Schema.RequiredMode.REQUIRED)
    private Map<String, Map<String, Object>> values;
}

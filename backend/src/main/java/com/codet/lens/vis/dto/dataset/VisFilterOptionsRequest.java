package com.codet.lens.vis.dto.dataset;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import jakarta.validation.constraints.NotNull;
import java.util.List;

@Schema(description = "筛选枚举查询")
@Getter
@Setter
public class VisFilterOptionsRequest {

    @Schema(description = "数据集 id", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull(message = "datasetId不能为空")
    private Long datasetId;

    @Schema(description = "取值字段。不传则按 label/value 等列名约定猜测")
    private String field;

    @Schema(description = "展示字段。不传则与取值字段相同")
    private String labelField;

    @Schema(description = "关键字，按 label / value 过滤")
    private String keyword;

    @Schema(description = "按取值精确反查名称，不受预览条数限制。传入时必须同时指定 field")
    private List<String> values;

    @Schema(description = "返回条数，默认 50，最大 200。按值反查时忽略")
    private Integer limit;
}

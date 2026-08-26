package com.codet.lens.vis.dto.pivot;

import com.codet.lens.vis.dto.item.FilterItem;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.Map;

@Schema(description = "透视表查询请求")
@Getter
@Setter
public class PivotQueryRequest {

    @Schema(description = "查询配置", requiredMode = Schema.RequiredMode.REQUIRED)
    private PivotQueryConfig query;

    @Schema(description = "可视化配置", requiredMode = Schema.RequiredMode.REQUIRED)
    private Map<String, Object> visual;

    @Schema(description = "看板全局行级过滤")
    private List<FilterItem> globalFilters;

    @Schema(description = "看板全局数据集条件")
    private List<FilterItem> globalParams;
}

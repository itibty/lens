package com.codet.lens.vis.dto.query;

import com.codet.lens.vis.dto.item.FilterItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import java.util.Map;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "卡片数据查询请求")
@Getter
@Setter
public class QueryRequest {

    @Schema(description = "查询配置", requiredMode = Schema.RequiredMode.REQUIRED)
    private QueryConfig query;

    @Schema(description = "可视化配置", requiredMode = Schema.RequiredMode.REQUIRED)
    private Map<String, Object> visual;

    @Schema(description = "看板全局行级过滤")
    private List<FilterItem> globalFilters;

    @Schema(description = "看板全局数据集条件")
    private List<FilterItem> globalParams;
}

package com.codet.lens.vis.dto.pivot;

import com.codet.lens.vis.dto.item.*;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "透视查询配置")
@Getter
@Setter
public class PivotQueryConfig {

    @Schema(description = "数据集 id", requiredMode = Schema.RequiredMode.REQUIRED)
    private Long datasetId;

    @Schema(description = "日期快捷基准日")
    private String asOfDate;

    @Schema(description = "行维")
    private List<DimensionItem> rowDimensions;

    @Schema(description = "列维")
    private List<DimensionItem> colDimensions;

    @Schema(description = "指标", requiredMode = Schema.RequiredMode.REQUIRED)
    private List<MetricItem> metrics;

    @Schema(description = "行级过滤")
    private List<FilterGroup> filters;

    @Schema(description = "数据集条件")
    private List<FilterItem> params;

    @Schema(description = "聚合后过滤")
    private List<HavingFilterItem> havingFilters;

    @Schema(description = "排序")
    private List<OrderItem> orderList;

    @Schema(description = "最大行数")
    private Integer limit;
}

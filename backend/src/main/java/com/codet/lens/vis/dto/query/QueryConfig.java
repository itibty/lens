package com.codet.lens.vis.dto.query;

import com.codet.lens.vis.dto.item.DimensionItem;
import com.codet.lens.vis.dto.item.FilterGroup;
import com.codet.lens.vis.dto.item.FilterItem;
import com.codet.lens.vis.dto.item.HavingFilterItem;
import com.codet.lens.vis.dto.item.MetricItem;
import com.codet.lens.vis.dto.item.OrderItem;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Schema(description = "查询配置")
@Getter
@Setter
public class QueryConfig {

    @Schema(description = "数据集 id", requiredMode = Schema.RequiredMode.REQUIRED)
    private Long datasetId;

    @Schema(description = "日期快捷基准日")
    private String asOfDate;

    @Schema(description = "维度")
    private List<DimensionItem> dimensions;

    @Schema(description = "指标")
    private List<MetricItem> metrics;

    @Schema(description = "行级过滤")
    private List<FilterGroup> filters;

    @Schema(description = "数据集条件")
    private List<FilterItem> params;

    @Schema(description = "聚合后过滤")
    private List<HavingFilterItem> havingFilters;

    @Schema(description = "结果列过滤")
    private List<FilterItem> resultFilters;

    @Schema(description = "排序")
    private List<OrderItem> orderList;

    @Schema(description = "最大行数")
    private Integer limit;
}

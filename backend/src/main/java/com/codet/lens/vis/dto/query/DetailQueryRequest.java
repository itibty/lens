package com.codet.lens.vis.dto.query;

import com.codet.lens.vis.dto.item.FilterItem;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Schema(description = "卡片明细查询请求（构成行，不聚合）")
@Getter
@Setter
public class DetailQueryRequest {

    @Schema(description = "查询配置。只用数据集、过滤、参数、日期；维度仅用于补全点击维粒度",
            requiredMode = Schema.RequiredMode.REQUIRED)
    private QueryConfig query;

    @Schema(description = "点击维值，叠到行级过滤。不传则查当前卡片范围内的全部明细")
    private List<FilterItem> contextFilters;

    @Schema(description = "看板全局行级过滤")
    private List<FilterItem> globalFilters;

    @Schema(description = "看板全局数据集条件")
    private List<FilterItem> globalParams;
}

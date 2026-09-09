package com.codet.lens.vis.dto.query;

import com.codet.lens.vis.dto.item.FilterItem;
import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "卡片明细查询请求（构成行，不聚合）")
@Getter
@Setter
public class DetailQueryRequest {

    @Schema(description = "查询配置。只用数据集、过滤、参数、日期；维度仅用于补全点击维粒度",
            requiredMode = Schema.RequiredMode.REQUIRED)
    private QueryConfig query;

    @Schema(description = "选中指标的别名")
    private String metric;

    @Schema(description = "设计器预览明细规则；查看态使用已保存规则")
    private DetailConfig detail;

    /** 由服务端校验明细配置后生成，不接受客户端直接指定查询列。 */
    @JsonIgnore
    private List<String> selectFields;

    @Schema(description = "点击维值，叠到行级过滤。不传则查当前卡片范围内的全部明细")
    private List<FilterItem> contextFilters;

    @Schema(description = "看板全局行级过滤")
    private List<FilterItem> globalFilters;

    @Schema(description = "看板全局数据集条件")
    private List<FilterItem> globalParams;
}

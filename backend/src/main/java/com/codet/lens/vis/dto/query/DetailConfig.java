package com.codet.lens.vis.dto.query;

import com.codet.lens.vis.dto.item.OrderItem;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(description = "当前数据集的明细配置")
public class DetailConfig {
    @Schema(description = "明细字段及顺序，须至少配置一个有效字段")
    private List<String> fields;
    @Schema(description = "明细独立排序，使用原始字段名")
    private List<OrderItem> orderList;
    @Schema(description = "明细最大行数，默认 1000，最大 5000")
    private Integer limit;
}

package com.codet.lens.vis.dto.dataset;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "看板筛选枚举查询")
@Getter
@Setter
public class VisBoundFilterOptionsRequest {

    @Schema(description = "关键字，按 label / value 过滤")
    private String keyword;

    @Schema(description = "按取值精确反查名称")
    private List<String> values;

    @Schema(description = "返回条数，默认 50，最大 200。按值反查时忽略")
    private Integer limit;
}

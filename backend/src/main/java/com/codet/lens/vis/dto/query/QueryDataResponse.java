package com.codet.lens.vis.dto.query;

import com.codet.lens.vis.rds.bo.ExecSqlInfo;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.Map;

@Schema(description = "普通查询结果")
@Getter
@Setter
public class QueryDataResponse {

    @Schema(description = "列名列表", requiredMode = Schema.RequiredMode.REQUIRED)
    private List<String> columns;

    @Schema(description = "数据行", requiredMode = Schema.RequiredMode.REQUIRED)
    private List<Map<String, Object>> rows;

    @Schema(description = "行数", requiredMode = Schema.RequiredMode.REQUIRED)
    private Integer total;

    @Schema(description = "是否截断", requiredMode = Schema.RequiredMode.REQUIRED)
    private Boolean truncated;

    @Schema(description = "日期快捷基准日")
    private String asOfDate;

    @Schema(description = "对比窗口")
    private List<ContrastInfo> contrasts;

    @Schema(description = "实际执行的 SQL")
    private List<ExecSqlInfo> execSqls;
}

package com.codet.lens.vis.dto.pivot;

import com.codet.lens.vis.dto.query.ExecSqlInfo;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "透视表查询响应")
@Getter
@Setter
public class PivotQueryResponse {

    @Schema(description = "行维字段", requiredMode = Schema.RequiredMode.REQUIRED)
    private List<String> rowFields;

    @Schema(description = "列维字段", requiredMode = Schema.RequiredMode.REQUIRED)
    private List<String> columnFields;

    @Schema(description = "指标别名", requiredMode = Schema.RequiredMode.REQUIRED)
    private List<String> metrics;

    @Schema(description = "列头", requiredMode = Schema.RequiredMode.REQUIRED)
    private List<PivotColumn> columns;

    @Schema(description = "数据行", requiredMode = Schema.RequiredMode.REQUIRED)
    private List<PivotRow> rows;

    @Schema(description = "行数", requiredMode = Schema.RequiredMode.REQUIRED)
    private Integer total;

    @Schema(description = "明细行是否截断", requiredMode = Schema.RequiredMode.REQUIRED)
    private Boolean truncated;

    @Schema(description = "列头是否截断", requiredMode = Schema.RequiredMode.REQUIRED)
    private Boolean columnTruncated;

    @Schema(description = "实际执行的 SQL")
    private List<ExecSqlInfo> execSqls;
}

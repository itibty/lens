package com.codet.lens.vis.rds.dto.conf;

import com.codet.lens.common.EnumValue;
import com.codet.lens.common.PageRequest;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "sql脚本查询请求体")
@Getter
@Setter
public class QueryConfSqlRequest extends PageRequest {

    @Schema(description = "数据id")
    private Long id;

    @Schema(description = "名称")
    private String sqlName;

    @Schema(description = "备注")
    private String sqlDesc;

    @Schema(description = "数据源id")
    private Long dsId;

    @Schema(description = "状态", allowableValues = {"EBL", "DBL"})
    @EnumValue(strValues = {"EBL", "DBL"})
    private String status;

}

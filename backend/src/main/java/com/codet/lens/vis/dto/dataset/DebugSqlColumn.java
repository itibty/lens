package com.codet.lens.vis.dto.dataset;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.experimental.Accessors;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Accessors(chain = true)
public class DebugSqlColumn {
    private String field;
    private String jdbcType;
    private String dataType;
    private String suggestRole;
    private String remark;
}

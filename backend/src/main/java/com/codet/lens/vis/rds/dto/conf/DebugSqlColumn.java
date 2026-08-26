package com.codet.lens.vis.rds.dto.conf;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.Accessors;

@Getter
@Setter
@Accessors(chain = true)
public class DebugSqlColumn {
    private String field;
    private String jdbcType;
    private String dataType;
    private String suggestRole;
}

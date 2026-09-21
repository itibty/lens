package com.codet.lens.vis.dto.datasource;

import com.codet.lens.vis.dto.ResourceAuditInfo;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.Accessors;

@Getter
@Setter
@Accessors(chain = true)
public class DatasourceInfo extends ResourceAuditInfo {
    private Long id;
    private String sourceName;
    private String dbType;
    private String jdbcUrl;
    private String username;
    private String status;
    private boolean passwordSet;
    private int datasetCount;
}

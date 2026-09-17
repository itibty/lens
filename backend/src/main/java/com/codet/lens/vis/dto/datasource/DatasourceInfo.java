package com.codet.lens.vis.dto.datasource;

import lombok.Getter;
import lombok.Setter;
import lombok.experimental.Accessors;

@Getter
@Setter
@Accessors(chain = true)
public class DatasourceInfo {
    private Long id;
    private String sourceName;
    private String dbType;
    private String jdbcUrl;
    private String username;
    private String status;
    private boolean passwordSet;
    private int datasetCount;
}

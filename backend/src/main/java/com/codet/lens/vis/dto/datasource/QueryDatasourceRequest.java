package com.codet.lens.vis.dto.datasource;

import com.codet.lens.common.base.EnumValue;
import com.codet.lens.common.base.PageRequest;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class QueryDatasourceRequest extends PageRequest {
    @Size(max = 50)
    private String keyword;
    @EnumValue(strValues = {"MYSQL", "POSTGRES", "STARROCKS"})
    private String dbType;
    @EnumValue(strValues = {"EBL", "DBL"})
    private String status;
}

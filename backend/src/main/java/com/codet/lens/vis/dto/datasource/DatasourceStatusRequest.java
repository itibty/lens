package com.codet.lens.vis.dto.datasource;

import com.codet.lens.common.base.EnumValue;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DatasourceStatusRequest {
    @NotNull
    private Long id;
    @NotNull @EnumValue(strValues = {"EBL", "DBL"})
    private String status;
    private boolean confirmImpact;
}

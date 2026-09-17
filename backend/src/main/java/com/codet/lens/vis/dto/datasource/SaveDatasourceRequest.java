package com.codet.lens.vis.dto.datasource;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SaveDatasourceRequest extends DatasourceConnectionRequest {
    @NotBlank @Size(max = 50)
    private String sourceName;
    private boolean confirmImpact;
}

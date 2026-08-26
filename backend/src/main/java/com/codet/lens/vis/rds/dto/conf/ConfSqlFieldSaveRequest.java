package com.codet.lens.vis.rds.dto.conf;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class ConfSqlFieldSaveRequest {
    @NotNull
    private Long sqlId;
    private List<ConfSqlFieldInfo> fields;
}

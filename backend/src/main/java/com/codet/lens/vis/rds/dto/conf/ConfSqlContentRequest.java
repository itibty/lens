package com.codet.lens.vis.rds.dto.conf;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class ConfSqlContentRequest {
    @NotNull
    private Long id;
    @NotBlank
    private String sqlContent;
    private String sqlParams;
    @NotNull
    private List<@Valid ConfSqlFieldInfo> fields;
}

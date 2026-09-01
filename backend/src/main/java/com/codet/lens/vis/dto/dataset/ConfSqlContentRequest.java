package com.codet.lens.vis.dto.dataset;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.Valid;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

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

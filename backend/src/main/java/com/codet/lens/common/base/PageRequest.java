package com.codet.lens.common.base;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.Valid;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PageRequest {

    @Schema(description = "分页")
    @Valid
    @NotNull
    public PageCondition page;
}

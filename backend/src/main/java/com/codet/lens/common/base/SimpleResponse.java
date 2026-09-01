package com.codet.lens.common.base;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class SimpleResponse<T> {
    @Schema(description = "数据", requiredMode = Schema.RequiredMode.REQUIRED)
    T info;
}

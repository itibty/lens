package com.codet.lens.common.base;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class ListResponse<T> {
    @Schema(description = "列表", requiredMode = Schema.RequiredMode.REQUIRED)
    List<T> list;
}

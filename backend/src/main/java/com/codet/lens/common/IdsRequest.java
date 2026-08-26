package com.codet.lens.common;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class IdsRequest {
    @Schema(description = "id集合")
    @NotEmpty(message = "id集合不能为空")
    List<Long> ids;
}

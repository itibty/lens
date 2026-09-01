package com.codet.lens.common.base;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class IdsRequest {
    @Schema(description = "id集合")
    @NotEmpty(message = "id集合不能为空")
    List<Long> ids;
}

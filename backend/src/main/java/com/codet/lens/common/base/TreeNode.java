package com.codet.lens.common.base;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public abstract class TreeNode<T> {
    @Schema(description = "id", requiredMode = Schema.RequiredMode.REQUIRED)
    public Long id;
    @Schema(description = "parent id", requiredMode = Schema.RequiredMode.REQUIRED)
    public Long pid;
    @Schema(description = "子节点", requiredMode = Schema.RequiredMode.REQUIRED)
    public List<T> children;
}

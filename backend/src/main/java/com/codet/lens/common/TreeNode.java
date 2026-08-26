package com.codet.lens.common;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public abstract class TreeNode<T> {
    @Schema(description = "id")
    public Long id;
    @Schema(description = "parent id")
    public Long pid;
    @Schema(description = "子节点")
    public List<T> children;
}

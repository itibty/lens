package com.codet.lens.common;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;

@Schema(description = "分页条件")
public class PageCondition {

    @Schema(description = "当前页", example = "1", requiredMode = Schema.RequiredMode.REQUIRED, type = "integer", format = "int32")
    @Min(1)
    public Long pageNumber = 1L;

    @Schema(description = "每页大小", example = "30", requiredMode = Schema.RequiredMode.REQUIRED, type = "integer", format = "int32")
    @Min(0)
    public Long pageSize = 30L;

    public <T> IPage<T> toIPage() {
        return new Page<>(this.pageNumber, this.pageSize);
    }
}
